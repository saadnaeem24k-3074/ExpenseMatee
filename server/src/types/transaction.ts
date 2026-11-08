export type TransactionType = "Income" | "Expense";

export interface Transaction {
  id: string;
  amount: number | string;
  description: string | null;
  category: string;
  date: string | Date;
  type: TransactionType;
  currency: string;
  created_at?: string | Date;
}

export interface TransactionExportRow {
  amount: number | string;
  description: string | null;
  category: string;
  date: string | Date;
  type: TransactionType;
  currency: string;
}

export interface CreateTransactionInput {
  amount?: unknown;
  description?: unknown;
  category?: unknown;
  date?: unknown;
  type?: unknown;
  currency?: unknown;
}

export interface UpdateTransactionInput {
  amount?: unknown;
  description?: unknown;
  category?: unknown;
  date?: unknown;
  type?: unknown;
  currency?: unknown;
}

export interface CreateTransactionData {
  userId: string;
  amount: number;
  description: string;
  category: string;
  date: string;
  type: TransactionType;
  currency: string;
}

export interface ValidImportRow {
  amount: number;
  description: string;
  category: string;
  date: string;
  type: TransactionType;
  currency: string;
}

export interface CsvImportError {
  row: number;
  message: string;
}

export interface CsvImportResult {
  imported: number;
  errors: CsvImportError[];
  totalRows: number;
}
