import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import dotenv from "dotenv";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

// Integration tests for the cloud backup feature (IT-08 to IT-12).
// They run against the real test database and wipe it before every test.
dotenv.config({ path: ".env.test", override: true });

if (!process.env.DATABASE_URL?.endsWith("_test")) {
  throw new Error('Refusing to run: DATABASE_URL must point at a database whose name ends in "_test".');
}

// Loaded after dotenv so the app and pool pick up the test DATABASE_URL.
const { default: app } = await import("../app.js");
const { pool } = await import("../db/pool.js");

let server: Server;
let base = "";

// A tiny HTTP client that remembers the session cookie, like a browser tab.
function newClient() {
  let cookie = "";
  return async (method: string, path: string, body?: unknown) => {
    const res = await fetch(base + path, {
      method,
      headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const setCookies = res.headers.getSetCookie();
    if (setCookies.length > 0) cookie = setCookies.map((c) => c.split(";")[0]).join("; ");
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : undefined };
  };
}

async function signup(name: string, email: string) {
  const call = newClient();
  const res = await call("POST", "/api/auth/signup", { name, email, password: "password123" });
  expect(res.status).toBe(201);
  return call;
}

async function seedData(call: ReturnType<typeof newClient>) {
  const t = await call("POST", "/api/transactions", {
    amount: 1500.5, description: "Groceries", category: "Food", date: "2026-10-01", type: "Expense", currency: "PKR",
  });
  expect(t.status).toBe(201);
  const b = await call("POST", "/api/budgets", { category: "Food", month: 10, year: 2026, amount: 5000, currency: "PKR" });
  expect(b.status).toBeLessThan(300);
  return t.body.transaction.id as string;
}

beforeAll(async () => {
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await pool.end();
});

beforeEach(async () => {
  await pool.query("DELETE FROM users"); // cascades to transactions, budgets and cloud_backups
});

describe("IT-08 cloud backup: create and list", () => {
  it("rejects anonymous requests", async () => {
    const anon = newClient();
    expect((await anon("POST", "/api/backup/cloud")).status).toBe(401);
    expect((await anon("GET", "/api/backup/cloud")).status).toBe(401);
  });

  it("stores a snapshot with the right counts and lists it", async () => {
    const alice = await signup("Alice", "alice@example.com");
    await seedData(alice);

    const created = await alice("POST", "/api/backup/cloud");
    expect(created.status).toBe(201);
    expect(created.body.backup.transaction_count).toBe(1);
    expect(created.body.backup.budget_count).toBe(1);

    const list = await alice("GET", "/api/backup/cloud");
    expect(list.status).toBe(200);
    expect(list.body.backups).toHaveLength(1);
    expect(list.body.backups[0].id).toBe(created.body.backup.id);
    expect(list.body.backups[0].data).toBeUndefined(); // the list never ships the full payload
  });

  it("keeps the calendar day of a transaction in the snapshot (no timezone shift)", async () => {
    const alice = await signup("Alice", "alice@example.com");
    await seedData(alice);
    await alice("POST", "/api/backup/cloud");

    const row = await pool.query("SELECT data->'transactions'->0->>'date' AS date FROM cloud_backups");
    expect(row.rows[0].date).toBe("2026-10-01");
  });
});

describe("IT-09 cloud backup: restore", () => {
  it("brings back data that was deleted after the snapshot", async () => {
    const alice = await signup("Alice", "alice@example.com");
    const txId = await seedData(alice);
    const snap = await alice("POST", "/api/backup/cloud");

    expect((await alice("DELETE", `/api/transactions/${txId}`)).status).toBe(204);
    expect((await alice("GET", "/api/transactions")).body.transactions).toHaveLength(0);

    const restored = await alice("POST", `/api/backup/cloud/${snap.body.backup.id}/restore`);
    expect(restored.status).toBe(200);
    expect(restored.body.restoredTransactions).toBe(1);
    expect(restored.body.restoredBudgets).toBe(1);

    const after = await alice("GET", "/api/transactions");
    expect(after.body.transactions).toHaveLength(1);
    expect(after.body.transactions[0].description).toBe("Groceries");
    expect(Number(after.body.transactions[0].amount)).toBe(1500.5);
  });

  it("returns 404 for an unknown or malformed id", async () => {
    const alice = await signup("Alice", "alice@example.com");
    const missing = await alice("POST", "/api/backup/cloud/00000000-0000-0000-0000-000000000000/restore");
    expect(missing.status).toBe(404);
    const malformed = await alice("POST", "/api/backup/cloud/not-a-uuid/restore");
    expect(malformed.status).toBe(404);
  });
});

describe("IT-10 cloud backup: delete", () => {
  it("removes a snapshot and then returns 404 for it", async () => {
    const alice = await signup("Alice", "alice@example.com");
    const snap = await alice("POST", "/api/backup/cloud");
    const id = snap.body.backup.id;

    expect((await alice("DELETE", `/api/backup/cloud/${id}`)).status).toBe(204);
    expect((await alice("GET", "/api/backup/cloud")).body.backups).toHaveLength(0);
    expect((await alice("DELETE", `/api/backup/cloud/${id}`)).status).toBe(404);
  });
});

describe("IT-11 cloud backup: retention", () => {
  it("keeps only the 10 newest snapshots", async () => {
    const alice = await signup("Alice", "alice@example.com");
    for (let i = 0; i < 12; i++) {
      expect((await alice("POST", "/api/backup/cloud")).status).toBe(201);
    }
    const list = await alice("GET", "/api/backup/cloud");
    expect(list.body.backups).toHaveLength(10);
  });
});

describe("IT-12 cloud backup: user isolation", () => {
  it("does not let one user see, restore or delete another user's snapshot", async () => {
    const alice = await signup("Alice", "alice@example.com");
    await seedData(alice);
    const snap = await alice("POST", "/api/backup/cloud");
    const id = snap.body.backup.id;

    const bob = await signup("Bob", "bob@example.com");
    expect((await bob("GET", "/api/backup/cloud")).body.backups).toHaveLength(0);
    expect((await bob("POST", `/api/backup/cloud/${id}/restore`)).status).toBe(404);
    expect((await bob("DELETE", `/api/backup/cloud/${id}`)).status).toBe(404);

    // Alice's snapshot is untouched.
    expect((await alice("GET", "/api/backup/cloud")).body.backups).toHaveLength(1);
  });
});
