import { TrendingUp, TrendingDown } from "lucide-react"
import { Pie, PieChart } from "recharts"
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

interface CategorySlice {
  browser: string
  visitors: number
  fill: string
}

interface MonthlyCategoryProps {
  chartConfig: ChartConfig
  chartData: CategorySlice[]
}

const MonthlyCategory = ({ chartConfig, chartData }: MonthlyCategoryProps) => {

  const total = chartData.reduce((acc, curr) => acc + curr.visitors, 0)

  // Must come before anything reads chartData[0]: a month with no
  // transactions gives an empty array, and touching maxCategory.browser
  // on undefined used to crash the whole page to blank.
  if (chartData.length === 0 || total === 0) {
    return (
      <Card className="my-poppins flex h-full flex-col items-center justify-center rounded-xl border border-ink/10 bg-white py-10 shadow-none">
        <p className="text-sm text-ink/50">No transactions for this month yet.</p>
      </Card>
    )
  }

  const maxCategory = chartData.reduce((max, curr) => curr.visitors > max.visitors ? curr : max, chartData[0])
  const topShare = ((maxCategory.visitors / total) * 100).toFixed(1)
  const isIncomeCategory = maxCategory.browser === 'salary'

  return (
    <Card className="my-poppins flex flex-col rounded-xl border border-ink/10 bg-white shadow-none">
      <CardHeader className="items-center pb-0" />
      <CardContent className="flex-1 pb-2">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[220px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={chartData}
              dataKey="visitors"
              nameKey="browser"
              stroke="0"
            />
          </PieChart>
        </ChartContainer>
        <div className="mt-2 flex flex-col items-center gap-1 text-sm">
          <div className={`flex items-center gap-2 font-medium ${isIncomeCategory ? 'text-sage' : 'text-clay'}`}>
            {isIncomeCategory ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            {maxCategory.browser} makes up {topShare}%
          </div>
          <div className="text-ink/50">of this month's activity</div>
        </div>
      </CardContent>
    </Card>
  )
}

export default MonthlyCategory