import { describe, it, expect } from "vitest";
import { toCsv, parseCsv } from "./csv.js";

describe("toCsv", () => {
  it("joins headers and rows with commas", () => {
    const csv = toCsv(["amount", "category"], [[100, "shopping"]]);
    expect(csv).toBe("amount,category\n100,shopping");
  });

  it("quotes fields containing a comma", () => {
    const csv = toCsv(["description"], [["Rent, September"]]);
    expect(csv).toBe('description\n"Rent, September"');
  });

  it("escapes embedded double quotes by doubling them", () => {
    const csv = toCsv(["description"], [['He said "hi"']]);
    expect(csv).toBe('description\n"He said ""hi"""');
  });
});

describe("parseCsv", () => {
  it("parses a simple CSV into row objects keyed by header", () => {
    const rows = parseCsv("amount,category\n100,shopping\n200,utilities");
    expect(rows).toEqual([
      { amount: "100", category: "shopping" },
      { amount: "200", category: "utilities" },
    ]);
  });

  it("handles quoted fields with commas inside them", () => {
    const rows = parseCsv('amount,description\n100,"Rent, September"');
    expect(rows[0].description).toBe("Rent, September");
  });

  it("handles escaped double quotes inside quoted fields", () => {
    const rows = parseCsv('amount,description\n100,"He said ""hi"""');
    expect(rows[0].description).toBe('He said "hi"');
  });

  it("skips blank lines", () => {
    const rows = parseCsv("amount,category\n100,shopping\n\n200,utilities");
    expect(rows).toHaveLength(2);
  });

  it("returns an empty array for header-only input", () => {
    const rows = parseCsv("amount,category");
    expect(rows).toEqual([]);
  });

  it("lower-cases header names so lookups are case-insensitive", () => {
    const rows = parseCsv("Amount,Category\n100,shopping");
    expect(rows[0]).toEqual({ amount: "100", category: "shopping" });
  });

  it("round-trips through toCsv without losing data", () => {
    const original = [
      { amount: 1200, description: "Rent, Sept", category: "utilities", date: "2026-09-01", type: "Expense", currency: "PKR" },
    ];
    const csv = toCsv(
      ["amount", "description", "category", "date", "type", "currency"],
      original.map((r) => [r.amount, r.description, r.category, r.date, r.type, r.currency])
    );
    const parsed = parseCsv(csv);
    expect(parsed[0].amount).toBe("1200");
    expect(parsed[0].description).toBe("Rent, Sept");
    expect(parsed[0].category).toBe("utilities");
  });
});
