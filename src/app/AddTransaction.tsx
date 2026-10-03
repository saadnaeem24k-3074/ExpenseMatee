import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import Navbar from "./Navbar"
import { useEffect, useState } from "react"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { format } from "date-fns"
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

import { useLocation } from "react-router-dom"
import { startTransition } from "react"
import { useGSAP } from "@gsap/react"
import gsap from 'gsap'
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useTransactions, type transactionn } from "@/lib/useTransactions"
import { ApiError, useAuth } from "@/lib/useAuth"
import { api, type Currency } from "@/lib/api"

const AddTransaction = () => {

    useGSAP(() => {
        gsap.from('.myCard', {
            y: 30,
            opacity: 0,
            delay: 1
        })
    })

    const { addTransaction: createTransaction, updateTransaction, removeTransaction } = useTransactions()
    const { user } = useAuth()
    const [date, setDate] = useState<Date | undefined>()
    const [amount, setAmount] = useState(0);
    const [description, setDescription] = useState<string>('');
    const [category, setCategory] = useState<string>('');
    const [type, setType] = useState<string>("Expense")
    const [currency, setCurrency] = useState<string>(() => user?.base_currency ?? 'PKR')
    const [currencies, setCurrencies] = useState<Currency[]>([])
    const [editId, setEditId] = useState<string | null>(null)
    const [submitting, setSubmitting] = useState(false)
    const location = useLocation()

    useEffect(() => {
        api.currencies.list()
            .then(({ currencies }) => setCurrencies(currencies))
            .catch(() => setCurrencies([]))
    }, [])

    useEffect(() => {
        const editTransaction: transactionn = location.state?.editTrans
        if (editTransaction) {
            startTransition(() => {
                setEditId(editTransaction.id)
                setDate(editTransaction.Date)
                setType(editTransaction.type)
                setAmount(editTransaction.Amount)
                setDescription(editTransaction.Description)
                setCategory(editTransaction.Category)
                setCurrency(editTransaction.Currency || 'PKR')
            })
        }
    }, [location.state])

    async function addTransaction(): Promise<string | null> {

        if (!amount || !date || !category) {
            return null;
        }
        const payload = {
            type: type,
            Date: date,
            Amount: amount,
            Category: category,
            Description: description,
            Currency: currency
        }

        try {
            let saved
            if (editId) {
                saved = await updateTransaction(editId, payload)
            } else {
                saved = await createTransaction(payload)
            }

            setAmount(0)
            setDescription('')
            setCategory('')
            setType('Expense')
            setDate(undefined)
            setEditId(null)
            setCurrency(user?.base_currency ?? 'PKR')

            return saved.id
        } catch (err) {
            const message = err instanceof ApiError ? err.message : "Could not save transaction."
            toast.error(message)
            return null
        }
    }

    async function undoTransaction(id: string) {
        try {
            await removeTransaction(id)
        } catch {
            toast.error("Could not undo — please delete it manually from Transactions.")
        }
    }


    return (
        <>
            <Navbar />
            <div className="myCard my-poppins mx-auto mt-12 max-w-lg px-4 sm:px-0">
                <Card className="w-full rounded-xl border border-ink/10 shadow-none">
                    <CardHeader>
                        <CardTitle className="my-display text-center text-2xl font-semibold text-ink">
                            {location.state ? 'Edit transaction' : 'Add a transaction'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>

                        <RadioGroup className="flex gap-2 rounded-lg border border-ink/10 bg-canvas/60 p-1">
                            <label
                                htmlFor="r1"
                                className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-colors ${type === 'Expense' ? 'bg-white text-ink shadow-sm' : 'text-ink/50'
                                    }`}
                            >
                                <RadioGroupItem value="Expense" id="r1" checked={type === 'Expense'} onClick={() => setType("Expense")} className="sr-only" />
                                Expense
                            </label>

                            <label
                                htmlFor="r2"
                                className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-colors ${type === 'Income' ? 'bg-white text-ink shadow-sm' : 'text-ink/50'
                                    }`}
                            >
                                <RadioGroupItem value="Income" id="r2" checked={type === 'Income'} onClick={() => setType("Income")} className="sr-only" />
                                Income
                            </label>
                        </RadioGroup>

                        <div className="flex flex-col mt-5 gap-4">
                            <Field>
                                <FieldLabel htmlFor="Amount">
                                    Amount <span className="text-destructive">*</span>
                                </FieldLabel>
                                <div className="flex gap-2">
                                    <Input id='Amount' name="Amount" placeholder="0.00" required type="number" value={amount || ''}
                                        onChange={(e) => { setAmount(Number(e.target.value)) }} className="flex-1" />
                                    <Select value={currency} onValueChange={(value: string) => setCurrency(value)}>
                                        <SelectTrigger className="w-24">
                                            <SelectValue placeholder="PKR" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                {(currencies.length ? currencies : [{ code: 'PKR', name: 'Pakistani Rupee', symbol: 'Rs', rate_to_base: 1 }]).map((c) => (
                                                    <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>
                                                ))}
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </Field>

                            <Field>
                                <FieldLabel>
                                    Category <span className="text-destructive">*</span>
                                </FieldLabel>
                                <Select value={category} onValueChange={(value: string) => { setCategory(value) }}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select a category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            <SelectItem value="salary">Salary</SelectItem>
                                            <SelectItem value="shopping">Shopping</SelectItem>
                                            <SelectItem value="entertainment">Entertainment</SelectItem>
                                            <SelectItem value="utilities">Utilities</SelectItem>
                                            <SelectItem value="others">Others</SelectItem>
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </Field>

                            <Field>
                                <FieldLabel htmlFor="Description">Description</FieldLabel>
                                <Input id='Description' name="Description" placeholder="What was this for?" type="text" value={description}
                                    onChange={(e) => setDescription(e.target.value)} />
                            </Field>

                            <Field>
                                <FieldLabel>
                                    Date <span className="text-destructive">*</span>
                                </FieldLabel>

                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className="w-full justify-start text-left font-normal"
                                        >
                                            {date ? format(date, "PPP") : "Pick a date"}
                                        </Button>
                                    </PopoverTrigger>

                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={date}
                                            onSelect={setDate}
                                            initialFocus
                                            required
                                        />
                                    </PopoverContent>
                                </Popover>
                            </Field>
                        </div>

                    </CardContent>
                    <CardFooter>

                        <Button className="w-full cursor-pointer bg-gold py-5 font-semibold text-white hover:bg-gold/90" disabled={submitting}
                            onClick={async () => {
                                setSubmitting(true)
                                const savedId = await addTransaction()
                                setSubmitting(false)
                                if (savedId) {
                                    toast.success("Transaction saved", {
                                        description: location.state ? "Your transaction was updated." : "Your transaction was recorded.",
                                        action: {
                                            label: "Undo",
                                            onClick: () => { undoTransaction(savedId) },
                                        },
                                    })
                                } else {
                                    toast.error("Fill in amount, category, and date to continue")
                                }
                            }}
                        >
                            {location.state ? 'Update transaction' : 'Add transaction'}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </>
    )
}

export default AddTransaction
