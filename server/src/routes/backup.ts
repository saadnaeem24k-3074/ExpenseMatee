import { Router } from "express";
import type { PoolClient } from "pg";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { isValidBackupTransaction, isValidBackupBudget } from "../utils/backupValidation.js";

export const backupRouter = Router();

backupRouter.use(requireAuth);

// How many cloud snapshots each user keeps. Older ones are pruned automatically.
const MAX_CLOUD_BACKUPS = 10;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Builds a full JSON snapshot of everything the user owns. Shared by the file
// download (/export) and the cloud snapshots (/cloud).
// Dates are formatted in SQL (to_char) so they stay "YYYY-MM-DD" and never get
// shifted a day by a timezone conversion.
async function buildBackup(userId: string) {
  const [userResult, transactionsResult, budgetsResult] = await Promise.all([
    pool.query("SELECT name, email, base_currency FROM users WHERE id = $1", [userId]),
    pool.query(
      `SELECT amount, description, category, to_char(date, 'YYYY-MM-DD') AS date, type, currency
       FROM transactions WHERE user_id = $1 ORDER BY transactions.date`,
      [userId]
    ),
    pool.query(
      `SELECT category, month, year, amount, currency
       FROM budgets WHERE user_id = $1 ORDER BY year, month, category`,
      [userId]
    ),
  ]);

  return {
    version: 1,
    exported_at: new Date().toISOString(),
    profile: userResult.rows[0],
    transactions: transactionsResult.rows,
    budgets: budgetsResult.rows,
  };
}

// GET /api/backup/export
// Downloads the snapshot as a JSON file.
backupRouter.get("/export", async (req, res) => {
  const backup = await buildBackup(req.session.userId!);

  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", `attachment; filename="expensemate-backup.json"`);
  res.send(JSON.stringify(backup, null, 2));
});

// Inserts the valid transactions from a backup and returns how many were restored.
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

function isBackupShape(backup: unknown): backup is { transactions: unknown[]; budgets: unknown[] } {
  const b = backup as { transactions?: unknown; budgets?: unknown } | null;
  return !!b && Array.isArray(b.transactions) && Array.isArray(b.budgets);
}

// Restores a backup in one transaction. Additive: it does not wipe existing
// data first, so restoring on top of newer data just merges the two.
async function restoreBackup(userId: string, backup: { transactions: unknown[]; budgets: unknown[] }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const restoredTransactions = await restoreTransactions(client, userId, backup.transactions);
    const restoredBudgets = await restoreBudgets(client, userId, backup.budgets);
    await client.query("COMMIT");
    return { restoredTransactions, restoredBudgets };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// POST /api/backup/restore
// Body: the JSON produced by /export.
backupRouter.post("/restore", async (req, res) => {
  if (!isBackupShape(req.body)) {
    return res.status(400).json({ error: "That doesn't look like a valid ExpenseMate backup file." });
  }

  res.json(await restoreBackup(req.session.userId!, req.body));
});

// ---------------------------------------------------------------------------
// Cloud backup (Phase 5 adaptive maintenance)
// Snapshots are stored server-side in the cloud_backups table, so a user can
// recover their data without keeping a file on their own device.
// ---------------------------------------------------------------------------

// POST /api/backup/cloud
// Takes a snapshot of the user's data and stores it.
backupRouter.post("/cloud", async (req, res) => {
  const userId = req.session.userId!;
  const backup = await buildBackup(userId);

  const result = await pool.query(
    `INSERT INTO cloud_backups (user_id, data, transaction_count, budget_count)
     VALUES ($1, $2::jsonb, $3, $4)
     RETURNING id, created_at, transaction_count, budget_count`,
    [userId, JSON.stringify(backup), backup.transactions.length, backup.budgets.length]
  );

  // Keep only the newest MAX_CLOUD_BACKUPS snapshots for this user.
  await pool.query(
    `DELETE FROM cloud_backups
     WHERE user_id = $1 AND id NOT IN (
       SELECT id FROM cloud_backups WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2
     )`,
    [userId, MAX_CLOUD_BACKUPS]
  );

  res.status(201).json({ backup: result.rows[0] });
});

// GET /api/backup/cloud
// Lists the user's snapshots, newest first (without the data itself).
backupRouter.get("/cloud", async (req, res) => {
  const result = await pool.query(
    `SELECT id, created_at, transaction_count, budget_count
     FROM cloud_backups WHERE user_id = $1 ORDER BY created_at DESC`,
    [req.session.userId]
  );
  res.json({ backups: result.rows });
});

// POST /api/backup/cloud/:id/restore
backupRouter.post("/cloud/:id/restore", async (req, res) => {
  const { id } = req.params;
  const userId = req.session.userId!;

  const found = UUID_RE.test(id)
    ? await pool.query("SELECT data FROM cloud_backups WHERE id = $1 AND user_id = $2", [id, userId])
    : { rows: [] };

  if (found.rows.length === 0) {
    return res.status(404).json({ error: "Cloud backup not found." });
  }
  if (!isBackupShape(found.rows[0].data)) {
    return res.status(400).json({ error: "That cloud backup is corrupted and can't be restored." });
  }

  res.json(await restoreBackup(userId, found.rows[0].data));
});

// DELETE /api/backup/cloud/:id
backupRouter.delete("/cloud/:id", async (req, res) => {
  const { id } = req.params;

  const result = UUID_RE.test(id)
    ? await pool.query("DELETE FROM cloud_backups WHERE id = $1 AND user_id = $2 RETURNING id", [id, req.session.userId])
    : { rows: [] };

  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Cloud backup not found." });
  }

  res.status(204).send();
});
