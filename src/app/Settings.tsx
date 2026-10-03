import { useEffect, useRef, useState } from "react"
import Navbar from "./Navbar"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Settings as SettingsIcon, Download, Upload, CloudUpload } from "lucide-react"
import { toast } from "sonner"
import { api, type Currency } from "@/lib/api"
import { ApiError, useAuth } from "@/lib/useAuth"
import { useTransactions } from "@/lib/useTransactions"
import { CloudBackupCard } from "@/components/CloudBackupCard"

const Settings = () => {
    const { user, updateBaseCurrency } = useAuth()
    const { refresh } = useTransactions()
    const [currencies, setCurrencies] = useState<Currency[]>([])
    const [selected, setSelected] = useState("PKR")
    const [saving, setSaving] = useState(false)
    const [exporting, setExporting] = useState(false)
    const [restoring, setRestoring] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        api.currencies.list().then(({ currencies }) => setCurrencies(currencies)).catch(() => setCurrencies([]))
    }, [])

    useEffect(() => {
        if (user?.base_currency) setSelected(user.base_currency)
    }, [user])

    async function handleSave() {
        setSaving(true)
        try {
            await updateBaseCurrency(selected)
            toast.success(`Base currency set to ${selected}. Dashboard and reports now show totals in ${selected}.`)
        } catch (err) {
            toast.error(err instanceof ApiError ? err.message : "Could not update currency.")
        } finally {
            setSaving(false)
        }
    }

    async function handleExportBackup() {
        setExporting(true)
        try {
            const blob = await api.backup.export()
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = 'expensemate-backup.json'
            a.click()
            URL.revokeObjectURL(url)
        } catch (err) {
            toast.error(err instanceof ApiError ? err.message : "Could not export backup.")
        } finally {
            setExporting(false)
        }
    }

    function handleRestoreClick() {
        fileInputRef.current?.click()
    }

    async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        e.target.value = ''
        if (!file) return

        setRestoring(true)
        try {
            const text = await file.text()
            const parsed = JSON.parse(text)
            const result = await api.backup.restore(parsed)
            await refresh()
            toast.success(`Restored ${result.restoredTransactions} transaction(s) and ${result.restoredBudgets} budget(s).`)
        } catch (err) {
            if (err instanceof SyntaxError) {
                toast.error("That file isn't valid JSON.")
            } else {
                toast.error(err instanceof ApiError ? err.message : "Could not restore backup.")
            }
        } finally {
            setRestoring(false)
        }
    }

    return (
        <div>
            <Navbar />
            <div className="my-poppins mx-auto max-w-2xl px-4 pt-10 pb-16 sm:px-6">
                <div className="mb-6 flex items-center gap-3">
                    <SettingsIcon className="h-7 w-7 text-ink" />
                    <h1 className="my-display text-2xl font-semibold text-ink sm:text-3xl">Settings</h1>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Base currency</CardTitle>
                        <CardDescription>
                            Dashboard totals, budgets, and reports are converted into this currency.
                            Individual transactions keep whatever currency they were entered in.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                            <Field className="flex-1">
                                <FieldLabel>Currency</FieldLabel>
                                <Select value={selected} onValueChange={setSelected}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            {currencies.map((c) => (
                                                <SelectItem key={c.code} value={c.code}>
                                                    {c.code} — {c.name}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </Field>

                            <Button
                                className="cursor-pointer bg-gold text-white hover:bg-gold/90"
                                onClick={handleSave}
                                disabled={saving || selected === user?.base_currency}
                            >
                                {saving ? "Saving..." : "Save"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle>Backup &amp; restore</CardTitle>
                        <CardDescription>
                            Download a full copy of your transactions and budgets as a JSON file — keep it
                            somewhere safe (upload it to your own cloud storage) and restore it any time.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="application/json"
                            className="hidden"
                            onChange={handleFileSelected}
                        />
                        <div className="flex flex-wrap gap-3">
                            <Button
                                variant="outline"
                                className="cursor-pointer gap-2"
                                onClick={handleExportBackup}
                                disabled={exporting}
                            >
                                <Download className="h-4 w-4" />
                                {exporting ? "Exporting..." : "Download backup"}
                            </Button>
                            <Button
                                variant="outline"
                                className="cursor-pointer gap-2"
                                onClick={handleRestoreClick}
                                disabled={restoring}
                            >
                                <Upload className="h-4 w-4" />
                                {restoring ? "Restoring..." : "Restore from file"}
                            </Button>
                        </div>
                        <p className="mt-3 flex items-start gap-2 text-xs text-ink/50">
                            <CloudUpload className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            Restoring adds to your existing data rather than replacing it, so it's safe to
                            restore an old backup without losing anything you've added since.
                        </p>
                    </CardContent>
                </Card>

                <CloudBackupCard onRestored={refresh} />
            </div>
        </div>
    )
}

export default Settings
