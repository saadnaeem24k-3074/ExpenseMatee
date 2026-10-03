export type BudgetStatus = "ok" | "warning" | "exceeded";

// Extracted out of the /budgets route so this small but important piece of
// logic (when does a budget count as "warning" vs "exceeded") can be unit
// tested without spinning up a database.
export function computeBudgetStatus(amount: number, spent: number): { percent: number; status: BudgetStatus } {
  const percent = amount > 0 ? Math.round((spent / amount) * 100) : 0;
  const status: BudgetStatus = percent >= 100 ? "exceeded" : percent >= 80 ? "warning" : "ok";
  return { percent, status };
}
