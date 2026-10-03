import { TransactionTable } from "@/components/TransactionTable"
import { useTransactions } from "@/lib/useTransactions"

const RecentTransactions = () => {
  const { transactions: transaction } = useTransactions()

  return (
    <div className="my-poppins">
      <TransactionTable transactions={[...transaction].reverse().slice(0, 5)} />
    </div>
  )
}

export default RecentTransactions
