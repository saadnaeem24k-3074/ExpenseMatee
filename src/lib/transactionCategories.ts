export const INCOME_CATEGORIES = ["salary"] as const
export const EXPENSE_CATEGORIES = ["shopping", "entertainment", "utilities", "others"] as const

export function categoriesForType(type: "Income" | "Expense"): readonly string[] {
  return type === "Income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
}
