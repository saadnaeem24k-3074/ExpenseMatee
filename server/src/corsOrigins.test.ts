import { describe, it, expect } from "vitest";
import {
  parseClientOrigins,
  isAllowedCorsOrigin,
} from "./corsOrigins.js";

describe("parseClientOrigins", () => {
  it("parses a single origin", () => {
    expect(parseClientOrigins("http://localhost:5173")).toEqual([
      "http://localhost:5173",
    ]);
  });

  it("parses a comma/space separated list and trims it", () => {
    expect(
      parseClientOrigins(
        "http://localhost:5173,  http://localhost:4173 ,\n\t https://app.example.com"
      )
    ).toEqual([
      "http://localhost:5173",
      "http://localhost:4173",
      "https://app.example.com",
    ]);
  });

  it("returns an empty list for an empty string", () => {
    expect(parseClientOrigins("   ")).toEqual([]);
  });

  it("deduplicates repeated entries", () => {
    expect(
      parseClientOrigins(" http://localhost:5173 , http://localhost:5173")
    ).toEqual(["http://localhost:5173"]);
  });

  it("normalizes origins to match the browser Origin header", () => {
    expect(
      parseClientOrigins("HTTPS://App.Example.com/, http://localhost:80")
    ).toEqual(["https://app.example.com", "http://localhost"]);
  });

  it("rejects values that are not absolute origins", () => {
    expect(() => parseClientOrigins("localhost:5173")).toThrow(/Invalid CLIENT_ORIGIN entry/);
    expect(() => parseClientOrigins("http://app.example.com/api")).toThrow(/Invalid CLIENT_ORIGIN entry/);
    expect(() => parseClientOrigins("ftp://app.example.com")).toThrow(/Invalid CLIENT_ORIGIN entry/);
    expect(() => parseClientOrigins("http://app.example.com?q=1")).toThrow(/Invalid CLIENT_ORIGIN entry/);
  });
});

describe("isAllowedCorsOrigin", () => {
  const allowed = ["http://localhost:5173", "https://app.example.com"];

  it("allows origins from the configured list (any environment)", () => {
    expect(isAllowedCorsOrigin("https://app.example.com", allowed, false)).toBe(true);
    expect(isAllowedCorsOrigin("https://app.example.com", allowed, true)).toBe(true);
  });

  it("blocks origins that are not in the list", () => {
    expect(isAllowedCorsOrigin("https://evil.example.org", allowed, false)).toBe(false);
    expect(isAllowedCorsOrigin("https://evil.example.org", allowed, true)).toBe(false);
  });

  it("allows any loop-back origin in development/test (e.g. the Vite preview port)", () => {
    expect(isAllowedCorsOrigin("http://localhost:4173", allowed, true)).toBe(true);
    expect(isAllowedCorsOrigin("http://127.0.0.1:3000", allowed, true)).toBe(true);
    expect(isAllowedCorsOrigin("http://[::1]:4000", allowed, true)).toBe(true);
    expect(isAllowedCorsOrigin("https://localhost:5173", allowed, true)).toBe(true);
  });

  it("blocks loop-back origins in production unless they are listed", () => {
    expect(isAllowedCorsOrigin("http://localhost:4173", allowed, false)).toBe(false);
    expect(isAllowedCorsOrigin("http://localhost:5173", allowed, false)).toBe(true);
  });

  it("blocks spoofed loop-back hostnames", () => {
    expect(
      isAllowedCorsOrigin("http://localhost:4173.evil.com", allowed, true)
    ).toBe(false);
    expect(isAllowedCorsOrigin("http://localhostiness:4173", allowed, true)).toBe(false);
  });

  it("rejects a missing Origin header (non-browser request)", () => {
    expect(isAllowedCorsOrigin(undefined, allowed, true)).toBe(false);
  });
});
