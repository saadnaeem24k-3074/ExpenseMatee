import { Download, List, Upload } from "lucide-react"
import { useRef, useState } from "react"
import type { transactionn } from "@/lib/useTransactions"
import { useTransactions } from "@/lib/useTransactions"
import { TransactionTable } from "@/components/TransactionTable"
import Navbar from "./Navbar"
import { useNavigate } from "react-router-dom"
import { useGSAP } from "@gsap/react"
import gsap from 'gsap'
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { api, ApiError } from "@/lib/api"

const Transactions = () => {

  useGSAP(() => {
    gsap.from('.myTable', {
      y: 30,
      opacity: 0,
      delay: 1
    })
  })

  const navigate = useNavigate()
  const { transactions: transaction, removeTransaction, refresh } = useTransactions()
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function deleteTransaction(id: string) {
    try {
      await removeTransaction(id)
      toast.success("Transaction deleted")
    } catch {
      toast.error("Could not delete transaction")
    }
  }

  function handelEdit(trans: transactionn) {
    navigate('/addtransaction', { state: { editTrans: { ...trans } } })
  }

  async function handleExport() {
    try {
      const blob = await api.transactions.exportCsv()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'expensemate-transactions.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not export transactions.")
    }
  }

  function handleImportClick() {
    fileInputRef.current?.click()
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file later
    if (!file) return

    setImporting(true)
    try {
      const csv = await file.text()
      const result = await api.transactions.importCsv(csv)
      await refresh()

      if (result.imported > 0) {
        toast.success(`Imported ${result.imported} of ${result.totalRows} transactions.`)
      }
      if (result.errors.length > 0) {
        toast.error(`${result.errors.length} row(s) skipped — e.g. row ${result.errors[0].row}: ${result.errors[0].message}`)
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not import CSV.")
    } finally {
      setImporting(false)
    }
  }

  return (
    <>
      <Navbar />
      <div className="my-poppins mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="myTable mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <List className="h-6 w-6 text-ink" />
            <h1 className="my-display text-2xl font-semibold text-ink">Transactions</h1>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleFileSelected}
            />
            <Button
              variant="outline"
              className="cursor-pointer gap-2"
              onClick={handleImportClick}
              disabled={importing}
            >
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">{importing ? "Importing..." : "Import CSV"}</span>
            </Button>
            <Button
              variant="outline"
              className="cursor-pointer gap-2"
              onClick={handleExport}
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export CSV</span>
            </Button>
          </div>
        </div>

        <div className="myTable">
          <TransactionTable
            transactions={transaction}
            onEdit={handelEdit}
            onDelete={deleteTransaction}
          />
        </div>
      </div>
    </>
  )
}

export default Transactions
