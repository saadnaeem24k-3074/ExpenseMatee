import { Router } from "express";
import bcrypt from "bcryptjs";
import { pool } from "../db/pool.js";

export const authRouter = Router();

// POST /api/auth/signup
authRouter.post("/signup", async (req, res) => {
  const { name, email, password } = req.body ?? {};

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email, and password are required." });
  }
  if (typeof password !== "string" || password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters." });
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  const existing = await pool.query("SELECT id FROM users WHERE email = $1", [normalizedEmail]);
  if (existing.rows.length > 0) {
    return res.status(409).json({ error: "An account with that email already exists." });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const baseCurrency = typeof req.body?.base_currency === "string" ? req.body.base_currency : "PKR";

  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash, base_currency) VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, base_currency, created_at`,
    [name, normalizedEmail, passwordHash, baseCurrency]
  );

  const user = result.rows[0];
  req.session.userId = user.id;

  res.status(201).json({ user });
});

// POST /api/auth/login
authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const result = await pool.query(
    "SELECT id, name, email, password_hash, base_currency FROM users WHERE email = $1",
    [normalizedEmail]
  );
  const user = result.rows[0];

  if (!user) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  req.session.userId = user.id;

  res.json({
    user: { id: user.id, name: user.name, email: user.email, base_currency: user.base_currency },
  });
});

// PUT /api/auth/me — update the logged-in user's base currency
authRouter.put("/me", async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  const { base_currency } = req.body ?? {};
  if (!base_currency || typeof base_currency !== "string") {
    return res.status(400).json({ error: "base_currency is required." });
  }

  const result = await pool.query(
    `UPDATE users SET base_currency = $1 WHERE id = $2
     RETURNING id, name, email, base_currency`,
    [base_currency, req.session.userId]
  );

  res.json({ user: result.rows[0] });
});

// POST /api/auth/logout
authRouter.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Failed to log out." });
    }
    res.clearCookie("connect.sid");
    res.status(204).send();
  });
});

// GET /api/auth/me
authRouter.get("/me", async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  const result = await pool.query("SELECT id, name, email, base_currency FROM users WHERE id = $1", [
    req.session.userId,
  ]);
  const user = result.rows[0];
  if (!user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  res.json({ user });
});
