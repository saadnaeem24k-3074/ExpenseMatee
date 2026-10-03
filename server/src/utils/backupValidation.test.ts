import { describe, it, expect } from "vitest";
import { isValidBackupTransaction, isValidBackupBudget } from "./backupValidation.js";

describe("isValidBackupTransaction", () => {
  it("accepts a well-formed transaction", () => {
    expect(isValidBackupTransaction({ amount: 100, category: "shopping", date: "2026-09-01", type: "Expense" })).toBe(true);
  });

  it("rejects a missing amount", () => {
    expect(isValidBackupTransaction({ category: "shopping", date: "2026-09-01", type: "Expense" })).toBe(false);
  });

  it("rejects a missing category", () => {
    expect(isValidBackupTransaction({ amount: 100, date: "2026-09-01", type: "Expense" })).toBe(false);
  });

  it("accepts amount 0 (falsy but valid)", () => {
    expect(isValidBackupTransaction({ amount: 0, category: "shopping", date: "2026-09-01", type: "Expense" })).toBe(true);
  });

  it("rejects non-object input", () => {
    expect(isValidBackupTransaction(null)).toBe(false);
    expect(isValidBackupTransaction("not an object")).toBe(false);
  });
});

describe("isValidBackupBudget", () => {
  it("accepts a well-formed budget", () => {
    expect(isValidBackupBudget({ category: "shopping", month: 9, year: 2026, amount: 5000 })).toBe(true);
  });

  it("rejects a missing month", () => {
    expect(isValidBackupBudget({ category: "shopping", year: 2026, amount: 5000 })).toBe(false);
  });

  it("rejects a missing amount", () => {
    expect(isValidBackupBudget({ category: "shopping", month: 9, year: 2026 })).toBe(false);
  });

  it("rejects non-object input", () => {
    expect(isValidBackupBudget(undefined)).toBe(false);
  });
});
