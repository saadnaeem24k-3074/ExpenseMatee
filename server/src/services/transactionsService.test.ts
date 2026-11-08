import { describe, it, expect, beforeEach } from "vitest";
import { TransactionsService } from "./transactionsService.js";
import type { ITransactionsRepository } from "../repositories/transactionsRepository.js";
import type {
  Transaction,
  TransactionExportRow,
  CreateTransactionData,
  ValidImportRow,
} from "../types/transaction.js";
import { ValidationError, NotFoundError } from "../errors/appError.js";

class FakeTransactionsRepository implements ITransactionsRepository {
  public items: (Transaction & { userId: string })[] = [];

  async findAllByUser(userId: string): Promise<Transaction[]> {
    return this.items.filter((t) => t.userId === userId);
  }

  async findExportByUser(userId: string): Promise<TransactionExportRow[]> {
    return this.items
      .filter((t) => t.userId === userId)
      .map((t) => ({
        amount: t.amount,
        description: t.description,
        category: t.category,
        date: t.date,
        type: t.type,
        currency: t.currency,
      }));
  }

  async findById(id: string, userId: string): Promise<Transaction | null> {
    const item = this.items.find((t) => t.id === id && t.userId === userId);
    return item ?? null;
  }

  async insert(data: CreateTransactionData): Promise<Transaction> {
    const newTx: Transaction & { userId: string } = {
      id: `tx_${this.items.length + 1}`,
      userId: data.userId,
      amount: data.amount,
      description: data.description,
      category: data.category,
      date: data.date,
      type: data.type,
      currency: data.currency,
      created_at: new Date().toISOString(),
    };
    this.items.push(newTx);
    return newTx;
  }

  async update(
    id: string,
    userId: string,
    data: Omit<CreateTransactionData, "userId">
  ): Promise<Transaction | null> {
    const idx = this.items.findIndex((t) => t.id === id && t.userId === userId);
    if (idx === -1) return null;
    const existing = this.items[idx];
    const updated: Transaction & { userId: string } = {
      ...existing,
      userId,
      amount: data.amount,
      description: data.description,
      category: data.category,
      date: data.date,
      type: data.type,
      currency: data.currency,
    };
    this.items[idx] = updated;
    return updated;
  }

  async deleteById(id: string, userId: string): Promise<boolean> {
    const idx = this.items.findIndex((t) => t.id === id && t.userId === userId);
    if (idx === -1) return false;
    this.items.splice(idx, 1);
    return true;
  }

  async bulkInsert(userId: string, rows: ValidImportRow[]): Promise<number> {
    for (const r of rows) {
      await this.insert({
        userId,
        amount: r.amount,
        description: r.description,
        category: r.category,
        date: r.date,
        type: r.type,
        currency: r.currency,
      });
    }
    return rows.length;
  }

  async findByUserAndDateRange(
    userId: string,
    _startDate: string,
    _endDate: string
  ): Promise<Transaction[]> {
    return this.items.filter((t) => t.userId === userId);
  }
}

