import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { computeBudgetStatus } from "../utils/budgetStatus.js";

export const budgetsRouter = Router();

budgetsRouter.use(requireAuth);

// GET /api/budgets?month=9&year=2026
// Returns each budget for the given period along with how much has
// actually been spent in that category, so the frontend can show
// progress bars / alerts without a second round-trip.
budgetsRouter.get("/", async (req, res) => {
  const now = new Date();
  const month = Number(req.query.month) || now.getMonth() + 1;
  const year = Number(req.query.year) || now.getFullYear();

  const result = await pool.query(
    `SELECT
       b.id, b.category, b.month, b.year, b.amount, b.currency,
       COALESCE(SUM(
         ROUND(t.amount * COALESCE(tc.rate_to_base, 1) / COALESCE(bc.rate_to_base, 1), 2)
       ), 0) AS spent
     FROM budgets b
     LEFT JOIN currencies bc ON bc.code = b.currency
     LEFT JOIN transactions t
       ON t.user_id = b.user_id
       AND t.category = b.category
       AND t.type = 'Expense'
       AND EXTRACT(MONTH FROM t.date) = b.month
       AND EXTRACT(YEAR FROM t.date) = b.year
     LEFT JOIN currencies tc ON tc.code = t.currency
     WHERE b.user_id = $1 AND b.month = $2 AND b.year = $3
     GROUP BY b.id, bc.rate_to_base
     ORDER BY b.category`,
    [req.session.userId, month, year]
  );

  const budgets = result.rows.map((row) => {
    const amount = Number(row.amount);
    const spent = Number(row.spent);
    const { percent, status } = computeBudgetStatus(amount, spent);
    return { ...row, amount, spent, percent, status };
  });

  res.json({ budgets });
});

// POST /api/budgets — create or update the budget for a category/month/year
budgetsRouter.post("/", async (req, res) => {
  const { category, month, year, amount, currency } = req.body ?? {};

  if (!category || !month || !year || amount == null) {
    return res.status(400).json({ error: "category, month, year, and amount are required." });
  }
  if (Number(amount) < 0) {
    return res.status(400).json({ error: "amount must be a positive number." });
  }

  const result = await pool.query(
    `INSERT INTO budgets (user_id, category, month, year, amount, currency)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id, category, month, year)
     DO UPDATE SET amount = EXCLUDED.amount, currency = EXCLUDED.currency, updated_at = now()
     RETURNING id, category, month, year, amount, currency`,
    [req.session.userId, category, month, year, amount, currency ?? "PKR"]
  );

  res.status(201).json({ budget: result.rows[0] });
});

// DELETE /api/budgets/:id
budgetsRouter.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const result = await pool.query(
    "DELETE FROM budgets WHERE id = $1 AND user_id = $2 RETURNING id",
    [id, req.session.userId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Budget not found." });
  }

  res.status(204).send();
});
