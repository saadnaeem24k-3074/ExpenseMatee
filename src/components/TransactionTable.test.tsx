import { describe, expect, it, vi } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { TransactionTable } from "./TransactionTable"
import type { transactionn } from "@/lib/useTransactions"

const salary: transactionn = {
  id: "1", Amount: 185000, Description: "Monthly salary", Category: "salary",
  Date: new Date(2026, 2, 1), type: "Income", Currency: "PKR",
}
const internet: transactionn = {
  id: "2", Amount: 4500, Description: "", Category: "utilities",
  Date: new Date(2026, 2, 7), type: "Expense", Currency: "PKR",
}

describe("TransactionTable", () => {
  it("shows the empty state when there are no transactions", () => {
    const html = renderToStaticMarkup(<TransactionTable transactions={[]} />)
    expect(html).toContain("No transactions yet")
    expect(html).not.toContain("<table")
  })

  it("renders rows with the formatted date, + for income and a minus sign for expenses", () => {
    const html = renderToStaticMarkup(<TransactionTable transactions={[salary, internet]} />)
    expect(html).toContain("Monthly salary")
    expect(html).toContain("01 Mar 2026")
    expect(html).toContain("+")
    expect(html).toContain("−")
  })

  it("shows Edit/Delete only when handlers are passed", () => {
    const without = renderToStaticMarkup(<TransactionTable transactions={[salary]} />)
    const withHandlers = renderToStaticMarkup(<TransactionTable transactions={[salary]} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(without).not.toContain("Delete")
    expect(withHandlers).toContain("Edit")
    expect(withHandlers).toContain("Delete")
  })
})
