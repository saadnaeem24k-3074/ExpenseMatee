/**
 * ExpenseMate: API integration tests (Phase 4)
 *
 * These tests exercise the real Express app together with the real PostgreSQL
 * database (auth + session store + transactions + budgets + analytics +
 * CSV + backup). They run against a SEPARATE database (expensemate_test),
 * never your development one.
 *
 * Run:  npm run test:integration      (from the server/ folder)
 */
import { beforeAll, afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import dotenv from "dotenv";
import type { Express } from "express";
import type { Pool } from "pg";

// Load .env.test BEFORE the app (and its DB pool) is imported.
dotenv.config({ path: ".env.test", override: true });

const dbUrl = process.env.DATABASE_URL ?? "";
if (!/_test(\?|$)/.test(dbUrl)) {
  throw new Error(
    `Refusing to run: DATABASE_URL must point at a database whose name ends in "_test" (got "${dbUrl}"). ` +
      `Create server/.env.test first. These tests delete data.`
  );
}

let app: Express;
let pool: Pool;

beforeAll(async () => {
  app = (await import("../app.js")).default;
  pool = (await import("../db/pool.js")).pool;
});

afterAll(async () => {
  await pool.end();
});

beforeEach(async () => {
  await pool.query('TRUNCATE users CASCADE'); // cascades to transactions + budgets
  await pool.query('DELETE FROM "session"');
});

// ---- helpers -------------------------------------------------------------
const userA = { name: "Alice", email: "alice@example.com", password: "password123" };
const userB = { name: "Bob", email: "bob@example.com", password: "password456" };

/** Returns a supertest agent that is already signed up and logged in (keeps the session cookie). */
async function signedUpAgent(user = userA) {
  const agent = request.agent(app);
  const res = await agent.post("/api/auth/signup").send(user);
  expect(res.status).toBe(201);
  return agent;
}

const expense = (over: Record<string, unknown> = {}) => ({
  amount: 1000,
  description: "Test expense",
  category: "utilities",
  date: "2026-03-10",
  type: "Expense",
  currency: "PKR",
  ...over,
});

// ===========================================================================
describe("IT-01  Auth + session + database", () => {
  it("signs up, keeps the session, logs out, and rejects the session afterwards", async () => {
    const agent = request.agent(app);

    const signup = await agent.post("/api/auth/signup").send(userA);
    expect(signup.status).toBe(201);
    expect(signup.body.user.email).toBe("alice@example.com");
    expect(signup.body.user).not.toHaveProperty("password_hash");

    expect((await agent.get("/api/auth/me")).status).toBe(200);

    expect((await agent.post("/api/auth/logout")).status).toBe(204);
    expect((await agent.get("/api/auth/me")).status).toBe(401);
  });

  it("logs in with the right password and rejects the wrong one", async () => {
    await signedUpAgent();

    const bad = await request(app).post("/api/auth/login").send({ email: userA.email, password: "wrong-password" });
    expect(bad.status).toBe(401);

    const good = await request(app).post("/api/auth/login").send({ email: "ALICE@example.com ", password: userA.password });
    expect(good.status).toBe(200); // email is trimmed + case-insensitive
  });

  it("rejects duplicate emails and weak passwords", async () => {
    await signedUpAgent();
    expect((await request(app).post("/api/auth/signup").send(userA)).status).toBe(409);
    expect((await request(app).post("/api/auth/signup").send({ ...userB, password: "short" })).status).toBe(400);
    expect((await request(app).post("/api/auth/signup").send({ email: "x@y.com" })).status).toBe(400);
  });

  it("blocks every protected route without a session", async () => {
    for (const path of ["/api/transactions", "/api/budgets", "/api/analytics/trend", "/api/currencies", "/api/backup/export"]) {
      const res = await request(app).get(path);
      expect(res.status, path).toBe(401);
    }
  });
});

// ===========================================================================
describe("IT-02  Transactions + currencies + database (CRUD)", () => {
  it("creates, lists, updates and deletes a transaction", async () => {
    const agent = await signedUpAgent();

    const created = await agent.post("/api/transactions").send(expense({ amount: 1500, currency: "USD" }));
    expect(created.status).toBe(201);
    expect(Number(created.body.transaction.amount)).toBe(1500);
    expect(created.body.transaction.currency).toBe("USD");
    const id = created.body.transaction.id;

    const list = await agent.get("/api/transactions");
    expect(list.body.transactions).toHaveLength(1);

    const updated = await agent.put(`/api/transactions/${id}`).send(expense({ amount: 2500, category: "shopping" }));
    expect(updated.status).toBe(200);
    expect(Number(updated.body.transaction.amount)).toBe(2500);
    expect(updated.body.transaction.category).toBe("shopping");

    expect((await agent.delete(`/api/transactions/${id}`)).status).toBe(204);
    expect((await agent.delete(`/api/transactions/${id}`)).status).toBe(404); // already gone
    expect((await agent.get("/api/transactions")).body.transactions).toHaveLength(0);
  });

  it("validates input", async () => {
    const agent = await signedUpAgent();
    expect((await agent.post("/api/transactions").send({ amount: 5 })).status).toBe(400);
    expect((await agent.post("/api/transactions").send(expense({ type: "Gift" }))).status).toBe(400);
  });

  it("serves the supported currency list", async () => {
    const agent = await signedUpAgent();
    const res = await agent.get("/api/currencies");
    expect(res.status).toBe(200);
    const codes = res.body.currencies.map((c: { code: string }) => c.code);
    expect(codes).toEqual(expect.arrayContaining(["PKR", "USD", "EUR"]));
  });
});

// ===========================================================================
describe("IT-03  Budgets + transactions + budget-status logic", () => {
  const period = "month=3&year=2026";

  it("moves a budget from ok to warning to exceeded as spending grows", async () => {
    const agent = await signedUpAgent();
    const budget = await agent.post("/api/budgets").send({ category: "utilities", month: 3, year: 2026, amount: 10000, currency: "PKR" });
    expect(budget.status).toBe(201);

    await agent.post("/api/transactions").send(expense({ amount: 5000 }));
    let b = (await agent.get(`/api/budgets?${period}`)).body.budgets[0];
    expect(b).toMatchObject({ spent: 5000, percent: 50, status: "ok" });

    await agent.post("/api/transactions").send(expense({ amount: 3500 }));
    b = (await agent.get(`/api/budgets?${period}`)).body.budgets[0];
    expect(b).toMatchObject({ spent: 8500, percent: 85, status: "warning" });

    await agent.post("/api/transactions").send(expense({ amount: 2000 }));
    b = (await agent.get(`/api/budgets?${period}`)).body.budgets[0];
    expect(b).toMatchObject({ spent: 10500, percent: 105, status: "exceeded" });
  });

  it("ignores income, other categories and other months when computing spend", async () => {
    const agent = await signedUpAgent();
    await agent.post("/api/budgets").send({ category: "utilities", month: 3, year: 2026, amount: 10000 });

    await agent.post("/api/transactions").send(expense({ amount: 9000, type: "Income" }));
    await agent.post("/api/transactions").send(expense({ amount: 9000, category: "shopping" }));
    await agent.post("/api/transactions").send(expense({ amount: 9000, date: "2026-04-05" }));

    const b = (await agent.get(`/api/budgets?${period}`)).body.budgets[0];
    expect(b.spent).toBe(0);
    expect(b.status).toBe("ok");
  });

  it("converts spending in another currency into the budget currency", async () => {
    const agent = await signedUpAgent();
    await agent.post("/api/budgets").send({ category: "shopping", month: 3, year: 2026, amount: 10000, currency: "PKR" });
    await agent.post("/api/transactions").send(expense({ category: "shopping", amount: 10, currency: "USD" })); // 10 USD = 2800 PKR

    const b = (await agent.get(`/api/budgets?${period}`)).body.budgets[0];
    expect(b.spent).toBe(2800);
    expect(b.percent).toBe(28);
  });

  it("upserts instead of duplicating, and deletes", async () => {
    const agent = await signedUpAgent();
    await agent.post("/api/budgets").send({ category: "others", month: 3, year: 2026, amount: 5000 });
    const second = await agent.post("/api/budgets").send({ category: "others", month: 3, year: 2026, amount: 7000 });

    const list = (await agent.get(`/api/budgets?${period}`)).body.budgets;
    expect(list).toHaveLength(1);
    expect(list[0].amount).toBe(7000);

    expect((await agent.delete(`/api/budgets/${second.body.budget.id}`)).status).toBe(204);
    expect((await agent.get(`/api/budgets?${period}`)).body.budgets).toHaveLength(0);
  });

  it("rejects invalid budgets", async () => {
    const agent = await signedUpAgent();
    expect((await agent.post("/api/budgets").send({ category: "x" })).status).toBe(400);
    expect((await agent.post("/api/budgets").send({ category: "x", month: 3, year: 2026, amount: -5 })).status).toBe(400);
  });
});

// ===========================================================================
describe("IT-04  Analytics + transactions", () => {
  it("returns per-category totals for the requested month only", async () => {
    const agent = await signedUpAgent();
    await agent.post("/api/transactions").send(expense({ category: "utilities", amount: 4000 }));
    await agent.post("/api/transactions").send(expense({ category: "utilities", amount: 1000 }));
    await agent.post("/api/transactions").send(expense({ category: "shopping", amount: 2000 }));
    await agent.post("/api/transactions").send(expense({ category: "salary", type: "Income", amount: 90000 }));
    await agent.post("/api/transactions").send(expense({ category: "shopping", amount: 777, date: "2026-04-02" })); // other month

    const res = await agent.get("/api/analytics/category-breakdown?month=3&year=2026");
    expect(res.status).toBe(200);
    const byKey = Object.fromEntries(res.body.categories.map((c: { category: string; type: string; total: number }) => [`${c.category}:${c.type}`, c.total]));
    expect(byKey).toEqual({ "utilities:Expense": 5000, "shopping:Expense": 2000, "salary:Income": 90000 });
  });

  it("returns an empty list (not an error) for a month with no data", async () => {
    // Regression guard for the blank Report page: the API contract for an empty month.
    const agent = await signedUpAgent();
    const res = await agent.get("/api/analytics/category-breakdown?month=5&year=2020");
    expect(res.status).toBe(200);
    expect(res.body.categories).toEqual([]);
  });

  it("returns a zero-filled trend of the requested length, oldest first", async () => {
    const agent = await signedUpAgent();
    const res = await agent.get("/api/analytics/trend?months=6");
    expect(res.status).toBe(200);
    expect(res.body.trend).toHaveLength(6);
    const months = res.body.trend.map((t: { month: string }) => t.month);
    expect([...months].sort()).toEqual(months);
    expect(res.body.trend.every((t: { income: number; expense: number }) => t.income === 0 && t.expense === 0)).toBe(true);
  });

  it("converts mixed currencies into the user's base currency", async () => {
    const agent = await signedUpAgent();
    await agent.post("/api/transactions").send(expense({ category: "shopping", amount: 1000, currency: "PKR" }));
    await agent.post("/api/transactions").send(expense({ category: "shopping", amount: 10, currency: "USD" })); // 2800 PKR

    const res = await agent.get("/api/analytics/category-breakdown?month=3&year=2026");
    expect(res.body.categories[0]).toMatchObject({ category: "shopping", total: 3800 });

    // Switch base currency to USD: 3800 PKR = 13.57 USD
    expect((await agent.put("/api/auth/me").send({ base_currency: "USD" })).status).toBe(200);
    const usd = await agent.get("/api/analytics/category-breakdown?month=3&year=2026");
    expect(usd.body.categories[0].total).toBeCloseTo(13.58, 1);
  });
});

// ===========================================================================
describe("IT-05  CSV import / export + database", () => {
  const csv = [
    "amount,description,category,date,type,currency",
    "185000,Monthly salary,salary,2026-03-01,Income,PKR",
    "4500,Internet bill,utilities,2026-03-07,Expense,PKR",
    "300,Freelance logo,salary,2026-03-10,Income,USD",
    "abc,Bad amount,utilities,2026-03-11,Expense,PKR", // invalid amount
    "500,Bad type,utilities,2026-03-12,Gift,PKR", // invalid type
  ].join("\n");

  it("imports valid rows, reports invalid ones, and rolls nothing back", async () => {
    const agent = await signedUpAgent();
    const res = await agent.post("/api/transactions/import").send({ csv });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ imported: 3, totalRows: 5 });
    expect(res.body.errors.map((e: { row: number }) => e.row)).toEqual([5, 6]);
    expect((await agent.get("/api/transactions")).body.transactions).toHaveLength(3);
  });

  it("rejects an empty or missing CSV", async () => {
    const agent = await signedUpAgent();
    expect((await agent.post("/api/transactions/import").send({})).status).toBe(400);
    expect((await agent.post("/api/transactions/import").send({ csv: "amount,description,category,date,type,currency" })).status).toBe(400);
  });

  it("exports CSV that contains the imported rows", async () => {
    const agent = await signedUpAgent();
    await agent.post("/api/transactions/import").send({ csv });

    const res = await agent.get("/api/transactions/export");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.headers["content-disposition"]).toContain("expensemate-transactions.csv");

    const lines = res.text.trim().split(/\r?\n/);
    expect(lines[0]).toBe("amount,description,category,date,type,currency");
    expect(lines).toHaveLength(4); // header + 3 valid rows
    expect(res.text).toContain("Monthly salary");
    expect(res.text).toContain("Internet bill");
  });

  it("round-trips: export then import into a second account gives the same data", async () => {
    const a = await signedUpAgent(userA);
    await a.post("/api/transactions/import").send({ csv });
    const exported = (await a.get("/api/transactions/export")).text;

    const b = await signedUpAgent(userB);
    const res = await b.post("/api/transactions/import").send({ csv: exported });
    expect(res.body.imported).toBe(3);
    expect(res.body.errors).toEqual([]);

    const total = (list: { amount: string }[]) => list.reduce((s, t) => s + Number(t.amount), 0);
    const aList = (await a.get("/api/transactions")).body.transactions;
    const bList = (await b.get("/api/transactions")).body.transactions;
    expect(total(bList)).toBe(total(aList));
  });
});

