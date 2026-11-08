import { describe, it, expect, beforeEach } from "vitest";
import { BudgetsService } from "./budgetsService.js";
import type { IBudgetsRepository } from "../repositories/budgetsRepository.js";
import type {
  Budget,
  BudgetWithSpendingRaw,
  UpsertBudgetData,
} from "../types/budget.js";
import { NotFoundError } from "../errors/appError.js";

class FakeBudgetsRepository implements IBudgetsRepository {
  public budgets: (Budget & { userId: string })[] = [];
  public spendingMap: Map<string, number> = new Map(); // key: userId:category:month:year

  async findByMonthAndYear(
    userId: string,
    month: number,
    year: number
  ): Promise<BudgetWithSpendingRaw[]> {
    return this.budgets
      .filter((b) => b.userId === userId && b.month === month && b.year === year)
      .map((b) => {
        const spent = this.spendingMap.get(`${userId}:${b.category}:${month}:${year}`) ?? 0;
        return {
          id: b.id,
          category: b.category,
          month: b.month,
          year: b.year,
          amount: b.amount,
          currency: b.currency,
          spent,
        };
      });
  }

  async upsert(data: UpsertBudgetData): Promise<Budget> {
    const existingIdx = this.budgets.findIndex(
      (b) =>
        b.userId === data.userId &&
        b.category === data.category &&
        b.month === data.month &&
        b.year === data.year
    );

    if (existingIdx >= 0) {
      const updated: Budget & { userId: string } = {
        ...this.budgets[existingIdx],
        amount: data.amount,
        currency: data.currency,
      };
      this.budgets[existingIdx] = updated;
      return updated;
    }

    const created: Budget & { userId: string } = {
      id: `budget_${this.budgets.length + 1}`,
      userId: data.userId,
      category: data.category,
      month: data.month,
      year: data.year,
      amount: data.amount,
      currency: data.currency,
    };
    this.budgets.push(created);
    return created;
  }

  async deleteById(id: string, userId: string): Promise<boolean> {
    const idx = this.budgets.findIndex((b) => b.id === id && b.userId === userId);
    if (idx === -1) return false;
    this.budgets.splice(idx, 1);
    return true;
  }

  async findById(id: string, userId: string): Promise<Budget | null> {
    return this.budgets.find((b) => b.id === id && b.userId === userId) ?? null;
  }
}

