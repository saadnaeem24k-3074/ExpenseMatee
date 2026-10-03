import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const analyticsRouter = Router();

analyticsRouter.use(requireAuth);

// GET /api/analytics/category-breakdown?month=9&year=2026
// Sum of amount per category (+ its type) for the given month, converted
// into the user's base currency so categories with mixed transaction
// currencies still add up correctly.
analyticsRouter.get("/category-breakdown", async (req, res) => {
  const now = new Date();
  const month = Number(req.query.month) || now.getMonth() + 1;
  const year = Number(req.query.year) || now.getFullYear();

  const result = await pool.query(
    `SELECT
       t.category, t.type,
       SUM(ROUND(t.amount * COALESCE(tc.rate_to_base, 1) / COALESCE(uc.rate_to_base, 1), 2)) AS total
     FROM transactions t
     JOIN users u ON u.id = t.user_id
     LEFT JOIN currencies tc ON tc.code = t.currency
     LEFT JOIN currencies uc ON uc.code = u.base_currency
     WHERE t.user_id = $1
       AND EXTRACT(MONTH FROM t.date) = $2
       AND EXTRACT(YEAR FROM t.date) = $3
     GROUP BY t.category, t.type
     ORDER BY total DESC`,
    [req.session.userId, month, year]
  );

  const categories = result.rows.map((r) => ({
    category: r.category,
    type: r.type,
    total: Number(r.total),
  }));

  res.json({ month, year, categories });
});

// GET /api/analytics/trend?months=6
// Income vs expense totals (converted to the user's base currency) for
// each of the last N months (oldest first), with months that had zero
// activity filled in as 0 rather than omitted.
analyticsRouter.get("/trend", async (req, res) => {
  const months = Math.min(Math.max(Number(req.query.months) || 6, 1), 24);

  const result = await pool.query(
    `WITH months AS (
       SELECT date_trunc('month', now()) - (n || ' months')::interval AS month_start
       FROM generate_series(0, $2::int - 1) AS n
     ),
     user_rate AS (
       SELECT COALESCE(uc.rate_to_base, 1) AS rate
       FROM users u
       LEFT JOIN currencies uc ON uc.code = u.base_currency
       WHERE u.id = $1
     )
     SELECT
       to_char(m.month_start, 'YYYY-MM') AS month,
       COALESCE(SUM(
         ROUND(t.amount * COALESCE(tc.rate_to_base, 1) / (SELECT rate FROM user_rate), 2)
       ) FILTER (WHERE t.type = 'Income'), 0) AS income,
       COALESCE(SUM(
         ROUND(t.amount * COALESCE(tc.rate_to_base, 1) / (SELECT rate FROM user_rate), 2)
       ) FILTER (WHERE t.type = 'Expense'), 0) AS expense
     FROM months m
     LEFT JOIN transactions t
       ON t.user_id = $1
       AND date_trunc('month', t.date) = m.month_start
     LEFT JOIN currencies tc ON tc.code = t.currency
     GROUP BY m.month_start
     ORDER BY m.month_start`,
    [req.session.userId, months]
  );

  const trend = result.rows.map((r) => ({
    month: r.month,
    income: Number(r.income),
    expense: Number(r.expense),
  }));

  res.json({ trend });
});
