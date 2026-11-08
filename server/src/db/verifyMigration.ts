/**
 * Data-safety proof for the versioned migration system.
 *
 * It creates a throwaway PostgreSQL database, reproduces the Assignment 01
 * schema, seeds users/transactions/budgets, snapshots row counts + totals +
 * checksums, runs the real migration runner, snapshots again and compares.
 * The scratch database is dropped afterwards, so your real data is never
 * touched.
 *
 * Run:  npm run verify:migration   (from the server/ folder)
 * Note: the configured PostgreSQL user needs the CREATEDB privilege.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { config } from "../config.js";
import { runMigrations } from "./migrate.js";

const { Client, Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface TableSnapshot {
  count: number;
  total: string;
  checksum: string;
}

type Snapshot = Record<"users" | "transactions" | "budgets", TableSnapshot>;

const quoteIdentifier = (value: string) => `"${value.replace(/"/g, '""')}"`;

function withDatabase(connectionString: string, database: string): string {
  const url = new URL(connectionString);
  url.pathname = `/${database}`;
  return url.toString();
}

async function takeSnapshot(db: pg.Pool): Promise<Snapshot> {
  const users = await db.query(
    `SELECT count(*)::int AS count,
            coalesce(sum(length(password_hash)), 0)::text AS total,
            coalesce(md5(string_agg(u::text, '||' ORDER BY u.id)), md5('')) AS checksum
     FROM users u`
  );
  const transactions = await db.query(
    `SELECT count(*)::int AS count,
            coalesce(sum(amount), 0)::text AS total,
            coalesce(md5(string_agg(t::text, '||' ORDER BY t.id)), md5('')) AS checksum
     FROM transactions t`
  );
  const budgets = await db.query(
    `SELECT count(*)::int AS count,
            coalesce(sum(amount), 0)::text AS total,
            coalesce(md5(string_agg(b::text, '||' ORDER BY b.id)), md5('')) AS checksum
     FROM budgets b`
  );

  return {
    users: users.rows[0] as TableSnapshot,
    transactions: transactions.rows[0] as TableSnapshot,
    budgets: budgets.rows[0] as TableSnapshot,
  };
}

async function seedSampleData(db: pg.Pool): Promise<number> {
  const passwordHash = "$2a$12$C6UzMDM.H6dfI/f/IKcEe.7Vb5W6KpQ0o7uA1vVwYj2Z8gVJ6PqQe";
  const marker = Date.now();

  const alice = await db.query<{ id: string }>(
    "INSERT INTO users (name, email, password_hash, base_currency) VALUES ($1, $2, $3, $4) RETURNING id",
    ["Alice Verify", `verify.alice+${marker}@example.com`, passwordHash, "PKR"]
  );
  const bob = await db.query<{ id: string }>(
    "INSERT INTO users (name, email, password_hash, base_currency) VALUES ($1, $2, $3, $4) RETURNING id",
    ["Bob Verify", `verify.bob+${marker}@example.com`, passwordHash, "USD"]
  );

  const aliceId = alice.rows[0].id;
  const bobId = bob.rows[0].id;

  const transactions: Array<[string, string, string, string, string, string, string]> = [
    [aliceId, "5000.00", "January salary", "salary", "2024-01-01", "Income", "PKR"],
    [aliceId, "1250.50", "Groceries", "shopping", "2024-01-05", "Expense", "PKR"],
    [bobId, "300.00", "Bus pass", "utilities", "2024-01-07", "Expense", "USD"],
  ];

  for (const row of transactions) {
    await db.query(
      `INSERT INTO transactions (user_id, amount, description, category, date, type, currency)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      row
    );
  }

  const budgets: Array<[string, string, number, number, string, string]> = [
    [aliceId, "shopping", 1, 2024, "2000.00", "PKR"],
    [bobId, "utilities", 1, 2024, "500.00", "USD"],
  ];

  for (const row of budgets) {
    await db.query(
      `INSERT INTO budgets (user_id, category, month, year, amount, currency)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      row
    );
  }

  return 2 + transactions.length + budgets.length;
}

async function main(): Promise<void> {
  const scratchDb = `expensemate_verify_${Date.now()}`;
  const admin = new Client({ connectionString: withDatabase(config.databaseUrl, "postgres") });
  await admin.connect();

  let verifyPool: pg.Pool | undefined;

  try {
    await admin.query(`CREATE DATABASE ${quoteIdentifier(scratchDb)}`);
    console.log(`Created scratch database: ${scratchDb}`);

    const scratchUrl = withDatabase(config.databaseUrl, scratchDb);

    // Reproduce the pre-migration state: Assignment 01 schema, no tracking table.
    const baseline = new Client({ connectionString: scratchUrl });
    await baseline.connect();
    const baselineSql = readFileSync(
      path.join(__dirname, "migrations", "001_initial_schema.sql"),
      "utf-8"
    );
    await baseline.query(baselineSql);
    await baseline.end();
    console.log("Reproduced Assignment 01 baseline schema (before any migration was tracked).");

    verifyPool = new Pool({ connectionString: scratchUrl });
    const seededRows = await seedSampleData(verifyPool);
    console.log(`Seeded ${seededRows} sample rows (2 users, 3 transactions, 2 budgets).`);

    const before = await takeSnapshot(verifyPool);
    console.log("BEFORE:", JSON.stringify(before, null, 2));

    const result = await runMigrations(verifyPool);
    console.log(`Runner applied: ${result.applied.join(", ") || "(none)"}`);
    console.log(`Runner skipped: ${result.skipped.join(", ") || "(none)"}`);

    const after = await takeSnapshot(verifyPool);
    console.log("AFTER :", JSON.stringify(after, null, 2));

    if (JSON.stringify(before) !== JSON.stringify(after)) {
      throw new Error("Data verification FAILED: row counts, totals or checksums changed.");
    }
    console.log("VERIFIED: row counts, totals and checksums are identical before and after.");

    const registry = await verifyPool.query<{ id: string }>(
      "SELECT id FROM schema_migrations ORDER BY id"
    );
    console.log(`schema_migrations: ${registry.rows.map((row) => row.id).join(", ")}`);

    const constraint = await verifyPool.query(
      "SELECT conname FROM pg_constraint WHERE conname = 'transactions_amount_positive'"
    );
    console.log(`transactions_amount_positive present: ${constraint.rowCount === 1}`);
  } finally {
    if (verifyPool) {
      await verifyPool.end();
    }
    await admin
      .query(`DROP DATABASE IF EXISTS ${quoteIdentifier(scratchDb)} WITH (FORCE)`)
      .catch((error) => console.error("Could not drop scratch database:", error));
    await admin.end();
    console.log(`Dropped scratch database: ${scratchDb}`);
  }
}

main().catch((error) => {
  console.error("Verification FAILED:", error);
  process.exitCode = 1;
});
