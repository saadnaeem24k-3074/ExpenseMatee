import { useEffect, useState } from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { TrendingUpDown } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { api } from "@/lib/api"

const chartConfig = {
  income: { label: "Income", color: "#2F6F52" },
  expense: { label: "Expense", color: "#A23E3E" },
} satisfies ChartConfig

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

export function TrendChart() {
  const [data, setData] = useState<{ month: string; income: number; expense: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.analytics.trend(6)
      .then(({ trend }) => {
        setData(trend.map((t) => {
          const [, m] = t.month.split("-")
          return { month: MONTH_SHORT[Number(m) - 1], income: t.income, expense: t.expense }
        }))
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <Card className="my-poppins rounded-xl border border-ink/10 bg-white shadow-none">
      <CardHeader className="flex flex-row items-center gap-3 pb-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-canvas">
          <TrendingUpDown className="h-4 w-4 text-ink" />
        </div>
        <div>
          <CardTitle className="my-display text-lg font-semibold text-ink">6-month trend</CardTitle>
          <CardDescription className="text-ink/50">Income vs expense by month</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="py-10 text-center text-sm text-ink/50">Loading trend...</p>
        ) : (
          <ChartContainer config={chartConfig} className="h-[260px] w-full">
            <BarChart accessibilityLayer data={data}>
              <CartesianGrid vertical={false} stroke="#10182610" />
              <XAxis
                dataKey="month"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                tick={{ fill: "#101826", fontWeight: 500 }}
              />
              <YAxis hide />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="income" fill="var(--color-income)" radius={4} />
              <Bar dataKey="expense" fill="var(--color-expense)" radius={4} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
