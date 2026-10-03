import { useEffect, useMemo, useState } from "react"
import { useTransactions } from "@/lib/useTransactions"
import { api, type Budget, type Currency } from "@/lib/api"
import { useAuth } from "@/lib/useAuth"
import { convertAmount, currencySymbol } from "@/lib/currency"

/** Totals, balance and budget alerts for the Dashboard, in the user's base currency. */
export function useDashboardData() {
  const { transactions } = useTransactions()
  const { user } = useAuth()
  const [alertBudgets, setAlertBudgets] = useState<Budget[]>([])
  const [currencies, setCurrencies] = useState<Currency[]>([])

  useEffect(() => {
    const now = new Date()
    api.budgets.list(now.getMonth() + 1, now.getFullYear())
      .then(({ budgets }) => setAlertBudgets(budgets.filter((b) => b.status !== "ok")))
      .catch(() => setAlertBudgets([]))
  }, [transactions])

  useEffect(() => {
    api.currencies.list()
      .then(({ currencies }) => setCurrencies(currencies))
      .catch(() => setCurrencies([]))
  }, [])

  const baseCurrency = user?.base_currency ?? "PKR"
  const symbol = currencySymbol(baseCurrency, currencies)

  // Transactions can be in different currencies, so convert to the base
  // currency before summing instead of adding raw numbers.
  const { income, expense } = useMemo(() => {
    const total = (type: "Income" | "Expense") =>
      transactions
        .filter((t) => t.type === type)
        .reduce((acc, t) => acc + convertAmount(t.Amount, t.Currency, baseCurrency, currencies), 0)
    return { income: total("Income"), expense: total("Expense") }
  }, [transactions, baseCurrency, currencies])

  const balance = income - expense
  const spentPct = income > 0 ? Math.min(100, Math.round((expense / income) * 100)) : 0

  return { symbol, income, expense, balance, spentPct, alertBudgets }
}
