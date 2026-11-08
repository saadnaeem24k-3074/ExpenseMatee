import "express-async-errors";
import express from "express";
import cors from "cors";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import type { CorsOptions } from "cors";
import { config } from "./config.js";
import { isAllowedCorsOrigin } from "./corsOrigins.js";
import { pool } from "./db/pool.js";
import { authRouter } from "./routes/auth.js";
import { transactionsRouter } from "./routes/transactions.js";
import { currenciesRouter } from "./routes/currencies.js";
import { budgetsRouter } from "./routes/budgets.js";
import { analyticsRouter } from "./routes/analytics.js";
import { backupRouter } from "./routes/backup.js";

const app = express();
const PgSession = connectPgSimple(session);

const isProd = config.isProduction;

if (isProd) {
  app.set("trust proxy", 1);
}

// Echoes the browser's Origin when it is allowed (configured list, or any
// loop-back origin while running outside production, e.g. Vite dev (:5173)
// and preview (:4173) builds). Otherwise no ACA header is emitted and the
// browser rejects the response.
const corsOptions: CorsOptions = {
  origin: (origin, callback) =>
    callback(
      null,
      isAllowedCorsOrigin(origin, config.clientOrigins, !isProd)
    ),
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "5mb" })); // CSV import + backup restore payloads can exceed the 100kb default

app.use(
  session({
    store: new PgSession({ pool, tableName: "session" }),
    name: "connect.sid",
    secret: config.sessionSecret,
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

export default app;
