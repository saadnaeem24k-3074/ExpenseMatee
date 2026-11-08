import type { BudgetStatus } from "../utils/budgetStatus.js";

export interface Budget {
  id: string;
  category: string;
  month: number;
  year: number;
  amount: number | string;
  currency: string;
}

export interface BudgetWithSpendingRaw {
  id: string;
  category: string;
  month: number;
  year: number;
  amount: number | string;
  currency: string;
  spent: number | string;
}

export interface BudgetWithSpending {
  id: string;
  category: string;
  month: number;
  year: number;
  amount: number;
  currency: string;
  spent: number;
  percent: number;
  status: BudgetStatus;
}

export interface UpsertBudgetInput {
  category?: unknown;
  month?: unknown;
  year?: unknown;
  amount?: unknown;
  currency?: unknown;
}

export interface UpsertBudgetData {
  userId: string;
  category: string;
  month: number;
  year: number;
  amount: number;
  currency: string;
}
