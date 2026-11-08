import type { IBudgetsRepository } from "../repositories/budgetsRepository.js";
import { BudgetsRepository } from "../repositories/budgetsRepository.js";
import { computeBudgetStatus } from "../utils/budgetStatus.js";
import { ValidationError, NotFoundError } from "../errors/appError.js";
import type {
  Budget,
  BudgetWithSpending,
  UpsertBudgetInput,
} from "../types/budget.js";

const DEFAULT_CURRENCY = "PKR";

export class BudgetsService {
  constructor(
    private readonly repo: IBudgetsRepository = new BudgetsRepository()
  ) {}

  async getBudgets(
    userId: string,
    rawMonth?: unknown,
    rawYear?: unknown
  ): Promise<BudgetWithSpending[]> {
    const now = new Date();
    const month = Number(rawMonth) || now.getMonth() + 1;
    const year = Number(rawYear) || now.getFullYear();

    const rawBudgets = await this.repo.findByMonthAndYear(userId, month, year);

    return rawBudgets.map((row) => {
      const amount = Number(row.amount);
      const spent = Number(row.spent);
      const { percent, status } = computeBudgetStatus(amount, spent);
      return {
        id: row.id,
        category: row.category,
        month: row.month,
        year: row.year,
        amount,
        currency: row.currency,
        spent,
        percent,
        status,
      };
    });
  }

  async upsertBudget(
    userId: string,
    input: UpsertBudgetInput
  ): Promise<Budget> {
    const { category, month, year, amount, currency } = input ?? {};

    if (!category || !month || !year || amount == null) {
      throw new ValidationError("category, month, year, and amount are required.");
    }

    const numAmount = Number(amount);
    if (Number.isNaN(numAmount) || numAmount < 0) {
      throw new ValidationError("amount must be a positive number.");
    }

    const numMonth = Number(month);
    const numYear = Number(year);
    if (!Number.isInteger(numMonth) || numMonth < 1 || numMonth > 12) {
      throw new ValidationError("month must be an integer between 1 and 12.");
    }
    if (!Number.isInteger(numYear) || numYear < 1970 || numYear > 3000) {
      throw new ValidationError("year must be a valid four-digit year.");
    }

    return this.repo.upsert({
      userId,
      category: String(category),
      month: numMonth,
      year: numYear,
      amount: numAmount,
      currency: typeof currency === "string" && currency.trim() !== "" ? currency : DEFAULT_CURRENCY,
    });
  }

  async deleteBudget(id: string, userId: string): Promise<void> {
    const deleted = await this.repo.deleteById(id, userId);
    if (!deleted) {
      throw new NotFoundError("Budget not found.");
    }
  }
}
