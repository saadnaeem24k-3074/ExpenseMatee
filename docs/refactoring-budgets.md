# Refactoring Budgets and Analytics: Layered Architecture Report

This report documents the architectural refactoring of the Budgets and Analytics / Monthly Budget Summary features (Commit 4 of 6) into the **Controller -> Service -> Repository -> Database** pattern.

---

## 1. Test Execution Verification

All tests (58 unit tests and 31 integration tests) pass cleanly.

### A. Backend Unit Tests
Command: `npm run test:unit`
```
 ✓ src/services/analyticsService.test.ts (6 tests) 29ms
 ✓ src/services/budgetsService.test.ts (13 tests) 38ms
 ✓ src/services/transactionsService.test.ts (12 tests) 49ms
 ✓ src/utils/backupValidation.test.ts (9 tests) 20ms
 ✓ src/utils/csv.test.ts (10 tests) 27ms
 ✓ src/utils/budgetStatus.test.ts (8 tests) 14ms

 Test Files  6 passed (6)
      Tests  58 passed (58)
   Start at  17:53:39
   Duration  1.79s
```

### B. Backend Integration Tests (Real PostgreSQL)
Command: `npx vitest run src/integration --fileParallelism=false`
```
 ✓ src/integration/api.integration.test.ts (23 tests) 18872ms
   ✓ IT-01  Auth + session + database (4)
   ✓ IT-02  Transactions + currencies + database (CRUD) (3)
   ✓ IT-03  Budgets + transactions + budget-status logic (5)
     ✓ moves a budget from ok to warning to exceeded as spending grows 727ms
     ✓ ignores income, other categories and other months when computing spend 691ms
     ✓ converts spending in another currency into the budget currency 655ms
     ✓ upserts instead of duplicating, and deletes 749ms
     ✓ rejects invalid budgets 700ms
   ✓ IT-04  Analytics + transactions (4)
     ✓ returns per-category totals for the requested month only 685ms
     ✓ returns an empty list (not an error) for a month with no data 617ms
     ✓ returns a zero-filled trend of the requested length, oldest first 655ms
     ✓ converts mixed currencies into the user's base currency 688ms
   ✓ IT-05  CSV import / export + database (4)
   ✓ IT-06  Backup export / restore + database (2)
   ✓ IT-07  Data isolation between users (1)
 ✓ src/integration/cloudBackup.integration.test.ts (8 tests) 7089ms
   ✓ IT-08 cloud backup: create and list (3)
   ✓ IT-09 cloud backup: restore (2)
   ✓ IT-10 cloud backup: delete (1)
   ✓ IT-11 cloud backup: retention (1)
   ✓ IT-12 cloud backup: user isolation (1)

 Test Files  2 passed (2)
      Tests  31 passed (31)
   Start at  17:54:54
   Duration  28.14s
```

---

## 2. End-to-End Trace: "Monthly Budget Summary"

The following trace details the end-to-end execution flow of requesting the monthly budget summary through all four architectural layers:

### Step 1: HTTP Client Request
- **Method & Route**: `GET /api/budgets?month=3&year=2026`
- **Headers**: `Cookie: connect.sid=...`
- **Caller**: Dashboard or Budget page (`src/lib/api.ts` via `fetchBudgets(month, year)`).

### Step 2: Router Layer
- **File**: `server/src/routes/budgets.ts`
- **Wiring**:
  ```typescript
  budgetsRouter.get("/", budgetsController.list);
  ```
- **Responsibility**: Authenticates request session via `requireAuth` middleware and invokes the controller method. Zero SQL, zero `pool` imports.

### Step 3: Controller Layer
- **File**: `server/src/controllers/budgetsController.ts`
- **Method**: `BudgetsController.list(req: Request, res: Response, next: NextFunction)`
- **Actions**:
  1. Extracts authenticated user ID: `req.session.userId`.
  2. Extracts query parameters: `req.query.month` and `req.query.year`.
  3. Invokes `this.service.getBudgets(userId, req.query.month, req.query.year)`.
  4. Returns HTTP `200 OK` with JSON response `{ budgets }`.
  5. Intercepts any `AppError` and returns appropriate HTTP status codes.

### Step 4: Service Layer
- **File**: `server/src/services/budgetsService.ts`
- **Method**: `BudgetsService.getBudgets(userId: string, rawMonth?: unknown, rawYear?: unknown)`
- **Actions**:
  1. Normalizes month and year (defaults to current date if not supplied).
  2. Calls `this.repo.findByMonthAndYear(userId, month, year)` to retrieve raw budget rows and converted spending totals.
  3. **Domain Calculations**:
     - For each budget row, extracts `amount = Number(row.amount)` and `spent = Number(row.spent)`.
     - Calls `computeBudgetStatus(amount, spent)` to determine:
       - `percent`: `Math.round((spent / amount) * 100)`
       - `status`: `"ok"` (spent < 80%), `"warning"` (80% <= spent < 100%), or `"exceeded"` (spent >= 100%).
     - Assembles and returns strongly-typed `BudgetWithSpending[]`.
  - **Decoupling**: The service contains no SQL and does not import `pg.Pool`, allowing 13 fast in-memory unit tests in `budgetsService.test.ts`.

### Step 5: Repository Layer
- **File**: `server/src/repositories/budgetsRepository.ts`
- **Method**: `BudgetsRepository.findByMonthAndYear(userId: string, month: number, year: number)`
- **Actions**:
  1. Formulates parameterized SQL querying budgets joined with transactions and currency exchange rates:
     ```sql
     SELECT
        b.id, b.category, b.month, b.year, b.amount, b.currency,
        COALESCE(SUM(
          ROUND(t.amount * COALESCE(tc.rate_to_base, 1) / COALESCE(bc.rate_to_base, 1), 2)
        ), 0) AS spent
      FROM budgets b
      LEFT JOIN currencies bc ON bc.code = b.currency
      LEFT JOIN transactions t
        ON t.user_id = b.user_id
        AND t.category = b.category
        AND t.type = 'Expense'
        AND EXTRACT(MONTH FROM t.date) = b.month
        AND EXTRACT(YEAR FROM t.date) = b.year
      LEFT JOIN currencies tc ON tc.code = t.currency
      WHERE b.user_id = $1 AND b.month = $2 AND b.year = $3
      GROUP BY b.id, bc.rate_to_base
      ORDER BY b.category
     ```
  2. Executes query via `this.pool.query(...)`.
  3. Returns raw database rows as `BudgetWithSpendingRaw[]` without applying business status calculations.

### Step 6: Database Tier
- **Database**: PostgreSQL
- **Execution**: Performs indexed joins across `budgets`, `transactions`, and `currencies` tables for user and period, aggregating total expenses converted to the budget currency.
