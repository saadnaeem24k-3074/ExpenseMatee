import Navbar from "./Navbar"
import { useTransactions } from "@/lib/useTransactions"
import { Button } from "@/components/ui/button"
import { StatCard } from "@/components/StatCard"
import { TransChart } from "./TransChart"
import RecentTransaction from "./RecentTransactions"
import { LayoutDashboard, Plus, Wallet, TrendingUp, TrendingDown, Receipt, TriangleAlert } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useGSAP } from "@gsap/react"
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useEffect, useMemo, useState } from "react"
import { api, type Budget, type Currency } from "@/lib/api"
import { useAuth } from "@/lib/useAuth"
import { convertAmount, currencySymbol } from "@/lib/currency"

gsap.registerPlugin(ScrollTrigger);
const Dashboard = () => {
useGSAP(() => {
  const mm = gsap.matchMedia();

  const tl = gsap.timeline()

  tl.from('.dash , .but , .balance', {
    y: 30,
    opacity: 0,
    duration: 1,
    stagger: 0.3,
    ease: "power2.out"
  }, "+=0.3")

  tl.from('.income', {
    x: 30,
    opacity: 0,
    duration: 0.7,
    ease: "power2.out"
  })

  tl.from('.expense', {
    x: -30,
    opacity: 0,
    duration: 0.7,
    
    ease: "power2.out"
  }, "-=0.7")

  tl.from('.mychart', {
    y: 30,
    opacity: 0,
  })

  // DESKTOP
  mm.add("(min-width: 1024px)", () => {
    gsap.from('.myTable', {
      y: 30,
      opacity: 0,
      duration: 0.7,
      delay :1.2
    })
  })

  // MOBILE
  mm.add("(max-width: 1023px)", () => {
    gsap.from('.ourTable', {
      y: 30,
      opacity: 0,
      scrollTrigger: {
        trigger: ".tracking",
        start: "center 70%",
        end: "center 40%",
        scrub: 2,
      }
    })
  })

})

  const { transactions } = useTransactions()
  const navigate = useNavigate()
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
    api.currencies.list().then(({ currencies }) => setCurrencies(currencies)).catch(() => setCurrencies([]))
  }, [])

  const baseCurrency = user?.base_currency ?? "PKR"
  const symbol = currencySymbol(baseCurrency, currencies)

  // Every transaction can be in a different currency (Module 1), so totals
  // are converted into the user's base currency before summing — otherwise
  // a mix of PKR and USD entries would just be added together as raw numbers.
  const expense = useMemo(() => transactions
    .filter((trans) => trans.type === 'Expense')
    .reduce((acc, curr) => acc + convertAmount(curr.Amount, curr.Currency, baseCurrency, currencies), 0),
    [transactions, baseCurrency, currencies])

  const income = useMemo(() => transactions
    .filter((trans) => trans.type === 'Income')
    .reduce((acc, curr) => acc + convertAmount(curr.Amount, curr.Currency, baseCurrency, currencies), 0),
    [transactions, baseCurrency, currencies])

  const currentBalance = income - expense;
  const spentPct = income > 0 ? Math.min(100, Math.round((expense / income) * 100)) : 0;

  return (
    <div>
      <Navbar />

      <div className="my-poppins mx-auto max-w-5xl px-4 pt-10 pb-4 sm:px-6">
        <div className="dash flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="h-7 w-7 text-ink" />
            <h1 className="my-display text-2xl font-semibold text-ink sm:text-3xl">Dashboard</h1>
          </div>

          <div className="but">
            <Button
              className="cursor-pointer gap-2 bg-gold text-white hover:bg-gold/90"
              onClick={() => navigate('/addtransaction')}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Transaction</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>
        </div>

        <div className="balance mt-6 rounded-2xl bg-ink px-6 py-7 text-white sm:px-9 sm:py-9">
          <div className="flex items-center gap-2 text-sm font-medium text-white/70">
            <Wallet className="h-4 w-4 text-saffron" />
            Current balance
          </div>
          <div className="my-display mt-2 text-5xl font-semibold tabular-nums sm:text-6xl">
            {symbol}{currentBalance.toLocaleString()}
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
              {income > 0 ? `You've spent ${spentPct}% of what you've earned.` : "Add your income to see how much of it you've spent."}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard
            label="Income"
            amount={income}
            tone="sage"
            className="income"
            currencySymbol={symbol}
            icon={<TrendingUp className="h-5 w-5 text-sage" />}
          />
          <StatCard
            label="Expense"
            amount={expense}
            tone="clay"
            className="expense"
            currencySymbol={symbol}
            icon={<TrendingDown className="h-5 w-5 text-clay" />}
          />
        </div>

        {alertBudgets.length > 0 && (
          <div
            className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-clay/30 bg-clay/10 px-4 py-3"
            onClick={() => navigate('/budget')}
          >
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-clay" />
            <div className="text-sm text-ink">
              <span className="font-semibold">Budget alert:</span>{" "}
              {alertBudgets.map((b) => `${b.category} at ${b.percent}%`).join(", ")}.{" "}
              <span className="underline">View budgets</span>
            </div>
          </div>
        )}
      </div>

      <div className="tracking mx-auto mb-10 flex max-w-5xl flex-col gap-6 px-4 sm:px-6 lg:flex-row">
        <div className="mychart w-full lg:w-1/2">
          <TransChart />
        </div>
        <div className="ourTable myTable w-full lg:w-1/2">
          <div className="mb-3 flex items-center gap-2">
            <Receipt className="h-5 w-5 text-ink" />
            <h2 className="my-display text-lg font-semibold text-ink">Recent transactions</h2>
          </div>
          <RecentTransaction />
        </div>
      </div>
    </div>
  )
}

export default Dashboard