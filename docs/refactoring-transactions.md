# Refactoring Transactions: Layered Architecture Report

This report documents the architectural refactoring of the Transactions feature (Commit 3 of 6) into the **Controller -> Service -> Repository -> Database** pattern.

---

## 1. Test Execution Verification

All frontend tests, backend unit tests (including the new in-memory service unit tests), and full database integration tests pass completely.

### A. Backend Unit Tests
Command: `npm run test:unit`
```
 ✓ src/utils/backupValidation.test.ts (9 tests) 22ms
 ✓ src/utils/csv.test.ts (10 tests) 34ms
 ✓ src/utils/budgetStatus.test.ts (8 tests) 14ms
 ✓ src/services/transactionsService.test.ts (12 tests) 31ms

 Test Files  4 passed (4)
      Tests  39 passed (39)
   Start at  17:44:56
   Duration  2.47s
```

### B. Backend Integration Tests (Real PostgreSQL)
Command: `npx vitest run src/integration --fileParallelism=false`
```
 ✓ src/integration/api.integration.test.ts (23 tests) 22769ms
   ✓ IT-01  Auth + session + database (4)
   ✓ IT-02  Transactions + currencies + database (CRUD) (3)
     ✓ creates, lists, updates and deletes a transaction 952ms
     ✓ validates input 657ms
     ✓ serves the supported currency list 672ms
   ✓ IT-03  Budgets + transactions + budget-status logic (5)
   ✓ IT-04  Analytics + transactions (4)
   ✓ IT-05  CSV import / export + database (4)
     ✓ imports valid rows, reports invalid ones, and rolls nothing back 761ms
     ✓ rejects an empty or missing CSV 620ms
     ✓ exports CSV that contains the imported rows 648ms
     ✓ round-trips: export then import into a second account gives the same data 1559ms
   ✓ IT-06  Backup export / restore + database (2)
   ✓ IT-07  Data isolation between users (1)
 ✓ src/integration/cloudBackup.integration.test.ts (8 tests) 6869ms
   ✓ IT-08 cloud backup: create and list (3)
   ✓ IT-09 cloud backup: restore (2)
   ✓ IT-10 cloud backup: delete (1)
   ✓ IT-11 cloud backup: retention (1)
   ✓ IT-12 cloud backup: user isolation (1)

 Test Files  2 passed (2)
      Tests  31 passed (31)
   Start at  17:45:10
   Duration  33.35s
```

### C. Frontend Unit Tests
Command: `npm test`
```
 ✓ src/components/StatCard.test.tsx (2 tests)
 ✓ src/lib/api.test.ts (3 tests)
 ✓ src/lib/utils.test.ts (1 test)
 ✓ src/lib/useTransactions.test.ts (2 tests)
 ✓ src/lib/currency.test.ts (2 tests)
 ✓ src/components/TransactionTable.test.tsx (3 tests)
 ✓ src/app/MonthlyCategory.test.tsx (2 tests)

 Test Files  7 passed (7)
      Tests  15 passed (15)
   Duration  28.57s
```

---

## 2. End-to-End Trace: "Add Transaction"

The following trace details the execution flow of creating a new transaction through all architectural layers:

### Step 1: HTTP Client Request
- **Method & Route**: `POST /api/transactions`
- **Headers**: `Content-Type: application/json`, `Cookie: connect.sid=...`
- **Payload**:
  ```json
  {
    "amount": 2500,
    "description": "Weekly groceries",
    "category": "Food",
    "date": "2026-03-15",
    "type": "Expense",
    "currency": "PKR"
  }
  ```

### Step 2: Router Layer
- **File**: `server/src/routes/transactions.ts`
- **Wiring**:
  ```typescript
  transactionsRouter.post("/", transactionsController.create);
  ```
- **Responsibility**: Verifies session authentication using `requireAuth` middleware and delegates directly to `transactionsController.create`. Contains zero SQL, zero business logic, and zero `pool` imports.

### Step 3: Controller Layer
- **File**: `server/src/controllers/transactionsController.ts`
- **Method**: `TransactionsController.create(req: Request, res: Response, next: NextFunction)`
- **Actions**:
  1. Extracts authenticated user identifier: `req.session.userId`.
  2. Extracts request body: `req.body`.
  3. Invokes `this.service.createTransaction(req.session.userId, req.body)`.
  4. Upon success, sends HTTP `201 Created` with body `{ transaction: createdTransaction }`.
  5. Catches any `AppError` (such as `ValidationError`) and converts it to appropriate HTTP error status codes (e.g., 400).

### Step 4: Service Layer
- **File**: `server/src/services/transactionsService.ts`
- **Method**: `TransactionsService.createTransaction(userId: string, input: CreateTransactionInput)`
- **Actions**:
  1. **Validation**:
     - Ensures required fields (`amount`, `category`, `date`, `type`) are non-empty.
     - Validates `amount` is a finite positive number (`> 0`). Throws `ValidationError("amount must be a positive number.")` otherwise.
     - Validates `type` is strictly `"Income"` or `"Expense"`. Throws `ValidationError("type must be 'Income' or 'Expense'.")` otherwise.
  2. **Normalization**:
     - Normalizes `description` to empty string if undefined.
     - Sets default fallback currency to `"PKR"` if missing.
  3. **Repository Invocation**:
     - Calls `this.repo.insert({ userId, amount, description, category, date, type, currency })`.
  - **Independence**: The service imports neither `express` nor `pg.Pool`, making it fully unit-testable via dependency injection with `FakeTransactionsRepository`.

### Step 5: Repository Layer
- **File**: `server/src/repositories/transactionsRepository.ts`
- **Method**: `TransactionsRepository.insert(data: CreateTransactionData)`
- **Actions**:
  1. Formulates parameterized SQL:
     ```sql
     INSERT INTO transactions (user_id, amount, description, category, date, type, currency)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, amount, description, category, date, type, currency, created_at
     ```
  2. Executes query using `this.pool.query(...)`.
  3. Returns strongly-typed plain `Transaction` object.

### Step 6: Database Tier
- **Database**: PostgreSQL (table `transactions`)
- **Execution**: Inserts row with schema-generated UUID `id`, timestamp `created_at`, enforces foreign key constraint to `users(id)`, and validates `CHECK (amount > 0)`.
