import { DollarSign } from "lucide-react"
import { Bar, BarChart, XAxis, YAxis } from "recharts"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart"
import { useTransactions } from "@/lib/useTransactions"
import { useAuth } from "@/lib/useAuth"
import { useCurrencies } from "@/lib/useCurrencies"
import { convertAmount, currencySymbol } from "@/lib/currency"

const CATEGORY_COLORS: Record<string, string> = {
  shopping: "#B8862F",
  entertainment: "#6C5CE7",
  utilities: "#3B7EA8",
  others: "#A23E3E",
}

export function TransChart() {

  const { transactions: transaction } = useTransactions()
  const { user } = useAuth()
  const currencies = useCurrencies()
  const baseCurrency = user?.base_currency ?? "PKR"
  const symbol = currencySymbol(baseCurrency, currencies)

  const categories = ["shopping", "entertainment", "utilities", "others"] as const

  const chartData = categories.map((cat) => ({
    browser: cat,
    visitors: transaction
      .filter((trans) => trans.type === "Expense" && trans.Category === cat)
      .reduce((acc, curr) => acc + convertAmount(curr.Amount, curr.Currency, baseCurrency, currencies), 0),
    fill: CATEGORY_COLORS[cat],
  }))

  const chartConfig = {
    visitors: { label: "Amount" },
    shopping: { label: "Shopping", color: CATEGORY_COLORS.shopping },
    entertainment: { label: "Entertainment", color: CATEGORY_COLORS.entertainment },
    utilities: { label: "Utilities", color: CATEGORY_COLORS.utilities },
    others: { label: "Others", color: CATEGORY_COLORS.others },
  } satisfies ChartConfig

  const total = chartData.reduce((acc, c) => acc + c.visitors, 0)
  const maxValue = Math.max(...chartData.map((c) => c.visitors), 1)
  const topCategory = chartData.reduce((max, c) => (c.visitors > max.visitors ? c : max), chartData[0])

  return (
    <Card className="my-poppins h-full rounded-xl border border-ink/10 bg-white shadow-none">
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-canvas text-ink">
          <DollarSign className="h-4 w-4" />
        </div>
        <CardTitle className="my-display text-lg font-semibold text-ink">Spending by category</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[260px] w-full">
          <BarChart
            accessibilityLayer
            data={chartData}
            layout="vertical"
            margin={{ left: 20 }}
          >
            <YAxis
              dataKey="browser"
              type="category"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) =>
                chartConfig[value as keyof typeof chartConfig]?.label
              }
            />
            <XAxis type="number" domain={[0, maxValue * 1.2]} hide />
            <ChartTooltip
              cursor={false}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-lg bg-ink px-3 py-2 shadow-lg">
                      <p className="text-sm font-medium text-white tabular-nums">
                        {chartConfig[payload[0].payload.browser as keyof typeof chartConfig]?.label}: {symbol}{Number(payload[0].value).toLocaleString()}
                      </p>
                    </div>
                  )
                }
                return null
              }}
            />
            <Bar dataKey="visitors" layout="vertical" radius={4} />
          </BarChart>
        </ChartContainer>
        <p className="mt-1 text-sm text-ink/50">
          {total > 0
            ? `${chartConfig[topCategory.browser as keyof typeof chartConfig]?.label} is your biggest category so far.`
            : "Add a few transactions to see your spending breakdown."}
        </p>
      </CardContent>
    </Card>
  )
}
