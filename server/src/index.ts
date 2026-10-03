import "dotenv/config";
import "express-async-errors";
import express from "express";
import cors from "cors";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db/pool.js";
import { authRouter } from "./routes/auth.js";
import { transactionsRouter } from "./routes/transactions.js";
import { currenciesRouter } from "./routes/currencies.js";
import { budgetsRouter } from "./routes/budgets.js";
import { analyticsRouter } from "./routes/analytics.js";
import { backupRouter } from "./routes/backup.js";

const app = express();
const PgSession = connectPgSimple(session);

const isProd = process.env.NODE_ENV === "production";

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json({ limit: "5mb" })); // CSV import + backup restore payloads can exceed the 100kb default

app.use(
  session({
    store: new PgSession({ pool, tableName: "session" }),
    name: "connect.sid",
    secret: process.env.SESSION_SECRET ?? "dev-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProd, // requires HTTPS in production
      sameSite: isProd ? "none" : "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    },
  })
);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);
app.use("/api/transactions", transactionsRouter);
app.use("/api/currencies", currenciesRouter);
app.use("/api/budgets", budgetsRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/backup", backupRouter);

// Central error handler
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server." });
});

const PORT = process.env.PORT ?? 4000;
app.listen(PORT, () => {
  console.log(`ExpenseMate API listening on http://localhost:${PORT}`);
});
