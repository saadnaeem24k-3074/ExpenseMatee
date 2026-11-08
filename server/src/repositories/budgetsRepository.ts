import type { Pool } from "pg";
import { pool as defaultPool } from "../db/pool.js";
import type {
  Budget,
  BudgetWithSpendingRaw,
  UpsertBudgetData,
} from "../types/budget.js";

export interface IBudgetsRepository {
  findByMonthAndYear(userId: string, month: number, year: number): Promise<BudgetWithSpendingRaw[]>;
  upsert(data: UpsertBudgetData): Promise<Budget>;
  deleteById(id: string, userId: string): Promise<boolean>;
  findById(id: string, userId: string): Promise<Budget | null>;
}

export class BudgetsRepository implements IBudgetsRepository {
  constructor(private readonly pool: Pool = defaultPool) {}

  async findByMonthAndYear(
    userId: string,
    month: number,
    year: number
  ): Promise<BudgetWithSpendingRaw[]> {
    const result = await this.pool.query<BudgetWithSpendingRaw>(
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
      [userId, month, year]
    );
    return result.rows;
  }

  async upsert(data: UpsertBudgetData): Promise<Budget> {
    const result = await this.pool.query<Budget>(
      `INSERT INTO budgets (user_id, category, month, year, amount, currency)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, category, month, year)
       DO UPDATE SET amount = EXCLUDED.amount, currency = EXCLUDED.currency, updated_at = now()
       RETURNING id, category, month, year, amount, currency`,
      [data.userId, data.category, data.month, data.year, data.amount, data.currency]
    );
    return result.rows[0];
  }

  async deleteById(id: string, userId: string): Promise<boolean> {
    const result = await this.pool.query(
      `DELETE FROM budgets WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, userId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async findById(id: string, userId: string): Promise<Budget | null> {
    const result = await this.pool.query<Budget>(
      `SELECT id, category, month, year, amount, currency
       FROM budgets WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return result.rows[0] ?? null;
  }
}
