import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { ArrowDownLeft, ArrowUpRight, Receipt } from "lucide-react"
import type { transactionn } from "@/lib/useTransactions"

interface TransactionTableProps {
  transactions: transactionn[]
  onEdit?: (trans: transactionn) => void
  onDelete?: (id: string) => void
  emptyHint?: string
}

export function TransactionTable({ transactions, onEdit, onDelete, emptyHint }: TransactionTableProps) {
  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-xl border border-ink/10 bg-white px-10 py-14 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-canvas">
          <Receipt className="h-6 w-6 text-ink/40" />
        </div>
        <h3 className="my-display text-lg font-semibold text-ink">No transactions yet</h3>
        <p className="mt-1 text-sm text-ink/50">
          {emptyHint ?? "Add your first transaction to see it here."}
        </p>
      </div>
    )
  }

  const showActions = Boolean(onEdit || onDelete)

  return (
    <div className="overflow-hidden rounded-xl border border-ink/10 bg-white">
      <Table className="w-full">
        <TableHeader>
          <TableRow className="border-b border-ink/10 hover:bg-transparent">
            <TableHead className="py-3 text-xs font-semibold text-ink/50">Type</TableHead>
            <TableHead className="py-3 text-xs font-semibold text-ink/50">Category</TableHead>
            <TableHead className="py-3 text-xs font-semibold text-ink/50">Description</TableHead>
            <TableHead className="py-3 text-xs font-semibold text-ink/50">Date</TableHead>
            <TableHead className="py-3 text-right text-xs font-semibold text-ink/50">Amount</TableHead>
            {showActions && <TableHead className="py-3 text-right text-xs font-semibold text-ink/50">Actions</TableHead>}
          </TableRow>
        </TableHeader>

        <TableBody>
          {transactions.map((trans) => {
            const isIncome = trans.type === "Income"
            return (
              <TableRow key={trans.id} className="border-b border-ink/5 last:border-0 hover:bg-canvas/60">
                <TableCell className="py-3.5">
                  <span
                    className={`inline-flex items-center gap-1.5 text-sm font-medium ${
                      isIncome ? "text-sage" : "text-clay"
                    }`}
                  >
                    {isIncome ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
                    {trans.type}
                  </span>
                </TableCell>
                <TableCell className="py-3.5 text-sm capitalize text-ink/70">{trans.Category}</TableCell>
                <TableCell className="py-3.5 text-sm text-ink/70">
                  {trans.Description || <span className="text-ink/30">—</span>}
                </TableCell>
                <TableCell className="py-3.5 text-sm text-ink/50">{format(trans.Date, "dd MMM yyyy")}</TableCell>
                <TableCell
                  className={`py-3.5 text-right text-sm font-semibold tabular-nums ${
                    isIncome ? "text-sage" : "text-clay"
                  }`}
                >
                  {isIncome ? "+" : "−"}${trans.Amount.toLocaleString()}
                </TableCell>
                {showActions && (
                  <TableCell className="py-3.5">
                    <div className="flex justify-end gap-2">
                      {onEdit && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="cursor-pointer text-ink/60 hover:text-ink"
                          onClick={() => onEdit(trans)}
                        >
                          Edit
                        </Button>
                      )}
                      {onDelete && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="cursor-pointer text-clay hover:bg-clay-soft hover:text-clay"
                          onClick={() => onDelete(trans.id)}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