describe("BudgetsService", () => {
  let fakeRepo: FakeBudgetsRepository;
  let service: BudgetsService;
  const userId = "user-123";

  beforeEach(() => {
    fakeRepo = new FakeBudgetsRepository();
    service = new BudgetsService(fakeRepo);
  });

  describe("getBudgets", () => {
    it("returns empty array when no budget is set for the month", async () => {
      const result = await service.getBudgets(userId, 3, 2026);
      expect(result).toEqual([]);
    });

    it("calculates 'ok' status when spending is under 80% threshold", async () => {
      await fakeRepo.upsert({
        userId,
        category: "Groceries",
        month: 3,
        year: 2026,
        amount: 10000,
        currency: "PKR",
      });
      fakeRepo.spendingMap.set(`${userId}:Groceries:3:2026`, 5000);

      const [b] = await service.getBudgets(userId, 3, 2026);
      expect(b.spent).toBe(5000);
      expect(b.percent).toBe(50);
      expect(b.status).toBe("ok");
    });

    it("calculates 'warning' status when spending is at or above 80% but under 100%", async () => {
      await fakeRepo.upsert({
        userId,
        category: "Entertainment",
        month: 3,
        year: 2026,
        amount: 1000,
        currency: "PKR",
      });
      fakeRepo.spendingMap.set(`${userId}:Entertainment:3:2026`, 850);

      const [b] = await service.getBudgets(userId, 3, 2026);
      expect(b.spent).toBe(850);
      expect(b.percent).toBe(85);
      expect(b.status).toBe("warning");
    });

    it("calculates 'exceeded' status when spending is exactly at 100% limit", async () => {
      await fakeRepo.upsert({
        userId,
        category: "Utilities",
        month: 3,
        year: 2026,
        amount: 2000,
        currency: "PKR",
      });
      fakeRepo.spendingMap.set(`${userId}:Utilities:3:2026`, 2000);

      const [b] = await service.getBudgets(userId, 3, 2026);
      expect(b.spent).toBe(2000);
      expect(b.percent).toBe(100);
      expect(b.status).toBe("exceeded");
    });

    it("calculates 'exceeded' status when spending exceeds limit (>100%)", async () => {
      await fakeRepo.upsert({
        userId,
        category: "Dining",
        month: 3,
        year: 2026,
        amount: 5000,
        currency: "PKR",
      });
      fakeRepo.spendingMap.set(`${userId}:Dining:3:2026`, 6500);

      const [b] = await service.getBudgets(userId, 3, 2026);
      expect(b.spent).toBe(6500);
      expect(b.percent).toBe(130);
      expect(b.status).toBe("exceeded");
    });

    it("correctly handles multiple categories in the same month", async () => {
      await fakeRepo.upsert({
        userId,
        category: "Groceries",
        month: 4,
        year: 2026,
        amount: 10000,
        currency: "PKR",
      });
      await fakeRepo.upsert({
        userId,
        category: "Rent",
        month: 4,
        year: 2026,
        amount: 30000,
        currency: "PKR",
      });

      fakeRepo.spendingMap.set(`${userId}:Groceries:4:2026`, 3000);
      fakeRepo.spendingMap.set(`${userId}:Rent:4:2026`, 30000);

      const results = await service.getBudgets(userId, 4, 2026);
      expect(results).toHaveLength(2);
      expect(results.find((r) => r.category === "Groceries")?.status).toBe("ok");
      expect(results.find((r) => r.category === "Rent")?.status).toBe("exceeded");
    });
  });

  describe("upsertBudget", () => {
    it("creates budget with valid input and defaults currency to PKR", async () => {
      const budget = await service.upsertBudget(userId, {
        category: "Education",
        month: 5,
        year: 2026,
        amount: 15000,
      });

      expect(budget.id).toBeDefined();
      expect(budget.category).toBe("Education");
      expect(budget.amount).toBe(15000);
      expect(budget.currency).toBe("PKR");
    });

    it("updates existing budget when same category and period are submitted", async () => {
      await service.upsertBudget(userId, {
        category: "Travel",
        month: 6,
        year: 2026,
        amount: 20000,
      });

      const updated = await service.upsertBudget(userId, {
        category: "Travel",
        month: 6,
        year: 2026,
        amount: 25000,
        currency: "USD",
      });

      expect(updated.amount).toBe(25000);
      expect(updated.currency).toBe("USD");
      expect(fakeRepo.budgets).toHaveLength(1);
    });

    it("throws ValidationError when required fields are missing", async () => {
      await expect(
        service.upsertBudget(userId, { category: "Food" })
      ).rejects.toThrow("category, month, year, and amount are required.");
    });

    it("throws ValidationError for negative amount", async () => {
      await expect(
        service.upsertBudget(userId, {
          category: "Food",
          month: 1,
          year: 2026,
          amount: -100,
        })
      ).rejects.toThrow("amount must be a positive number.");
    });

    it("throws ValidationError for invalid month", async () => {
      await expect(
        service.upsertBudget(userId, {
          category: "Food",
          month: 13,
          year: 2026,
          amount: 500,
        })
      ).rejects.toThrow("month must be an integer between 1 and 12.");
    });
  });

  describe("deleteBudget", () => {
    it("deletes existing budget", async () => {
      const created = await service.upsertBudget(userId, {
        category: "Bills",
        month: 3,
        year: 2026,
        amount: 4000,
      });

      await service.deleteBudget(created.id, userId);
      expect(fakeRepo.budgets).toHaveLength(0);
    });

    it("throws NotFoundError when budget does not exist", async () => {
      await expect(service.deleteBudget("unknown-id", userId)).rejects.toThrow(
        NotFoundError
      );
    });
  });
});
