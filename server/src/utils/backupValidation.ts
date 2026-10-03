export interface BackupTransaction {
  amount: number;
  description?: string;
  category: string;
  date: string;
  type: string;
  currency?: string;
}

export interface BackupBudget {
  category: string;
  month: number;
  year: number;
  amount: number;
  currency?: string;
}

export function isValidBackupTransaction(t: unknown): t is BackupTransaction {
  if (!t || typeof t !== "object") return false;
  const r = t as Record<string, unknown>;
  return r.amount != null && !!r.category && !!r.date && !!r.type;
}

export function isValidBackupBudget(b: unknown): b is BackupBudget {
  if (!b || typeof b !== "object") return false;
  const r = b as Record<string, unknown>;
  return r.amount != null && !!r.category && !!r.month && !!r.year;
}
