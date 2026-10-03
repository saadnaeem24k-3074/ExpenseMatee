import { useCallback, useEffect, useState } from "react"
import { api, type Transaction } from "./api"

// View-model shape used throughout the UI (kept close to the original
// localStorage-era shape so components didn't need a full rewrite).
export interface transactionn {
    id: string
    Amount: number
    Description: string
    Category: string
    Date: Date
    type: string
    Currency: string
}

export function toView(t: Transaction): transactionn {
    return {
        id: t.id,
        Amount: Number(t.amount),
        Description: t.description,
        Category: t.category,
        Date: new Date(t.date),
        type: t.type,
        Currency: t.currency,
    }
}

// Format using the LOCAL calendar day. toISOString() converts to UTC first, which
// shifts a locally-picked date back a day in timezones ahead of UTC (e.g. Pakistan).
export function toDateString(d: Date): string {
    const month = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    return `${d.getFullYear()}-${month}-${day}`
}

export function toPayload(t: Omit<transactionn, "id">) {
    return {
        amount: t.Amount,
        description: t.Description,
        category: t.Category,
        date: toDateString(t.Date),
        type: t.type as "Income" | "Expense",
        currency: t.Currency,
    }
}

export function useTransactions() {
    const [transactions, setTransactions] = useState<transactionn[]>([])
    const [loading, setLoading] = useState(true)

    const refresh = useCallback(async () => {
        setLoading(true)
        try {
            const { transactions } = await api.transactions.list()
            setTransactions(transactions.map(toView))
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        refresh()
    }, [refresh])

    const addTransaction = useCallback(async (t: Omit<transactionn, "id">) => {
        const { transaction } = await api.transactions.create(toPayload(t))
        const view = toView(transaction)
        setTransactions((prev) => [view, ...prev])
        return view
    }, [])

    const updateTransaction = useCallback(async (id: string, t: Omit<transactionn, "id">) => {
        const { transaction } = await api.transactions.update(id, toPayload(t))
        const view = toView(transaction)
        setTransactions((prev) => prev.map((x) => (x.id === id ? view : x)))
        return view
    }, [])

    const removeTransaction = useCallback(async (id: string) => {
        await api.transactions.remove(id)
        setTransactions((prev) => prev.filter((x) => x.id !== id))
    }, [])

    return { transactions, loading, refresh, addTransaction, updateTransaction, removeTransaction }
}