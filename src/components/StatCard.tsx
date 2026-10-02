import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface StatCardProps {
  label: string
  amount: number
  icon: ReactNode
  tone: "neutral" | "sage" | "clay"
  className?: string
  currencySymbol?: string
}

const toneStyles = {
  neutral: {
    card: "bg-ink text-white",
    iconWrap: "bg-white/10",
    label: "text-white/60",
    amount: "text-white",
  },
  sage: {
    card: "bg-white border border-ink/10",
    iconWrap: "bg-sage-soft",
    label: "text-ink/50",
    amount: "text-sage",
  },
  clay: {
    card: "bg-white border border-ink/10",
    iconWrap: "bg-clay-soft",
    label: "text-ink/50",
    amount: "text-clay",
  },
}

export function StatCard({ label, amount, icon, tone, className, currencySymbol = "$" }: StatCardProps) {
  const styles = toneStyles[tone]
  return (
    <div className={cn("flex items-center gap-4 rounded-2xl px-6 py-5", styles.card, className)}>
      <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full", styles.iconWrap)}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className={cn("text-sm font-medium", styles.label)}>{label}</div>
        <div className={cn("my-display text-3xl font-semibold tabular-nums truncate", styles.amount)}>
          {currencySymbol}{amount.toLocaleString()}
        </div>
      </div>
    </div>
  )
}
