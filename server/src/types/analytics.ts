export interface CategoryBreakdownRow {
  category: string;
  type: string;
  total: number;
}

export interface MonthlyTrendRow {
  month: string;
  income: number;
  expense: number;
}

export interface CategoryBreakdownResult {
  month: number;
  year: number;
  categories: CategoryBreakdownRow[];
}

export interface MonthlyTrendResult {
  trend: MonthlyTrendRow[];
}
