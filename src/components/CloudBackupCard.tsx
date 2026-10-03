import { useEffect, useState } from "react"
import { Cloud, RotateCcw, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { api, type CloudBackup } from "@/lib/api"
import { ApiError } from "@/lib/useAuth"

interface CloudBackupCardProps {
  /** Called after a restore so the rest of the app can reload its data. */
  onRestored: () => unknown
}

export function CloudBackupCard({ onRestored }: CloudBackupCardProps) {
  const [backups, setBackups] = useState<CloudBackup[]>([])
  const [loading, setLoading] = useState(true)
  // "create" while a snapshot is being taken, or the id of the snapshot being restored/deleted.
  const [busy, setBusy] = useState<string | null>(null)

  async function reload() {
    const { backups } = await api.backup.cloud.list()
    setBackups(backups)
  }

  useEffect(() => {
    api.backup.cloud.list()
      .then(({ backups }) => setBackups(backups))
      .catch(() => setBackups([]))
      .finally(() => setLoading(false))
  }, [])

  // Runs one action while disabling the buttons, and reports errors as a toast.
  async function run(key: string, fallbackError: string, action: () => Promise<void>) {
    setBusy(key)
    try {
      await action()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : fallbackError)
    } finally {
      setBusy(null)
    }
  }

  const handleCreate = () =>
    run("create", "Could not create cloud backup.", async () => {
      await api.backup.cloud.create()
      await reload()
      toast.success("Cloud backup saved.")
    })

  const handleRestore = (id: string) =>
    run(id, "Could not restore cloud backup.", async () => {
      const result = await api.backup.cloud.restore(id)
      await onRestored()
      toast.success(`Restored ${result.restoredTransactions} transaction(s) and ${result.restoredBudgets} budget(s).`)
    })

  const handleDelete = (id: string) => {
    if (!window.confirm("Delete this cloud backup? This can't be undone.")) return Promise.resolve()
    return run(id, "Could not delete cloud backup.", async () => {
      await api.backup.cloud.remove(id)
      await reload()
    })
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Cloud backup</CardTitle>
        <CardDescription>
          Save a snapshot of your transactions and budgets to your account, so you can recover them
          without keeping a file. The 10 most recent snapshots are kept.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          variant="outline"
          className="cursor-pointer gap-2"
          onClick={handleCreate}
          disabled={busy !== null}
        >
          <Cloud className="h-4 w-4" />
          {busy === "create" ? "Saving..." : "Back up to cloud"}
        </Button>

        <div className="mt-4 flex flex-col gap-2">
          {loading && <p className="text-sm text-ink/50">Loading backups...</p>}
          {!loading && backups.length === 0 && (
            <p className="text-sm text-ink/50">No cloud backups yet.</p>
          )}
          {backups.map((b) => (
            <div
              key={b.id}
              className="flex flex-col gap-2 rounded-xl border border-ink/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="text-sm text-ink">
                <div className="font-medium">{new Date(b.created_at).toLocaleString()}</div>
                <div className="text-xs text-ink/50">
                  {b.transaction_count} transaction(s) · {b.budget_count} budget(s)
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer gap-1"
                  onClick={() => handleRestore(b.id)}
                  disabled={busy !== null}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {busy === b.id ? "Working..." : "Restore"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer gap-1 text-clay"
                  onClick={() => handleDelete(b.id)}
                  disabled={busy !== null}
                  aria-label="Delete cloud backup"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
