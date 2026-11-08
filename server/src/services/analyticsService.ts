import type { IAnalyticsRepository } from "../repositories/analyticsRepository.js";
import { AnalyticsRepository } from "../repositories/analyticsRepository.js";
import type {
  CategoryBreakdownResult,
  MonthlyTrendResult,
} from "../types/analytics.js";

const DEFAULT_TREND_MONTHS = 6;
const MIN_TREND_MONTHS = 1;
const MAX_TREND_MONTHS = 24;

export class AnalyticsService {
  constructor(
    private readonly repo: IAnalyticsRepository = new AnalyticsRepository()
  ) {}

  async getCategoryBreakdown(
    userId: string,
    rawMonth?: unknown,
    rawYear?: unknown
  ): Promise<CategoryBreakdownResult> {
    const now = new Date();
    const month = Number(rawMonth) || now.getMonth() + 1;
    const year = Number(rawYear) || now.getFullYear();

    const categories = await this.repo.getCategoryBreakdown(userId, month, year);

    return {
      month,
      year,
      categories,
    };
  }

  async getTrend(
    userId: string,
    rawMonths?: unknown
  ): Promise<MonthlyTrendResult> {
    const parsed = Number(rawMonths);
    const months = Math.min(
      Math.max(Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_TREND_MONTHS, MIN_TREND_MONTHS),
      MAX_TREND_MONTHS
    );

    const trend = await this.repo.getMonthlyTrend(userId, months);

    return { trend };
  }
}
