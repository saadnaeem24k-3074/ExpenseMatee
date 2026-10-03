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

function toView(t: Transaction): transactionn {
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

function toPayload(t: Omit<transactionn, "id">) {
    return {
        amount: t.Amount,
        description: t.Description,
        category: t.Category,
        date: t.Date.toISOString().slice(0, 10),
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
