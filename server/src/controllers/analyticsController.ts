import type { Request, Response, NextFunction } from "express";
import { AnalyticsService } from "../services/analyticsService.js";
import { AppError } from "../errors/appError.js";

export class AnalyticsController {
  constructor(
    private readonly service: AnalyticsService = new AnalyticsService()
  ) {}

  getCategoryBreakdown = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getCategoryBreakdown(
        req.session.userId!,
        req.query.month,
        req.query.year
      );
      res.json(result);
    } catch (err) {
      this.handleError(err, res, next);
    }
  };

  getTrend = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getTrend(
        req.session.userId!,
        req.query.months
      );
      res.json(result);
    } catch (err) {
      this.handleError(err, res, next);
    }
  };

  private handleError(err: unknown, res: Response, next: NextFunction): void {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    next(err);
  }
}

export const analyticsController = new AnalyticsController();
