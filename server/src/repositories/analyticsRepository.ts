import type { Pool } from "pg";
import { pool as defaultPool } from "../db/pool.js";
import type {
  CategoryBreakdownRow,
  MonthlyTrendRow,
} from "../types/analytics.js";

export interface IAnalyticsRepository {
  getCategoryBreakdown(
    userId: string,
    month: number,
    year: number
  ): Promise<CategoryBreakdownRow[]>;
  getMonthlyTrend(
    userId: string,
    months: number
  ): Promise<MonthlyTrendRow[]>;
}

export class AnalyticsRepository implements IAnalyticsRepository {
  constructor(private readonly pool: Pool = defaultPool) {}

  async getCategoryBreakdown(
    userId: string,
    month: number,
    year: number
  ): Promise<CategoryBreakdownRow[]> {
    const result = await this.pool.query<{ category: string; type: string; total: string | number }>(
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
      [userId, month, year]
    );

    return result.rows.map((r) => ({
      category: r.category,
      type: r.type,
      total: Number(r.total),
    }));
  }

  async getMonthlyTrend(
    userId: string,
    months: number
  ): Promise<MonthlyTrendRow[]> {
    const result = await this.pool.query<{ month: string; income: string | number; expense: string | number }>(
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
      [userId, months]
    );

    return result.rows.map((r) => ({
      month: r.month,
      income: Number(r.income),
      expense: Number(r.expense),
    }));
  }
}
