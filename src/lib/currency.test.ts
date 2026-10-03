import { describe, it, expect } from "vitest"
import { convertAmount } from "./currency"
import type { Currency } from "./api"

const currencies: Currency[] = [
  { code: "PKR", name: "Pakistani Rupee", symbol: "Rs", rate_to_base: 1 },
  { code: "USD", name: "US Dollar", symbol: "$", rate_to_base: 280 },
]

describe("convertAmount", () => {
  it("returns the same amount when currencies match", () => {
    expect(convertAmount(100, "USD", "USD", currencies)).toBe(100)
  })

  it("converts USD to PKR using the rates (10 USD = 2800 PKR)", () => {
    expect(convertAmount(10, "USD", "PKR", currencies)).toBe(2800)
  })
})
