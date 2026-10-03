import { Router } from "express";
import type { PoolClient } from "pg";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { isValidBackupTransaction, isValidBackupBudget } from "../utils/backupValidation.js";

export const backupRouter = Router();

backupRouter.use(requireAuth);

// GET /api/backup/export
// Downloads a full JSON snapshot of everything the user owns. This is the
// "cloud backup" building block — the file itself is what you'd hand off to
// any cloud storage provider (S3, Google Drive, etc). Wiring an actual
// upload is just adding an SDK call around this same JSON payload.
backupRouter.get("/export", async (req, res) => {
  const userId = req.session.userId;

  const [userResult, transactionsResult, budgetsResult] = await Promise.all([
    pool.query("SELECT name, email, base_currency FROM users WHERE id = $1", [userId]),
    pool.query(
      `SELECT amount, description, category, date, type, currency
       FROM transactions WHERE user_id = $1 ORDER BY date`,
      [userId]
    ),
    pool.query(
      `SELECT category, month, year, amount, currency
       FROM budgets WHERE user_id = $1 ORDER BY year, month, category`,
      [userId]
    ),
  ]);

  const backup = {
    version: 1,
    exported_at: new Date().toISOString(),
    profile: userResult.rows[0],
    transactions: transactionsResult.rows,
    budgets: budgetsResult.rows,
  };

  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", `attachment; filename="expensemate-backup.json"`);
  res.send(JSON.stringify(backup, null, 2));
});

// Inserts the valid transactions from a backup and returns how many were restored.
// Pulled out of the route handler so the handler itself stays simple (see the
// cyclomatic-complexity report — this used to be the most complex function
// in the codebase at 18).
async function restoreTransactions(client: PoolClient, userId: string, transactions: unknown[]): Promise<number> {
  let restored = 0;
  for (const t of transactions) {
    if (!isValidBackupTransaction(t)) continue;
    await client.query(
      `INSERT INTO transactions (user_id, amount, description, category, date, type, currency)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, t.amount, t.description ?? "", t.category, t.date, t.type, t.currency ?? "PKR"]
    );
    restored++;
  }
  return restored;
}

async function restoreBudgets(client: PoolClient, userId: string, budgets: unknown[]): Promise<number> {
  let restored = 0;
  for (const b of budgets) {
    if (!isValidBackupBudget(b)) continue;
    await client.query(
      `INSERT INTO budgets (user_id, category, month, year, amount, currency)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, category, month, year)
       DO UPDATE SET amount = EXCLUDED.amount, currency = EXCLUDED.currency, updated_at = now()`,
      [userId, b.category, b.month, b.year, b.amount, b.currency ?? "PKR"]
    );
    restored++;
  }
  return restored;
}

// POST /api/backup/restore
// Body: the JSON produced by /export. Restores transactions and budgets
// for the current user. This is additive (it does not wipe existing data
// first) so restoring a backup on top of newer data just merges the two.
backupRouter.post("/restore", async (req, res) => {
  const backup = req.body;
  if (!backup || !Array.isArray(backup.transactions) || !Array.isArray(backup.budgets)) {
    return res.status(400).json({ error: "That doesn't look like a valid ExpenseMate backup file." });
  }

  const userId = req.session.userId!;
  const client = await pool.connect();
  let restoredTransactions = 0;
  let restoredBudgets = 0;

  try {
    await client.query("BEGIN");
    restoredTransactions = await restoreTransactions(client, userId, backup.transactions);
    restoredBudgets = await restoreBudgets(client, userId, backup.budgets);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  res.json({ restoredTransactions, restoredBudgets });
});
