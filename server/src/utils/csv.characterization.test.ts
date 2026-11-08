/**
 * Characterization tests for the CSV module.
 *
 * These were written and executed against the ORIGINAL `toCsv` / `parseCsv`
 * implementation before the rewrite, and then re-run unchanged against the
 * new `CsvFormatter` / `CsvParser` classes (exposed through the same public
 * functions). They lock in the observable behaviour of the module.
 */
import { describe, it, expect } from "vitest";
import { toCsv, parseCsv } from "./csv.js";

describe("CSV characterization: formatting", () => {
  it("writes a header row followed by data rows, newline separated", () => {
    expect(toCsv(["amount", "category"], [[100, "shopping"]])).toBe(
      "amount,category\n100,shopping"
    );
  });

  it("joins multiple rows without a trailing newline", () => {
    expect(
      toCsv(
        ["a", "b"],
        [
          [1, 2],
          [3, 4],
        ]
      )
    ).toBe("a,b\n1,2\n3,4");
  });

  it("quotes commas, double quotes and newlines", () => {
    expect(toCsv(["description"], [["Rent, September"]])).toBe(
      'description\n"Rent, September"'
    );
    expect(toCsv(["description"], [['He said "hi"']])).toBe(
      'description\n"He said ""hi"""'
    );
    expect(toCsv(["description"], [["line one\nline two"]])).toBe(
      'description\n"line one\nline two"'
    );
  });

  it("does not quote ordinary values", () => {
    expect(toCsv(["Plain"], [["hello world"]])).toBe("Plain\nhello world");
  });
});

describe("CSV characterization: parsing", () => {
  it("keys rows by the lower-cased, trimmed header row", () => {
    expect(parseCsv(" Amount , CATEGORY \n100,shopping")).toEqual([
      { amount: "100", category: "shopping" },
    ]);
  });

  it("trims whitespace from values", () => {
    expect(parseCsv("amount,category\n  100  , shopping ")).toEqual([
      { amount: "100", category: "shopping" },
    ]);
  });

  it("handles quoted fields containing commas", () => {
    expect(parseCsv('amount,description\n100,"Rent, September"')[0]).toEqual({
      amount: "100",
      description: "Rent, September",
    });
  });

  it("handles escaped double quotes inside quoted fields", () => {
    expect(parseCsv('amount,description\n100,"He said ""hi"""')[0].description).toBe(
      'He said "hi"'
    );
  });

  it("handles embedded newlines inside quoted fields", () => {
    expect(parseCsv('description,amount\n"line one\nline two",100')[0]).toEqual({
      description: "line one\nline two",
      amount: "100",
    });
  });

  it("parses a quoted empty field as an empty string", () => {
    expect(parseCsv('a,b\n"",2')[0]).toEqual({ a: "", b: "2" });
  });

  it("normalises CRLF line endings", () => {
    expect(parseCsv("amount,category\r\n100,shopping\r\n200,utilities")).toEqual([
      { amount: "100", category: "shopping" },
      { amount: "200", category: "utilities" },
    ]);
  });

  it("skips blank lines between records", () => {
    expect(parseCsv("amount,category\n100,shopping\n\n200,utilities")).toHaveLength(2);
  });

  it("accepts a trailing newline without producing an empty row", () => {
    expect(parseCsv("amount,category\n100,shopping\n")).toEqual([
      { amount: "100", category: "shopping" },
    ]);
  });

  it("parses input that has no trailing newline", () => {
    expect(parseCsv("amount,category\n100,shopping")).toEqual([
      { amount: "100", category: "shopping" },
    ]);
  });

  it("defaults missing trailing columns to an empty string", () => {
    expect(parseCsv("amount,category,date\n100,shopping")).toEqual([
      { amount: "100", category: "shopping", date: "" },
    ]);
  });

  it("ignores extra values that have no matching header", () => {
    expect(parseCsv("amount,category\n100,shopping,extra")).toEqual([
      { amount: "100", category: "shopping" },
    ]);
  });

  it("returns an empty array for header-only input", () => {
    expect(parseCsv("amount,category")).toEqual([]);
  });

  it("returns an empty array for empty input", () => {
    expect(parseCsv("")).toEqual([]);
  });

  it("returns an empty array for blank-line-only input", () => {
    expect(parseCsv("\n\n")).toEqual([]);
  });

  it("round-trips formatted output without losing data", () => {
    const headers = ["amount", "description", "category", "date", "type", "currency"];
    const row = [1200, "Rent, Sept", "utilities", "2026-09-01", "Expense", "PKR"];
    expect(parseCsv(toCsv(headers, [row]))).toEqual([
      {
        amount: "1200",
        description: "Rent, Sept",
        category: "utilities",
        date: "2026-09-01",
        type: "Expense",
        currency: "PKR",
      },
    ]);
  });
});
