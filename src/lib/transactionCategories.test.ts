import { describe, expect, it } from "vitest"
import { categoriesForType } from "./transactionCategories"

describe("categoriesForType", () => {
  it("only offers salary for income transactions", () => {
    expect(categoriesForType("Income")).toEqual(["salary"])
  })

  it("only offers expense categories for expense transactions", () => {
    expect(categoriesForType("Expense")).toEqual([
      "shopping",
      "entertainment",
      "utilities",
      "others",
    ])
  })
})
