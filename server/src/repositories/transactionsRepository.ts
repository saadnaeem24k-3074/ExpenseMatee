import type { Pool } from "pg";
import { pool as defaultPool } from "../db/pool.js";
import type {
  Transaction,
  TransactionExportRow,
  CreateTransactionData,
  ValidImportRow,
} from "../types/transaction.js";

export interface ITransactionsRepository {
  findAllByUser(userId: string): Promise<Transaction[]>;
  findExportByUser(userId: string): Promise<TransactionExportRow[]>;
  findById(id: string, userId: string): Promise<Transaction | null>;
  insert(data: CreateTransactionData): Promise<Transaction>;
  update(id: string, userId: string, data: Omit<CreateTransactionData, "userId">): Promise<Transaction | null>;
  deleteById(id: string, userId: string): Promise<boolean>;
  bulkInsert(userId: string, rows: ValidImportRow[]): Promise<number>;
  findByUserAndDateRange(userId: string, startDate: string, endDate: string): Promise<Transaction[]>;
}

export class TransactionsRepository implements ITransactionsRepository {
  constructor(private readonly pool: Pool = defaultPool) {}

  async findAllByUser(userId: string): Promise<Transaction[]> {
    const result = await this.pool.query<Transaction>(
      `SELECT id, amount, description, category, date, type, currency, created_at
       FROM transactions
       WHERE user_id = $1
       ORDER BY date DESC, created_at DESC`,
      [userId]
    );
    return result.rows;
  }

  async findExportByUser(userId: string): Promise<TransactionExportRow[]> {
    const result = await this.pool.query<TransactionExportRow>(
      `SELECT amount, description, category, date, type, currency
       FROM transactions
       WHERE user_id = $1
       ORDER BY date DESC`,
      [userId]
    );
    return result.rows;
  }

  async findById(id: string, userId: string): Promise<Transaction | null> {
    const result = await this.pool.query<Transaction>(
      `SELECT id, amount, description, category, date, type, currency, created_at
       FROM transactions
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return result.rows[0] ?? null;
  }

  async insert(data: CreateTransactionData): Promise<Transaction> {
    const result = await this.pool.query<Transaction>(
      `INSERT INTO transactions (user_id, amount, description, category, date, type, currency)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, amount, description, category, date, type, currency, created_at`,
      [data.userId, data.amount, data.description, data.category, data.date, data.type, data.currency]
    );
    return result.rows[0];
  }

  async update(
    id: string,
    userId: string,
    data: Omit<CreateTransactionData, "userId">
  ): Promise<Transaction | null> {
    const result = await this.pool.query<Transaction>(
      `UPDATE transactions
       SET amount = $1, description = $2, category = $3, date = $4, type = $5, currency = $6
       WHERE id = $7 AND user_id = $8
       RETURNING id, amount, description, category, date, type, currency, created_at`,
      [data.amount, data.description, data.category, data.date, data.type, data.currency, id, userId]
    );
    return result.rows[0] ?? null;
  }

  async deleteById(id: string, userId: string): Promise<boolean> {
    const result = await this.pool.query(
      `DELETE FROM transactions WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, userId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async bulkInsert(userId: string, rows: ValidImportRow[]): Promise<number> {
    if (rows.length === 0) return 0;

    const client = await this.pool.connect();
    let imported = 0;
    try {
      await client.query("BEGIN");
      for (const t of rows) {
        await client.query(
          `INSERT INTO transactions (user_id, amount, description, category, date, type, currency)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [userId, t.amount, t.description, t.category, t.date, t.type, t.currency]
        );
        imported++;
      }
      await client.query("COMMIT");
      return imported;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async findByUserAndDateRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<Transaction[]> {
    const result = await this.pool.query<Transaction>(
      `SELECT id, amount, description, category, date, type, currency, created_at
       FROM transactions
       WHERE user_id = $1 AND date >= $2 AND date <= $3
       ORDER BY date DESC, created_at DESC`,
      [userId, startDate, endDate]
    );
    return result.rows;
  }
}
