import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { toCsv, parseCsv } from "../utils/csv.js";

export const transactionsRouter = Router();

transactionsRouter.use(requireAuth);

// GET /api/transactions
transactionsRouter.get("/", async (req, res) => {
  const result = await pool.query(
    `SELECT id, amount, description, category, date, type, currency, created_at
     FROM transactions WHERE user_id = $1 ORDER BY date DESC, created_at DESC`,
    [req.session.userId]
  );
  res.json({ transactions: result.rows });
});

// GET /api/transactions/export — download all of the user's transactions as CSV
transactionsRouter.get("/export", async (req, res) => {
  const result = await pool.query(
    `SELECT amount, description, category, date, type, currency
     FROM transactions WHERE user_id = $1 ORDER BY date DESC`,
    [req.session.userId]
  );

  const headers = ["amount", "description", "category", "date", "type", "currency"];
  const rows = result.rows.map((t) => [
    Number(t.amount),
    t.description ?? "",
    t.category,
    // dates come back as JS Date objects from pg; normalize to YYYY-MM-DD
    new Date(t.date).toISOString().slice(0, 10),
    t.type,
    t.currency,
  ]);

  const csv = toCsv(headers, rows);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="expensemate-transactions.csv"`);
  res.send(csv);
});

// POST /api/transactions/import — bulk-create transactions from a CSV file.
// Body: { csv: string }. Expected columns: amount, description, category, date, type, currency.
// Invalid rows are skipped and reported back rather than failing the whole import.
transactionsRouter.post("/import", async (req, res) => {
  const { csv } = req.body ?? {};
  if (typeof csv !== "string" || csv.trim() === "") {
    return res.status(400).json({ error: "csv text is required." });
  }

  const rows = parseCsv(csv);
  if (rows.length === 0) {
    return res.status(400).json({ error: "No data rows found in the CSV." });
  }

  const errors: { row: number; message: string }[] = [];
  const valid: { amount: number; description: string; category: string; date: string; type: string; currency: string }[] = [];

  rows.forEach((r, idx) => {
    const rowNum = idx + 2; // +1 for header row, +1 for 1-based indexing
    const amount = Number(r.amount);
    const category = r.category;
    const date = r.date;
    const type = r.type;
    const currency = r.currency || "PKR";

    if (!r.amount || Number.isNaN(amount) || amount < 0) {
      errors.push({ row: rowNum, message: "amount must be a positive number." });
      return;
    }
    if (!category) {
      errors.push({ row: rowNum, message: "category is required." });
      return;
    }
    if (!date || Number.isNaN(new Date(date).getTime())) {
      errors.push({ row: rowNum, message: "date is missing or invalid (use YYYY-MM-DD)." });
      return;
    }
    if (type !== "Income" && type !== "Expense") {
      errors.push({ row: rowNum, message: "type must be 'Income' or 'Expense'." });
      return;
    }

    valid.push({ amount, description: r.description ?? "", category, date, type, currency });
  });

  let imported = 0;
  if (valid.length > 0) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (const t of valid) {
        await client.query(
          `INSERT INTO transactions (user_id, amount, description, category, date, type, currency)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [req.session.userId, t.amount, t.description, t.category, t.date, t.type, t.currency]
        );
        imported++;
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  res.json({ imported, errors, totalRows: rows.length });
});

// POST /api/transactions
transactionsRouter.post("/", async (req, res) => {
  const { amount, description, category, date, type, currency } = req.body ?? {};

  if (amount == null || !category || !date || !type) {
    return res.status(400).json({ error: "amount, category, date, and type are required." });
  }
  if (!["Income", "Expense"].includes(type)) {
    return res.status(400).json({ error: "type must be 'Income' or 'Expense'." });
  }

  const result = await pool.query(
    `INSERT INTO transactions (user_id, amount, description, category, date, type, currency)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, amount, description, category, date, type, currency, created_at`,
    [req.session.userId, amount, description ?? "", category, date, type, currency ?? "PKR"]
  );

  res.status(201).json({ transaction: result.rows[0] });
});

// PUT /api/transactions/:id
transactionsRouter.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { amount, description, category, date, type, currency } = req.body ?? {};

  if (amount == null || !category || !date || !type) {
    return res.status(400).json({ error: "amount, category, date, and type are required." });
  }

  const result = await pool.query(
    `UPDATE transactions
     SET amount = $1, description = $2, category = $3, date = $4, type = $5, currency = $6
     WHERE id = $7 AND user_id = $8
     RETURNING id, amount, description, category, date, type, currency, created_at`,
    [amount, description ?? "", category, date, type, currency ?? "PKR", id, req.session.userId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Transaction not found." });
  }

  res.json({ transaction: result.rows[0] });
});

// DELETE /api/transactions/:id
transactionsRouter.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const result = await pool.query(
    "DELETE FROM transactions WHERE id = $1 AND user_id = $2 RETURNING id",
    [id, req.session.userId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Transaction not found." });
  }

  res.status(204).send();
});
