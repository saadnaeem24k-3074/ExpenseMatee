const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include", // send/receive the session cookie
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(data.error ?? "Something went wrong.", res.status);
  }

  return data as T;
}

export interface User {
  id: string;
  name: string;
  email: string;
  base_currency: string;
}

export interface Transaction {
  id: string;
  amount: number;
  description: string;
  category: string;
  date: string; // ISO date string, e.g. "2026-09-08"
  type: "Income" | "Expense";
  currency: string;
  created_at: string;
}

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  rate_to_base: number;
}

export interface CategoryBreakdown {
  category: string;
  type: "Income" | "Expense";
  total: number;
}

export interface TrendPoint {
  month: string; // "YYYY-MM"
  income: number;
  expense: number;
}
export interface Budget {
  id: string;
  category: string;
  month: number;
  year: number;
  amount: number;
  currency: string;
  spent: number;
  percent: number;
  status: "ok" | "warning" | "exceeded";
}

export const api = {
  auth: {
    signup: (name: string, email: string, password: string) =>
      request<{ user: User }>("/auth/signup", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      }),
    login: (email: string, password: string) =>
      request<{ user: User }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    logout: () => request<void>("/auth/logout", { method: "POST" }),
    me: () => request<{ user: User }>("/auth/me"),
    updateCurrency: (base_currency: string) =>
      request<{ user: User }>("/auth/me", {
        method: "PUT",
        body: JSON.stringify({ base_currency }),
      }),
  },
  currencies: {
    list: () => request<{ currencies: Currency[] }>("/currencies"),
  },
  analytics: {
    categoryBreakdown: (month: number, year: number) =>
      request<{ month: number; year: number; categories: CategoryBreakdown[] }>(
        `/analytics/category-breakdown?month=${month}&year=${year}`
      ),
    trend: (months = 6) =>
      request<{ trend: TrendPoint[] }>(`/analytics/trend?months=${months}`),
  },
  backup: {
    export: async () => {
      const res = await fetch(`${API_BASE}/backup/export`, { credentials: "include" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new ApiError(data.error ?? "Could not export backup.", res.status);
      }
      return res.blob();
    },
    restore: (backup: unknown) =>
      request<{ restoredTransactions: number; restoredBudgets: number }>("/backup/restore", {
        method: "POST",
        body: JSON.stringify(backup),
      }),
  },
  budgets: {
    list: (month: number, year: number) =>
      request<{ budgets: Budget[] }>(`/budgets?month=${month}&year=${year}`),
    upsert: (data: { category: string; month: number; year: number; amount: number; currency?: string }) =>
      request<{ budget: Budget }>("/budgets", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    remove: (id: string) => request<void>(`/budgets/${id}`, { method: "DELETE" }),
  },
  transactions: {
    list: () => request<{ transactions: Transaction[] }>("/transactions"),
    create: (payload: Omit<Transaction, "id" | "created_at">) =>
      request<{ transaction: Transaction }>("/transactions", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    update: (id: string, payload: Omit<Transaction, "id" | "created_at">) =>
      request<{ transaction: Transaction }>(`/transactions/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    remove: (id: string) => request<void>(`/transactions/${id}`, { method: "DELETE" }),
    exportCsv: async () => {
      const res = await fetch(`${API_BASE}/transactions/export`, { credentials: "include" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new ApiError(data.error ?? "Could not export transactions.", res.status);
      }
      return res.blob();
    },
    importCsv: (csv: string) =>
      request<{ imported: number; errors: { row: number; message: string }[]; totalRows: number }>(
        "/transactions/import",
        { method: "POST", body: JSON.stringify({ csv }) }
      ),
  },
};