// ===========================================================================
describe("IT-06  Backup export / restore + database", () => {
  it("restores transactions and budgets from a backup after the data is wiped", async () => {
    const agent = await signedUpAgent();
    await agent.post("/api/transactions").send(expense({ amount: 1200 }));
    await agent.post("/api/transactions").send(expense({ amount: 3400, category: "shopping" }));
    await agent.post("/api/budgets").send({ category: "utilities", month: 3, year: 2026, amount: 9000 });

    const backup = await agent.get("/api/backup/export");
    expect(backup.status).toBe(200);
    const snapshot = JSON.parse(backup.text);
    expect(snapshot).toMatchObject({ version: 1 });
    expect(snapshot.transactions).toHaveLength(2);
    expect(snapshot.budgets).toHaveLength(1);

    await pool.query("DELETE FROM transactions");
    await pool.query("DELETE FROM budgets");
    expect((await agent.get("/api/transactions")).body.transactions).toHaveLength(0);

    const restore = await agent.post("/api/backup/restore").send(snapshot);
    expect(restore.status).toBe(200);
    expect(restore.body).toEqual({ restoredTransactions: 2, restoredBudgets: 1 });

    const list = (await agent.get("/api/transactions")).body.transactions;
    expect(list.map((t: { amount: string }) => Number(t.amount)).sort((x: number, y: number) => x - y)).toEqual([1200, 3400]);
    expect((await agent.get("/api/budgets?month=3&year=2026")).body.budgets).toHaveLength(1);
  });

  it("skips invalid entries and rejects a malformed backup", async () => {
    const agent = await signedUpAgent();
    const res = await agent.post("/api/backup/restore").send({
      transactions: [expense({ amount: 10 }), { nonsense: true }],
      budgets: [{ nonsense: true }],
    });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ restoredTransactions: 1, restoredBudgets: 0 });

    expect((await agent.post("/api/backup/restore").send({ hello: "world" })).status).toBe(400);
  });
});

// ===========================================================================
describe("IT-07  Data isolation between users", () => {
  it("never shows or lets one user touch another user's data", async () => {
    const a = await signedUpAgent(userA);
    const created = await a.post("/api/transactions").send(expense({ amount: 4242 }));
    const txId = created.body.transaction.id;
    const budget = await a.post("/api/budgets").send({ category: "utilities", month: 3, year: 2026, amount: 5000 });

    const b = await signedUpAgent(userB);
    expect((await b.get("/api/transactions")).body.transactions).toHaveLength(0);
    expect((await b.get("/api/budgets?month=3&year=2026")).body.budgets).toHaveLength(0);
    expect((await b.get("/api/analytics/category-breakdown?month=3&year=2026")).body.categories).toEqual([]);

    expect((await b.put(`/api/transactions/${txId}`).send(expense({ amount: 1 }))).status).toBe(404);
    expect((await b.delete(`/api/transactions/${txId}`)).status).toBe(404);
    expect((await b.delete(`/api/budgets/${budget.body.budget.id}`)).status).toBe(404);

    // A's data is untouched
    const aList = (await a.get("/api/transactions")).body.transactions;
    expect(aList).toHaveLength(1);
    expect(Number(aList[0].amount)).toBe(4242);
  });
});
