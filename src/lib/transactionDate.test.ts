import { describe, expect, it } from "vitest"
import { isFutureDate } from "./transactionDate"

describe("isFutureDate", () => {
  const today = new Date(2026, 10, 8, 15)

  it("allows today's date regardless of time", () => {
    expect(isFutureDate(new Date(2026, 10, 8, 23), today)).toBe(false)
  })

  it("rejects a later calendar day", () => {
    expect(isFutureDate(new Date(2026, 10, 9), today)).toBe(true)
  })

  it("allows a past calendar day", () => {
    expect(isFutureDate(new Date(2026, 10, 7), today)).toBe(false)
  })
})
