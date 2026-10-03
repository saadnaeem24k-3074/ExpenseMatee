import { describe, expect, it } from "vitest"
import { toDateString, toView } from "./useTransactions"
import type { Transaction } from "./api"

describe("transaction mapping", () => {
  it("toView converts Postgres' numeric string amount into a number and builds a Date", () => {
    const row = {
      id: "t1", amount: "1500.50" as unknown as number, description: "Groceries", category: "others",
      date: "2026-03-10", type: "Expense", currency: "PKR", created_at: "2026-03-10T10:00:00Z",
    } as Transaction
    const view = toView(row)

    expect(view.Amount).toBe(1500.5)
    expect(view.Category).toBe("others")
    expect(view.Date).toBeInstanceOf(Date)
  })

  it("toDateString keeps the picked day for a local-midnight date (timezone regression)", () => {
    // toISOString() would give "2026-09-30" here in any timezone ahead of UTC (e.g. Pakistan).
    expect(toDateString(new Date(2026, 9, 1, 0, 0, 0))).toBe("2026-10-01")
  })
})
