import Navbar from "./Navbar"
import { TransChart } from "./TransChart"
import RecentTransaction from "./RecentTransactions"
import { Button } from "@/components/ui/button"
import { StatCard } from "@/components/StatCard"
import { BalanceCard } from "@/components/BalanceCard"
import { BudgetAlert } from "@/components/BudgetAlert"
import { LayoutDashboard, Plus, TrendingUp, TrendingDown, Receipt } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useDashboardAnimations } from "@/lib/useDashboardAnimations"
import { useDashboardData } from "@/lib/useDashboardData"

const Dashboard = () => {
  useDashboardAnimations()
  const navigate = useNavigate()
  const { symbol, income, expense, balance, spentPct, alertBudgets } = useDashboardData()

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
              onClick={() => navigate("/addtransaction")}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Transaction</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>
        </div>

        <BalanceCard symbol={symbol} balance={balance} hasIncome={income > 0} spentPct={spentPct} />

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

        <BudgetAlert budgets={alertBudgets} onClick={() => navigate("/budget")} />
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
