"use client"

import { TrendingUp, TrendingDown, BarChart3 } from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis, Cell } from "recharts"

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
  type ChartConfig,
} from "@/components/ui/chart"
import { useMemo } from "react"

export function MonthlyTrack({ expense, income }: { expense: number, income: number }) {

  const chartData = useMemo(() => [
    { month: "Expense", amount: Number(expense), color: "#A23E3E" },
    { month: "Income", amount: Number(income), color: "#2F6F52" },
  ], [income, expense])

  const chartConfig = {
    amount: {
      label: "Amount",
      color: "#101826",
    },
  } satisfies ChartConfig

  const total = income + expense
  const trend = income > expense ? "up" : "down"
  const percentage = total > 0 ? Math.abs(((income - expense) / total) * 100).toFixed(1) : "0"

  return (
    <Card className="my-poppins rounded-xl border border-ink/10 bg-white shadow-none">
      <CardHeader className="flex flex-row items-center gap-3 pb-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-canvas">
          <BarChart3 className="h-4 w-4 text-ink" />
        </div>
        <div>
          <CardTitle className="my-display text-lg font-semibold text-ink">Income vs expense</CardTitle>
          <CardDescription className="text-ink/50">This month so far</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[260px] w-full">
          <BarChart accessibilityLayer data={chartData}>
            <CartesianGrid vertical={false} stroke="#10182610" />
            <XAxis
              dataKey="month"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tick={{ fill: '#101826', fontWeight: 500 }}
            />
            <ChartTooltip
              cursor={{ fill: '#10182608' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-lg bg-ink px-4 py-2 shadow-lg">
                      <p className="text-sm font-medium text-white tabular-nums">
                        {payload[0].payload.month}: ${payload[0].value?.toLocaleString()}
                      </p>
                    </div>
                  )
                }
                return null
              }}
            />
            <Bar dataKey="amount" radius={6}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
        {total > 0 && (
          <div className="mt-1 flex items-center gap-2 text-sm">
            <span className={`flex items-center gap-1 font-medium ${trend === 'up' ? 'text-sage' : 'text-clay'}`}>
              {trend === 'up' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {income > expense ? "Income exceeds expenses" : "Expenses exceed income"}
            </span>
            <span className="text-ink/40">by {percentage}%</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
