import MonthlyCategory from "./MonthlyCategory"
import Navbar from "./Navbar"
import { StatCard } from "@/components/StatCard"
import { useState, useEffect, useMemo, useCallback } from "react"
import { useTransactions } from "@/lib/useTransactions"
import { MonthlyTrack } from "./MonthlyTrack"
import { TrendChart } from "./TrendChart"
import { FileText, Calendar, TrendingUp, TrendingDown, BarChart3, PieChart, ListOrdered } from "lucide-react"
import { useGSAP } from "@gsap/react"
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { api, type CategoryBreakdown, type Currency } from "@/lib/api"
import { useAuth } from "@/lib/useAuth"
import { convertAmount, currencySymbol } from "@/lib/currency"

gsap.registerPlugin(ScrollTrigger);

// A fixed color palette so the pie chart stays visually consistent even
// as categories are added/removed by the user over time.
const PALETTE = ["#2F6F52", "#B8862F", "#6C5CE7", "#3B7EA8", "#A23E3E", "#D97757", "#4F8A8B", "#8D6A9F"]

const Report = () => {

  const [date, setDate] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  })
  const [breakdown, setBreakdown] = useState<CategoryBreakdown[]>([])
  const [loadingBreakdown, setLoadingBreakdown] = useState(true)

  useGSAP(() => {
    const mm = gsap.matchMedia();
    const tl = gsap.timeline()

    tl.from('.report-header , .date-picker , .balance-cards', {
      y: 30,
      opacity: 0,
      duration: 1,
      stagger: 0.3,
      ease: "power2.out"
    }, "+=1.3")

    tl.from('.income-card', {
      x: 30,
      opacity: 0,
      duration: 0.7,
      ease: "power2.out"
    })

    tl.from('.expense-card', {
      x: -30,
      opacity: 0,
      duration: 0.7,
      ease: "power2.out"
    }, "-=0.7")

    tl.from('.category-chart', {
      y: 30,
      opacity: 0,
    })

    // DESKTOP
    mm.add("(min-width: 1024px)", () => {
      gsap.from('.trend-chart', {
        y: 30,
        opacity: 0,
        duration: 0.7,
        delay: 3.5
      })
    })

    // MOBILE
    mm.add("(max-width: 1023px)", () => {
      gsap.from('.trend-chart', {
        y: 30,
        opacity: 0,
        scrollTrigger: {
          trigger: ".charts-section",
          start: "center 70%",
          end: "center 40%",
          scrub: 2,
        }
      })
    })
  })

  const { transactions } = useTransactions()
  const { user } = useAuth()
  const [currencies, setCurrencies] = useState<Currency[]>([])
  const baseCurrency = user?.base_currency ?? "PKR"
  const symbol = currencySymbol(baseCurrency, currencies)

  useEffect(() => {
    api.currencies.list().then(({ currencies }) => setCurrencies(currencies)).catch(() => setCurrencies([]))
  }, [])

  // Income/expense totals for the header cards still come from the
  // already-loaded transactions (fast, no extra request needed), converted
  // into the user's base currency since entries can be in different currencies.
  // Purely derived from existing state, so useMemo (not an effect + setState).
  const { income, expense } = useMemo(() => {
    // Use local year/month, not toISOString(): in timezones ahead of UTC
    // (e.g. Pakistan) toISOString() shifts a transaction on the 1st back
    // into the previous month.
    const forMonth = transactions.filter((trans) => {
      const d = new Date(trans.Date)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` === date
    })
    const sum = (type: string) => forMonth
      .filter((trans) => trans.type === type)
      .reduce((acc, curr) => acc + convertAmount(curr.Amount, curr.Currency, baseCurrency, currencies), 0)

    return { income: sum('Income'), expense: sum('Expense') }
  }, [date, transactions, baseCurrency, currencies])

  // Category breakdown now comes from a real SQL aggregation on the
  // backend (GROUP BY category, type) instead of a hardcoded list of
  // 5 categories reduced on the client — works for any category the
  // user has used, not just the 5 originally hardcoded ones.
  const loadBreakdown = useCallback(async () => {
    const [year, month] = date ? date.split("-").map(Number) : [new Date().getFullYear(), new Date().getMonth() + 1]
    setLoadingBreakdown(true)
    try {
      const { categories } = await api.analytics.categoryBreakdown(month, year)
      setBreakdown(categories)
    } catch {
      setBreakdown([])
    } finally {
      setLoadingBreakdown(false)
    }
  }, [date])

  useEffect(() => {
    loadBreakdown()
  }, [loadBreakdown])

  const chartData = useMemo(
    () => breakdown.map((b, i) => ({
      browser: b.category,
      visitors: b.total,
      fill: PALETTE[i % PALETTE.length],
    })),
    [breakdown]
  )

  const chartConfig = useMemo(() => {
    const config: Record<string, { label: string; color?: string }> = {
      visitors: { label: "Amount" },
    }
    breakdown.forEach((b, i) => {
      config[b.category] = { label: b.category, color: PALETTE[i % PALETTE.length] }
    })
    return config
  }, [breakdown])

  const topCategories = useMemo(
    () => breakdown
      .filter((b) => b.type === "Expense")
      .sort((a, b) => b.total - a.total)
      .slice(0, 5),
    [breakdown]
  )
  const topCategoriesTotal = topCategories.reduce((acc, c) => acc + c.total, 0)

  function updateDate(e: React.ChangeEvent<HTMLInputElement>) {
    setDate(e.target.value)
  }

  return (
    <>
      <Navbar />
      <div className="my-poppins mx-auto max-w-5xl px-4 py-10 sm:px-6">

        {/* Header */}
        <div className="report-header flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-ink sm:h-7 sm:w-7" />
            <h1 className="my-display text-2xl font-semibold text-ink sm:text-3xl">Monthly report</h1>
          </div>

          <div className="date-picker flex items-center gap-2 rounded-lg border border-ink/10 bg-white px-4 py-2.5">
            <Calendar className="h-4 w-4 text-ink/50" />
            <input
              type="month"
              value={date}
              className="bg-transparent text-sm font-medium text-ink outline-none"
              onChange={updateDate}
            />
          </div>
        </div>

        {/* Income & Expense Cards */}
        <div className="balance-cards mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard
            label="Total income"
            amount={income}
            tone="sage"
            className="income-card"
            currencySymbol={symbol}
            icon={<TrendingUp className="h-5 w-5 text-sage" />}
          />
          <StatCard
            label="Total expense"
            amount={expense}
            tone="clay"
            className="expense-card"
            currencySymbol={symbol}
            icon={<TrendingDown className="h-5 w-5 text-clay" />}
          />
        </div>

        {/* Charts Section */}
        <div className="charts-section mt-6 flex flex-col gap-4 lg:flex-row">
          <div className="category-chart w-full lg:w-1/2">
            <div className="mb-3 flex items-center gap-2">
              <PieChart className="h-5 w-5 text-ink" />
              <h2 className="my-display text-lg font-semibold text-ink">Category breakdown</h2>
            </div>
            {loadingBreakdown ? (
              <p className="py-10 text-center text-sm text-ink/50">Loading...</p>
            ) : (
              <MonthlyCategory chartData={chartData} chartConfig={chartConfig} />
            )}
          </div>

          <div className="trend-chart w-full lg:w-1/2">
            <div className="mb-3 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-ink" />
              <h2 className="my-display text-lg font-semibold text-ink">Monthly trends</h2>
            </div>
            <MonthlyTrack income={income} expense={expense} />
          </div>
        </div>

        {/* 6-month trend + top categories */}
        <div className="mt-6 flex flex-col gap-4 lg:flex-row">
          <div className="w-full lg:w-1/2">
            <TrendChart />
          </div>

          <div className="w-full lg:w-1/2">
            <div className="mb-3 flex items-center gap-2">
              <ListOrdered className="h-5 w-5 text-ink" />
              <h2 className="my-display text-lg font-semibold text-ink">Top spending categories</h2>
            </div>
            <div className="rounded-xl border border-ink/10 bg-white p-4">
              {topCategories.length === 0 ? (
                <p className="py-6 text-center text-sm text-ink/50">No expenses for this month yet.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {topCategories.map((c) => {
                    const pct = topCategoriesTotal > 0 ? Math.round((c.total / topCategoriesTotal) * 100) : 0
                    return (
                      <li key={c.category}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="capitalize font-medium text-ink">{c.category}</span>
                          <span className="text-ink/60">{symbol}{c.total.toLocaleString()} ({pct}%)</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-black/5">
                          <div className="h-full rounded-full bg-clay" style={{ width: `${pct}%` }} />
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>

      </div>
    </>
  )
}

export default Report