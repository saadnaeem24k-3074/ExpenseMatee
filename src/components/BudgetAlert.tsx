import { TriangleAlert } from "lucide-react"
import type { Budget } from "@/lib/api"

interface BudgetAlertProps {
  budgets: Budget[]
  onClick: () => void
}

export function BudgetAlert({ budgets, onClick }: BudgetAlertProps) {
  if (budgets.length === 0) return null

  return (
    <div
      className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-clay/30 bg-clay/10 px-4 py-3"
      onClick={onClick}
    >
      <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-clay" />
      <div className="text-sm text-ink">
        <span className="font-semibold">Budget alert:</span>{" "}
        {budgets.map((b) => `${b.category} at ${b.percent}%`).join(", ")}.{" "}
        <span className="underline">View budgets</span>
      </div>
    </div>
  )
}
