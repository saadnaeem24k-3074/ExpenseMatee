import { TransactionTable } from "@/components/TransactionTable"
import { useTransactions } from "@/lib/useTransactions"
import { useAuth } from "@/lib/useAuth"
import { useCurrencies } from "@/lib/useCurrencies"

const RecentTransactions = () => {
  const { transactions: transaction } = useTransactions()
  const { user } = useAuth()
  const currencies = useCurrencies()

  return (
    <div className="my-poppins">
      <TransactionTable
        transactions={[...transaction].reverse().slice(0, 5)}
        baseCurrency={user?.base_currency ?? "PKR"}
        currencies={currencies}
      />
    </div>
  )
}

export default RecentTransactions
