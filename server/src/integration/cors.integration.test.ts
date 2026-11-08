/**
 * IT-13  CORS / cross-origin browser behaviour
 *
 * Regression tests for the manual-testing defect where the API served by
 * `npm run preview` (http://localhost:4173) was rejected by the browser
 * because the backend echoed only its configured
 * `CLIENT_ORIGIN=http://localhost:5173`.
 *
 * In development/test the API must echo any loop-back origin (including the
 * Vite preview port) so the browser can read the response, and it must send
 * no ACA header for unlisted public origins. Production strictness is unit
 * tested in corsOrigins.test.ts (isAllowedCorsOrigin with allowLoopback=false).
 *
 * Run: npm run test:integration      (from the server/ folder)
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

describe("IT-13  CORS: configured and loop-back origins", () => {
  it("echos a loop-back origin (Vite preview port) so the browser can read the response", async () => {
    const res = await request(app)
      .options("/api/auth/signup")
      .set("Origin", "http://127.0.0.1:4173")
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "content-type");

    expect(res.status).toBe(204);
    expect(res.headers["access-control-allow-origin"]).toBe(
      "http://127.0.0.1:4173"
    );
    expect(res.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("sets the session cookie on a signup from the preview origin", async () => {
    const email = `preview.user.${Date.now()}@example.com`;
    const res = await request(app)
      .post("/api/auth/signup")
      .set("Origin", "http://localhost:4173")
      .set("Content-Type", "application/json")
      .send({ name: "Preview User", email, password: "password123" });

    expect(res.status).toBe(201);
    expect(res.headers["access-control-allow-origin"]).toBe(
      "http://localhost:4173"
    );
    const setCookieHeader = res.headers["set-cookie"];
    const cookieList: string[] =
      typeof setCookieHeader === "string"
        ? [setCookieHeader]
        : Array.isArray(setCookieHeader)
          ? setCookieHeader
          : [];
    expect(cookieList.some((value) => value.startsWith("connect.sid="))).toBe(
      true
    );
  });

  it("sends no ACA header for unlisted public origins (browser blocks them)", async () => {
    const res = await request(app)
      .options("/api/auth/signup")
      .set("Origin", "https://evil.example.org")
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "content-type");

    // The request still completes, but without ACA headers the browser will
    // consider the response unreadable from that origin.
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
    expect(res.headers["access-control-allow-credentials"]).toBeUndefined();
  });

  it("still echoes the configured CLIENT_ORIGIN", async () => {
    const configured = (process.env.CLIENT_ORIGIN ?? "http://localhost:5173")
      .split(",")[0]
      .trim();
    const res = await request(app)
      .options("/api/auth/signup")
      .set("Origin", configured)
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "content-type");

    expect(res.status).toBe(204);
    expect(res.headers["access-control-allow-origin"]).toBe(configured);
  });
});
