import type { Pool } from "pg";
import { pool as defaultPool } from "../db/pool.js";
import type { NewUser, PublicUser, UserRecord } from "../types/user.js";

export interface IAuthRepository {
  findByEmail(email: string): Promise<UserRecord | null>;
  findPublicById(userId: string): Promise<PublicUser | null>;
  create(data: NewUser): Promise<PublicUser>;
  updateBaseCurrency(userId: string, baseCurrency: string): Promise<PublicUser | null>;
}

export class AuthRepository implements IAuthRepository {
  constructor(private readonly pool: Pool = defaultPool) {}

  async findByEmail(email: string): Promise<UserRecord | null> {
    const result = await this.pool.query<UserRecord>(
      `SELECT id, name, email, password_hash, base_currency, created_at
       FROM users
       WHERE email = $1`,
      [email]
    );
    return result.rows[0] ?? null;
  }

  async findPublicById(userId: string): Promise<PublicUser | null> {
    const result = await this.pool.query<PublicUser>(
      `SELECT id, name, email, base_currency FROM users WHERE id = $1`,
      [userId]
    );
    return result.rows[0] ?? null;
  }

  async create(data: NewUser): Promise<PublicUser> {
    const result = await this.pool.query<PublicUser>(
      `INSERT INTO users (name, email, password_hash, base_currency)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, base_currency, created_at`,
      [data.name, data.email, data.passwordHash, data.baseCurrency]
    );
    return result.rows[0];
  }

  async updateBaseCurrency(
    userId: string,
    baseCurrency: string
  ): Promise<PublicUser | null> {
    const result = await this.pool.query<PublicUser>(
      `UPDATE users SET base_currency = $1 WHERE id = $2
       RETURNING id, name, email, base_currency`,
      [baseCurrency, userId]
    );
    return result.rows[0] ?? null;
  }
}
