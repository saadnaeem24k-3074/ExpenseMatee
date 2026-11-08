import type { ITransactionsRepository } from "../repositories/transactionsRepository.js";
import { TransactionsRepository } from "../repositories/transactionsRepository.js";
import { parseCsv, toCsv } from "../utils/csv.js";
import { ValidationError, NotFoundError } from "../errors/appError.js";
import type {
  Transaction,
  CreateTransactionInput,
  UpdateTransactionInput,
  ValidImportRow,
  CsvImportError,
  CsvImportResult,
  TransactionType,
} from "../types/transaction.js";

const DEFAULT_CURRENCY = "PKR";
const CSV_HEADERS = ["amount", "description", "category", "date", "type", "currency"];

export class TransactionsService {
  constructor(
    private readonly repo: ITransactionsRepository = new TransactionsRepository()
  ) {}

  async listTransactions(userId: string): Promise<Transaction[]> {
    return this.repo.findAllByUser(userId);
  }

  async getTransactionById(id: string, userId: string): Promise<Transaction> {
    const transaction = await this.repo.findById(id, userId);
    if (!transaction) {
      throw new NotFoundError("Transaction not found.");
    }
    return transaction;
  }

  async createTransaction(
    userId: string,
    input: CreateTransactionInput
  ): Promise<Transaction> {
    const { amount, description, category, date, type, currency } = input ?? {};

    if (amount == null || !category || !date || !type) {
      throw new ValidationError("amount, category, date, and type are required.");
    }

    const numAmount = Number(amount);
    if (Number.isNaN(numAmount) || numAmount <= 0) {
      throw new ValidationError("amount must be a positive number.");
    }

    const strType = String(type);
    if (strType !== "Income" && strType !== "Expense") {
      throw new ValidationError("type must be 'Income' or 'Expense'.");
    }

    return this.repo.insert({
      userId,
      amount: numAmount,
      description: typeof description === "string" ? description : "",
      category: String(category),
      date: String(date),
      type: strType as TransactionType,
      currency: typeof currency === "string" && currency.trim() !== "" ? currency : DEFAULT_CURRENCY,
    });
  }

  async updateTransaction(
    id: string,
    userId: string,
    input: UpdateTransactionInput
  ): Promise<Transaction> {
    const { amount, description, category, date, type, currency } = input ?? {};

    if (amount == null || !category || !date || !type) {
      throw new ValidationError("amount, category, date, and type are required.");
    }

    const numAmount = Number(amount);
    if (Number.isNaN(numAmount) || numAmount <= 0) {
      throw new ValidationError("amount must be a positive number.");
    }

    const strType = String(type);
    if (strType !== "Income" && strType !== "Expense") {
      throw new ValidationError("type must be 'Income' or 'Expense'.");
    }

    const updated = await this.repo.update(id, userId, {
      amount: numAmount,
      description: typeof description === "string" ? description : "",
      category: String(category),
      date: String(date),
      type: strType as TransactionType,
      currency: typeof currency === "string" && currency.trim() !== "" ? currency : DEFAULT_CURRENCY,
    });

    if (!updated) {
      throw new NotFoundError("Transaction not found.");
    }

    return updated;
  }

  async deleteTransaction(id: string, userId: string): Promise<void> {
    const deleted = await this.repo.deleteById(id, userId);
    if (!deleted) {
      throw new NotFoundError("Transaction not found.");
    }
  }

  async exportTransactionsCsv(userId: string): Promise<string> {
    const transactions = await this.repo.findExportByUser(userId);

    const rows = transactions.map((t) => [
      Number(t.amount),
      t.description ?? "",
      t.category,
      new Date(t.date).toISOString().slice(0, 10),
      t.type,
      t.currency,
    ]);

    return toCsv(CSV_HEADERS, rows);
  }

  async importTransactionsCsv(
    userId: string,
    csvText?: string
  ): Promise<CsvImportResult> {
    if (typeof csvText !== "string" || csvText.trim() === "") {
      throw new ValidationError("csv text is required.");
    }

    const rows = parseCsv(csvText);
    if (rows.length === 0) {
      throw new ValidationError("No data rows found in the CSV.");
    }

    const errors: CsvImportError[] = [];
    const valid: ValidImportRow[] = [];

    rows.forEach((r, idx) => {
      const rowNum = idx + 2;
      const amount = Number(r.amount);
      const category = r.category;
      const date = r.date;
      const type = r.type;
      const currency = r.currency || DEFAULT_CURRENCY;

      if (!r.amount || Number.isNaN(amount) || amount < 0) {
        errors.push({ row: rowNum, message: "amount must be a positive number." });
        return;
      }
      if (!category) {
        errors.push({ row: rowNum, message: "category is required." });
        return;
      }
      if (!date || Number.isNaN(new Date(date).getTime())) {
        errors.push({ row: rowNum, message: "date is missing or invalid (use YYYY-MM-DD)." });
        return;
      }
      if (type !== "Income" && type !== "Expense") {
        errors.push({ row: rowNum, message: "type must be 'Income' or 'Expense'." });
        return;
      }

      valid.push({
        amount,
        description: r.description ?? "",
        category,
        date,
        type: type as TransactionType,
        currency,
      });
    });

    let imported = 0;
    if (valid.length > 0) {
      imported = await this.repo.bulkInsert(userId, valid);
    }

    return { imported, errors, totalRows: rows.length };
  }
}
