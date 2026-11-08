import { describe, it, expect, beforeEach } from "vitest";
import { AnalyticsService } from "./analyticsService.js";
import type { IAnalyticsRepository } from "../repositories/analyticsRepository.js";
import type {
  CategoryBreakdownRow,
  MonthlyTrendRow,
} from "../types/analytics.js";

class FakeAnalyticsRepository implements IAnalyticsRepository {
  public breakdownData: Map<string, CategoryBreakdownRow[]> = new Map();
  public trendData: MonthlyTrendRow[] = [];
  public lastRequestedMonths: number | null = null;

  async getCategoryBreakdown(
    userId: string,
    month: number,
    year: number
  ): Promise<CategoryBreakdownRow[]> {
    return this.breakdownData.get(`${userId}:${month}:${year}`) ?? [];
  }

  async getMonthlyTrend(
    _userId: string,
    months: number
  ): Promise<MonthlyTrendRow[]> {
    this.lastRequestedMonths = months;
    if (this.trendData.length > 0) {
      return this.trendData.slice(0, months);
    }
    // Default zero-filled trend
    return Array.from({ length: months }, (_, i) => ({
      month: `2026-0${i + 1}`,
      income: 0,
      expense: 0,
    }));
  }
}

describe("AnalyticsService", () => {
  let fakeRepo: FakeAnalyticsRepository;
  let service: AnalyticsService;
  const userId = "user-123";

  beforeEach(() => {
    fakeRepo = new FakeAnalyticsRepository();
    service = new AnalyticsService(fakeRepo);
  });

  describe("getCategoryBreakdown", () => {
    it("returns empty list for month with no data", async () => {
      const result = await service.getCategoryBreakdown(userId, 5, 2026);
      expect(result.month).toBe(5);
      expect(result.year).toBe(2026);
      expect(result.categories).toEqual([]);
    });

    it("returns category breakdown matching requested month", async () => {
      fakeRepo.breakdownData.set(`${userId}:3:2026`, [
        { category: "Utilities", type: "Expense", total: 5000 },
        { category: "Shopping", type: "Expense", total: 2000 },
        { category: "Salary", type: "Income", total: 90000 },
      ]);

      const result = await service.getCategoryBreakdown(userId, 3, 2026);
      expect(result.categories).toHaveLength(3);
      expect(result.categories[0]).toEqual({
        category: "Utilities",
        type: "Expense",
        total: 5000,
      });
    });

    it("defaults to current month and year when omitted", async () => {
      const now = new Date();
      const result = await service.getCategoryBreakdown(userId);
      expect(result.month).toBe(now.getMonth() + 1);
      expect(result.year).toBe(now.getFullYear());
    });
  });

  describe("getTrend", () => {
    it("defaults to 6 months trend length", async () => {
      const result = await service.getTrend(userId);
      expect(result.trend).toHaveLength(6);
      expect(fakeRepo.lastRequestedMonths).toBe(6);
    });

    it("clamps months parameter between 1 and 24", async () => {
      await service.getTrend(userId, 0);
      expect(fakeRepo.lastRequestedMonths).toBe(6); // 0 defaults to 6

      await service.getTrend(userId, 100);
      expect(fakeRepo.lastRequestedMonths).toBe(24); // clamped to max 24

      await service.getTrend(userId, -5);
      expect(fakeRepo.lastRequestedMonths).toBe(6); // negative defaults to 6
    });

    it("accepts valid custom trend length", async () => {
      const result = await service.getTrend(userId, 12);
      expect(result.trend).toHaveLength(12);
      expect(fakeRepo.lastRequestedMonths).toBe(12);
    });
  });
});
