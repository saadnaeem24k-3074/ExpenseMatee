import { useCallback, useEffect, useRef, useState } from "react"
import Navbar from "./Navbar"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { ChevronLeft, ChevronRight, PiggyBank, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { api, type Budget as BudgetRecord, type Currency } from "@/lib/api"
import { ApiError, useAuth } from "@/lib/useAuth"

// Same categories offered in AddTransaction.tsx, minus "salary" since
// budgets only make sense for expense categories.
const EXPENSE_CATEGORIES = ["shopping", "entertainment", "utilities", "others"]

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]

function statusStyles(status: BudgetRecord["status"]) {
    switch (status) {
        case "exceeded":
            return { bar: "bg-clay", badge: "bg-clay/10 text-clay" }
        case "warning":
            return { bar: "bg-gold", badge: "bg-gold/10 text-gold" }
        default:
            return { bar: "bg-sage", badge: "bg-sage/10 text-sage" }
    }
}

const Budget = () => {
    const { user } = useAuth()
    const now = new Date()
    const [month, setMonth] = useState(now.getMonth() + 1)
    const [year, setYear] = useState(now.getFullYear())
    const [budgets, setBudgets] = useState<BudgetRecord[]>([])
    const [currencies, setCurrencies] = useState<Currency[]>([])
    const [loading, setLoading] = useState(true)

    const [category, setCategory] = useState(EXPENSE_CATEGORIES[0])
    const [amount, setAmount] = useState(0)
    const [currency, setCurrency] = useState("PKR")
    const [saving, setSaving] = useState(false)

    const alreadyAlerted = useRef(new Set<string>())

    const loadBudgets = useCallback(async () => {
        setLoading(true)
        try {
            const { budgets } = await api.budgets.list(month, year)
            setBudgets(budgets)

            budgets.forEach((b) => {
                const key = `${b.id}-${b.status}`
                if (b.status !== "ok" && !alreadyAlerted.current.has(key)) {
                    alreadyAlerted.current.add(key)
                    toast[b.status === "exceeded" ? "error" : "warning"](
                        b.status === "exceeded"
                            ? `You've gone over your ${b.category} budget (${b.percent}%).`
                            : `Heads up: ${b.category} spending is at ${b.percent}% of budget.`
                    )
                }
            })
        } catch (err) {
            toast.error(err instanceof ApiError ? err.message : "Could not load budgets.")
        } finally {
            setLoading(false)
        }
    }, [month, year])

    useEffect(() => {
        api.currencies.list().then(({ currencies }) => setCurrencies(currencies)).catch(() => setCurrencies([]))
    }, [])

    useEffect(() => {
        if (user?.base_currency) setCurrency(user.base_currency)
    }, [user])

    useEffect(() => {
        loadBudgets()
    }, [loadBudgets])

    function shiftMonth(delta: number) {
        let m = month + delta
        let y = year
        if (m < 1) { m = 12; y -= 1 }
        if (m > 12) { m = 1; y += 1 }
        setMonth(m)
        setYear(y)
    }

    async function handleSave() {
        if (amount <= 0) {
            toast.error("Enter a budget amount greater than 0.")
            return
        }
        setSaving(true)
        try {
            await api.budgets.upsert({ category, month, year, amount, currency })
            toast.success(`Budget set for ${category}.`)
            setAmount(0)
            await loadBudgets()
        } catch (err) {
            toast.error(err instanceof ApiError ? err.message : "Could not save budget.")
        } finally {
            setSaving(false)
        }
    }

    async function handleDelete(id: string) {
        try {
            await api.budgets.remove(id)
            setBudgets((prev) => prev.filter((b) => b.id !== id))
        } catch (err) {
            toast.error(err instanceof ApiError ? err.message : "Could not delete budget.")
        }
    }

    return (
        <div>
            <Navbar />
            <div className="my-poppins mx-auto max-w-5xl px-4 pt-10 pb-16 sm:px-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <PiggyBank className="h-7 w-7 text-ink" />
                        <h1 className="my-display text-2xl font-semibold text-ink sm:text-3xl">Budgets</h1>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            className="rounded-lg p-2 hover:bg-black/5 cursor-pointer"
                            onClick={() => shiftMonth(-1)}
                            aria-label="Previous month"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <span className="min-w-[130px] text-center font-medium text-ink">
                            {MONTH_NAMES[month - 1]} {year}
                        </span>
                        <button
                            className="rounded-lg p-2 hover:bg-black/5 cursor-pointer"
                            onClick={() => shiftMonth(1)}
                            aria-label="Next month"
                        >
                            <ChevronRight className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle>Set a budget</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 sm:items-end">
                            <Field>
                                <FieldLabel>Category</FieldLabel>
                                <Select value={category} onValueChange={setCategory}>
                                    <SelectTrigger className="w-full capitalize">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            {EXPENSE_CATEGORIES.map((c) => (
                                                <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </Field>

                            <Field>
                                <FieldLabel>Amount</FieldLabel>
                                <Input
                                    type="number"
                                    placeholder="0.00"
                                    value={amount || ""}
                                    onChange={(e) => setAmount(Number(e.target.value))}
                                />
                            </Field>

                            <Field>
                                <FieldLabel>Currency</FieldLabel>
                                <Select value={currency} onValueChange={setCurrency}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            {(currencies.length ? currencies : [{ code: "PKR", name: "Pakistani Rupee", symbol: "Rs", rate_to_base: 1 }]).map((c) => (
                                                <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </Field>

                            <Button
                                className="cursor-pointer bg-gold text-white hover:bg-gold/90"
                                onClick={handleSave}
                                disabled={saving}
                            >
                                {saving ? "Saving..." : "Save budget"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {loading && <p className="text-sm text-ink/60">Loading budgets...</p>}

                    {!loading && budgets.length === 0 && (
                        <p className="text-sm text-ink/60">
                            No budgets set for {MONTH_NAMES[month - 1]} {year} yet. Add one above.
                        </p>
                    )}

                    {budgets.map((b) => {
                        const styles = statusStyles(b.status)
                        return (
                            <Card key={b.id}>
                                <CardContent className="flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                        <span className="capitalize font-medium text-ink">{b.category}</span>
                                        <div className="flex items-center gap-2">
                                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${styles.badge}`}>
                                                {b.percent}%
                                            </span>
                                            <button
                                                onClick={() => handleDelete(b.id)}
                                                className="text-ink/40 hover:text-clay cursor-pointer"
                                                aria-label="Delete budget"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="h-2 w-full overflow-hidden rounded-full bg-black/5">
                                        <div
                                            className={`h-full rounded-full ${styles.bar}`}
                                            style={{ width: `${Math.min(b.percent, 100)}%` }}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between text-sm text-ink/60">
                                        <span>{b.currency} {b.spent.toLocaleString()} spent</span>
                                        <span>of {b.currency} {b.amount.toLocaleString()}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

export default Budget