describe("TransactionsService", () => {
  let fakeRepo: FakeTransactionsRepository;
  let service: TransactionsService;
  const userId = "user-123";

  beforeEach(() => {
    fakeRepo = new FakeTransactionsRepository();
    service = new TransactionsService(fakeRepo);
  });

  describe("createTransaction", () => {
    it("successfully creates a valid transaction and defaults currency to PKR", async () => {
      const tx = await service.createTransaction(userId, {
        amount: 2500,
        category: "Groceries",
        date: "2026-03-15",
        type: "Expense",
      });

      expect(tx.id).toBeDefined();
      expect(tx.amount).toBe(2500);
      expect(tx.category).toBe("Groceries");
      expect(tx.currency).toBe("PKR");
      expect(tx.description).toBe("");
    });

    it("throws ValidationError when required fields are missing", async () => {
      await expect(
        service.createTransaction(userId, { amount: 100 })
      ).rejects.toThrow(ValidationError);
      await expect(
        service.createTransaction(userId, { amount: 100 })
      ).rejects.toThrow("amount, category, date, and type are required.");
    });

    it("throws ValidationError when amount is not a positive number", async () => {
      await expect(
        service.createTransaction(userId, {
          amount: -50,
          category: "Food",
          date: "2026-03-15",
          type: "Expense",
        })
      ).rejects.toThrow("amount must be a positive number.");

      await expect(
        service.createTransaction(userId, {
          amount: 0,
          category: "Food",
          date: "2026-03-15",
          type: "Expense",
        })
      ).rejects.toThrow("amount must be a positive number.");
    });

    it("throws ValidationError when type is not Income or Expense", async () => {
      await expect(
        service.createTransaction(userId, {
          amount: 100,
          category: "Bonus",
          date: "2026-03-15",
          type: "Gift",
        })
      ).rejects.toThrow("type must be 'Income' or 'Expense'.");
    });
  });

  describe("listTransactions", () => {
    it("returns list of transactions filtered by userId", async () => {
      await service.createTransaction(userId, {
        amount: 1000,
        category: "Rent",
        date: "2026-03-01",
        type: "Expense",
      });
      await service.createTransaction("other-user", {
        amount: 5000,
        category: "Rent",
        date: "2026-03-01",
        type: "Expense",
      });

      const list = await service.listTransactions(userId);
      expect(list).toHaveLength(1);
      expect(list[0].amount).toBe(1000);
    });
  });

  describe("updateTransaction", () => {
    it("updates existing transaction successfully", async () => {
      const created = await service.createTransaction(userId, {
        amount: 1000,
        category: "Utilities",
        date: "2026-03-01",
        type: "Expense",
      });

      const updated = await service.updateTransaction(created.id, userId, {
        amount: 1200,
        category: "Bills",
        date: "2026-03-02",
        type: "Expense",
        currency: "USD",
      });

      expect(updated.amount).toBe(1200);
      expect(updated.category).toBe("Bills");
      expect(updated.currency).toBe("USD");
    });

    it("throws NotFoundError when transaction does not exist", async () => {
      await expect(
        service.updateTransaction("non-existent-id", userId, {
          amount: 500,
          category: "Food",
          date: "2026-03-01",
          type: "Expense",
        })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("deleteTransaction", () => {
    it("deletes existing transaction", async () => {
      const created = await service.createTransaction(userId, {
        amount: 1000,
        category: "Utilities",
        date: "2026-03-01",
        type: "Expense",
      });

      await service.deleteTransaction(created.id, userId);
      const list = await service.listTransactions(userId);
      expect(list).toHaveLength(0);
    });

    it("throws NotFoundError when deleting non-existent transaction", async () => {
      await expect(service.deleteTransaction("unknown-id", userId)).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe("exportTransactionsCsv", () => {
    it("generates CSV string with proper headers and data", async () => {
      await service.createTransaction(userId, {
        amount: 1500,
        description: "Dinner",
        category: "Food",
        date: "2026-03-10",
        type: "Expense",
        currency: "PKR",
      });

      const csv = await service.exportTransactionsCsv(userId);
      expect(csv).toContain("amount,description,category,date,type,currency");
      expect(csv).toContain("1500,Dinner,Food,2026-03-10,Expense,PKR");
    });
  });

  describe("importTransactionsCsv", () => {
    it("throws ValidationError for empty CSV", async () => {
      await expect(service.importTransactionsCsv(userId, "")).rejects.toThrow(
        "csv text is required."
      );
      await expect(service.importTransactionsCsv(userId, "header\n")).rejects.toThrow(
        "No data rows found in the CSV."
      );
    });

    it("imports valid rows, skips invalid ones, and reports errors with correct row numbers", async () => {
      const csv = [
        "amount,description,category,date,type,currency",
        "1000,Groceries,Food,2026-03-01,Expense,PKR",
        "-50,Invalid amount,Food,2026-03-01,Expense,PKR",
        "500,Missing category,,2026-03-01,Expense,PKR",
        "800,Bad date,Food,not-a-date,Expense,PKR",
        "300,Bad type,Food,2026-03-01,Donation,PKR",
        "2000,Salary,Income,2026-03-01,Income,PKR",
      ].join("\n");

      const result = await service.importTransactionsCsv(userId, csv);
      expect(result.totalRows).toBe(6);
      expect(result.imported).toBe(2);
      expect(result.errors).toHaveLength(4);
      expect(result.errors[0]).toEqual({
        row: 3,
        message: "amount must be a positive number.",
      });
      expect(result.errors[1]).toEqual({
        row: 4,
        message: "category is required.",
      });
      expect(result.errors[2]).toEqual({
        row: 5,
        message: "date is missing or invalid (use YYYY-MM-DD).",
      });
      expect(result.errors[3]).toEqual({
        row: 6,
        message: "type must be 'Income' or 'Expense'.",
      });
    });
  });
});
