import { Wallet } from "lucide-react"

interface BalanceCardProps {
  symbol: string
  balance: number
  hasIncome: boolean
  spentPct: number
}

export function BalanceCard({ symbol, balance, hasIncome, spentPct }: BalanceCardProps) {
  return (
    <div className="balance mt-6 rounded-2xl bg-ink px-6 py-7 text-white sm:px-9 sm:py-9">
      <div className="flex items-center gap-2 text-sm font-medium text-white/70">
        <Wallet className="h-4 w-4 text-saffron" />
        Current balance
      </div>
      <div className="my-display mt-2 text-5xl font-semibold tabular-nums sm:text-6xl">
        {symbol}{balance.toLocaleString()}
      </div>
      <div className="mt-7">
        <div
          className="h-2 overflow-hidden rounded-full bg-white/15"
          role="img"
          aria-label={`Spent ${spentPct}% of income`}
        >
          <div className="h-full rounded-full bg-saffron" style={{ width: `${spentPct}%` }} />
        </div>
        <p className="mt-2 text-sm text-white/70">
          {hasIncome
            ? `You've spent ${spentPct}% of what you've earned.`
            : "Add your income to see how much of it you've spent."}
        </p>
      </div>
    </div>
  )
}
