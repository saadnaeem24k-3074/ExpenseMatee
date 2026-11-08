import type { Request, Response, NextFunction } from "express";
import { TransactionsService } from "../services/transactionsService.js";
import { AppError } from "../errors/appError.js";

export class TransactionsController {
  constructor(
    private readonly service: TransactionsService = new TransactionsService()
  ) {}

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const transactions = await this.service.listTransactions(req.session.userId!);
      res.json({ transactions });
    } catch (err) {
      this.handleError(err, res, next);
    }
  };

  exportCsv = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const csv = await this.service.exportTransactionsCsv(req.session.userId!);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="expensemate-transactions.csv"`);
      res.send(csv);
    } catch (err) {
      this.handleError(err, res, next);
    }
  };

  importCsv = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.importTransactionsCsv(req.session.userId!, req.body?.csv);
      res.json(result);
    } catch (err) {
      this.handleError(err, res, next);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const transaction = await this.service.createTransaction(req.session.userId!, req.body);
      res.status(201).json({ transaction });
    } catch (err) {
      this.handleError(err, res, next);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const transaction = await this.service.updateTransaction(
        req.params.id,
        req.session.userId!,
        req.body
      );
      res.json({ transaction });
    } catch (err) {
      this.handleError(err, res, next);
    }
  };

  remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.service.deleteTransaction(req.params.id, req.session.userId!);
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

export const transactionsController = new TransactionsController();
