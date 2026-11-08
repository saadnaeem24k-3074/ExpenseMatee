/**
 * Characterization tests for the auth HTTP contract.
 *
 * These were written and executed against the ORIGINAL inline route handlers
 * in `routes/auth.ts` before the rewrite into AuthController/AuthService/
 * AuthRepository, and then re-run unchanged afterwards. They capture the exact
 * status codes, error messages and JSON shapes the existing frontend relies on.
 */
import { beforeAll, afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import dotenv from "dotenv";
import type { Express } from "express";
import type { Pool } from "pg";

dotenv.config({ path: ".env.test", override: true });

const dbUrl = process.env.DATABASE_URL ?? "";
if (!/_test(\?|$)/.test(dbUrl)) {
  throw new Error(
    `Refusing to run: DATABASE_URL must point at a database whose name ends in "_test" (got "${dbUrl}").`
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
  await pool.query("TRUNCATE users CASCADE");
  await pool.query('DELETE FROM "session"');
});

const user = { name: "Alice", email: "alice@example.com", password: "password123" };

describe("Auth characterization: signup", () => {
  it("creates an account, returns a safe user object and starts a session", async () => {
    const agent = request.agent(app);
    const res = await agent.post("/api/auth/signup").send(user);

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({
      name: "Alice",
      email: "alice@example.com",
      base_currency: "PKR",
    });
    expect(res.body.user.id).toBeTruthy();
    expect(res.body.user).not.toHaveProperty("password_hash");

    expect((await agent.get("/api/auth/me")).status).toBe(200);
  });

  it("requires name, email and password", async () => {
    const res = await request(app).post("/api/auth/signup").send({ email: "a@b.com" });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Name, email, and password are required." });
  });

  it("rejects a password shorter than 8 characters", async () => {
    const res = await request(app)
      .post("/api/auth/signup")
      .send({ ...user, password: "short" });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Password must be at least 8 characters." });
  });

  it("normalises the email to trimmed lower-case", async () => {
    const res = await request(app)
      .post("/api/auth/signup")
      .send({ ...user, email: "  Alice@Example.COM  " });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe("alice@example.com");
  });

  it("honours a supplied base currency and defaults to PKR otherwise", async () => {
    const usd = await request(app)
      .post("/api/auth/signup")
      .send({ ...user, email: "usd@example.com", base_currency: "USD" });
    expect(usd.body.user.base_currency).toBe("USD");

    const fallback = await request(app)
      .post("/api/auth/signup")
      .send({ ...user, email: "fallback@example.com" });
    expect(fallback.body.user.base_currency).toBe("PKR");
  });

  it("rejects a duplicate email with 409", async () => {
    await request(app).post("/api/auth/signup").send(user);
    const res = await request(app).post("/api/auth/signup").send(user);
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: "An account with that email already exists." });
  });
});

describe("Auth characterization: login", () => {
  beforeEach(async () => {
    await request(app).post("/api/auth/signup").send(user);
  });

  it("accepts the correct password and returns a safe user object", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "  ALICE@example.com ", password: "password123" });

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({
      name: "Alice",
      email: "alice@example.com",
      base_currency: "PKR",
    });
    expect(res.body.user).not.toHaveProperty("password_hash");
  });

  it("rejects a wrong password with the generic message", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: "not-the-password" });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Invalid email or password." });
  });

  it("rejects an unknown email with the same generic message", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@example.com", password: "password123" });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Invalid email or password." });
  });

  it("requires both email and password", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: user.email });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Email and password are required." });
  });
});

describe("Auth characterization: session and profile", () => {
  beforeEach(async () => {
    await request(app).post("/api/auth/signup").send(user);
  });

  it("returns 401 from /me without a session", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Not authenticated" });
  });

  it("logs out and rejects the session afterwards", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email: user.email, password: user.password });
    expect((await agent.post("/api/auth/logout")).status).toBe(204);
    expect((await agent.get("/api/auth/me")).status).toBe(401);
  });

  it("updates the logged-in user's base currency", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email: user.email, password: user.password });

    const res = await agent.put("/api/auth/me").send({ base_currency: "EUR" });
    expect(res.status).toBe(200);
    expect(res.body.user.base_currency).toBe("EUR");

    const me = await agent.get("/api/auth/me");
    expect(me.body.user.base_currency).toBe("EUR");
  });

  it("rejects a missing base currency", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email: user.email, password: user.password });
    const res = await agent.put("/api/auth/me").send({});
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "base_currency is required." });
  });

  it("rejects a profile update without a session", async () => {
    const res = await request(app).put("/api/auth/me").send({ base_currency: "EUR" });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Not authenticated" });
  });
});
