import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const currenciesRouter = Router();

currenciesRouter.use(requireAuth);

// GET /api/currencies
currenciesRouter.get("/", async (_req, res) => {
  const result = await pool.query(
    "SELECT code, name, symbol, rate_to_base FROM currencies ORDER BY code"
  );
  res.json({ currencies: result.rows });
});
