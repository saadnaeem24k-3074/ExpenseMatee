import type { Request, Response, NextFunction } from "express";
import { BudgetsService } from "../services/budgetsService.js";
import { AppError } from "../errors/appError.js";

export class BudgetsController {
  constructor(
    private readonly service: BudgetsService = new BudgetsService()
  ) {}

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const budgets = await this.service.getBudgets(
        req.session.userId!,
        req.query.month,
        req.query.year
      );
      res.json({ budgets });
    } catch (err) {
      this.handleError(err, res, next);
    }
  };

  upsert = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const budget = await this.service.upsertBudget(req.session.userId!, req.body);
      res.status(201).json({ budget });
    } catch (err) {
      this.handleError(err, res, next);
    }
  };

  remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.service.deleteBudget(req.params.id, req.session.userId!);
      res.status(204).send();
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

export const budgetsController = new BudgetsController();
