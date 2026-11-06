# Backend Code Review & Maintenance Problems

**Review Target**: `server/src` (Backend codebase, with cross-reference to relevant frontend complexity)  
**Date**: November 6, 2026  
**Baseline Commit**: `assignment-01-baseline` (`ecb83cd`)  
**Scope**: Architectural integrity, database coupling, code duplication, hard-coded constants, cyclomatic complexity, and testability.

---

## 1. Executive Summary

The ExpenseMate backend is currently structured as an Express.js application where route handlers act as a monolithic **"Transaction Script / Smart UI"** layer. There is **no separation of concerns**:
- Every route handler directly imports the PostgreSQL connection pool (`pool`) and issues raw SQL queries.
- Business rules (such as currency conversions, budget status computations, password hashing, date normalizations, and transaction management) are interwoven directly with HTTP request handling and response serialization.
- Code duplication exists across multiple route handlers for input validation, date extraction, and database insertion logic.
- Several core functions exceed acceptable cyclomatic complexity thresholds (threshold 8, observed up to 11).

---

## 2. Key Maintenance Problems by Category

### A. Direct Database Coupling in Route Handlers (`pool.query`)
**Problem**: The application lacks a Data Access Layer (DAL), repository, or service layer. Route files directly import `{ pool } from "../db/pool.js"` and write inline SQL statements.

| File | Direct `pool` Queries | Line References | Description |
| :--- | :---: | :--- | :--- |
| `server/src/routes/auth.ts` | 5 | Lines 20, 28, 48, 80, 105 | Direct SQL queries for user lookup, signup insert, login check, and currency update. |
| `server/src/routes/transactions.ts` | 9 | Lines 12, 22, 92 (`connect`), 96, 126, 145, 163 | Direct queries for transaction CRUD, CSV export/import, and manual client transaction management. |
| `server/src/routes/budgets.ts` | 3 | Lines 19, 61, 76 | Direct SQL for budget queries, joins with currencies, upserts, and deletions. |
| `server/src/routes/analytics.ts` | 2 | Lines 18, 50 | Heavy aggregation queries with joins across `transactions`, `users`, and `currencies`. |
| `server/src/routes/backup.ts` | 13 | Lines 21, 22, 27, 58, 72, 92 (`connect`), 129, 137, 151, 165, 183 | Complex snapshot queries, table wipes, and restores. |
| `server/src/routes/currencies.ts` | 1 | Line 11 | Direct table scan of currencies. |
| **Total** | **33** | | **Direct database queries across all 6 route modules.** |

**Impact**:
- Impossible to unit-test route logic in isolation without a live PostgreSQL instance.
- Schema changes require touching routing code across multiple files.
- Connection pooling and transaction handling leaks into the transport layer.

---

### B. Business Logic Inside Route Handlers
**Problem**: Domain logic is coupled directly to Express `req` and `res` objects.

- **Password Hashing & Session Management**:
  - `server/src/routes/auth.ts` (Lines 25, 35, 63): Hashing passwords with `bcrypt.hash(password, 12)` and setting `req.session.userId` directly inside route handlers rather than in an `AuthService`.
- **CSV Data Transformation & Validation**:
  - `server/src/routes/transactions.ts` (Lines 28–37, 62–88): Formatting rows for CSV export, parsing dates with `toISOString().slice(0, 10)`, and performing row-by-row data sanitization inside HTTP handlers.
- **Financial Aggregation & Currency Conversion**:
  - `server/src/routes/budgets.ts` (Lines 20–36) & `server/src/routes/analytics.ts` (Lines 19–30, 51–75): Dynamic SQL aggregation and cross-currency exchange rate conversions are executed entirely in route handler SQL statements.
- **Snapshot Building & Pruning**:
  - `server/src/routes/backup.ts` (Lines 19–41, 137–143): Building user backup payloads, counting child entities, and pruning old backups to maintain the retention window.

---

### C. Duplicated Code & Validation
**Problem**: Logic is copy-pasted across files rather than shared via reusable utilities or middleware.

1. **Date Parsing Duplication (Clones detected by `jscpd`)**:
   - `server/src/routes/analytics.ts` (Lines 14–17):
     ```typescript
     const now = new Date();
     const month = Number(req.query.month) || now.getMonth() + 1;
     const year = Number(req.query.year) || now.getFullYear();
     ```
   - `server/src/routes/budgets.ts` (Lines 15–18): Identical date parsing logic copy-pasted.
2. **Transaction Insertion Logic Duplication**:
   - `server/src/routes/transactions.ts` (Lines 97–100 & Lines 127–130) duplicates the exact same `INSERT INTO transactions` statement.
   - `server/src/routes/backup.ts` (Lines 58–62) duplicates the same transaction `INSERT` statement a third time during backup restore.
3. **Budget Upsert Logic Duplication**:
   - `server/src/routes/budgets.ts` (Lines 62–66):
     ```sql
     INSERT INTO budgets (user_id, category, month, year, amount, currency) ... ON CONFLICT DO UPDATE
     ```
   - `server/src/routes/backup.ts` (Lines 73–77): The exact same upsert query is copied into the backup restore logic.
4. **Validation Duplication & Discrepancies**:
   - `server/src/routes/transactions.ts` (Lines 119–124) and (Lines 141–144): POST `/` and PUT `/:id` check `amount == null || !category || !date || !type` separately.
   - `server/src/routes/transactions.ts` (Lines 70–85): The CSV import handler implements its own separate validation checks (`amount < 0`, `Date.getTime()` verification) which are missing or differently implemented in POST `/`.
5. **Authentication Check Duplication**:
   - `server/src/routes/auth.ts` (Line 72 and Line 102): Manual check `if (!req.session.userId)` repeated twice instead of applying the `requireAuth` middleware used by the other routes.

---

### D. Hard-Coded Values & Magic Literals
**Problem**: Magic numbers and strings are hard-coded across handlers without centralized configuration.

- **Default Currency `"PKR"`**:
  - `server/src/routes/auth.ts`: Line 26 (`req.body?.base_currency || "PKR"`)
  - `server/src/routes/transactions.ts`: Line 68, Line 130, Line 150 (`currency ?? "PKR"`)
  - `server/src/routes/budgets.ts`: Line 67 (`currency ?? "PKR"`)
  - `server/src/routes/backup.ts`: Line 61, Line 77 (`currency ?? "PKR"`)
- **Bcrypt Salt Rounds**:
  - `server/src/routes/auth.ts`: Line 25 (`bcrypt.hash(password, 12)` uses hard-coded 12 rounds).
- **Session Cookie Name**:
  - `server/src/routes/auth.ts`: Line 95 (`res.clearCookie("connect.sid")`).
- **File Names**:
  - `server/src/routes/transactions.ts`: Line 41 (`expensemate-transactions.csv`).
  - `server/src/routes/backup.ts`: Line 49 (`expensemate-backup.json`).
- **Backup Retention & Constraints**:
  - `server/src/routes/backup.ts`: Line 12 (`MAX_CLOUD_BACKUPS = 10`), Line 13 (UUID regex pattern).
- **Analytics Clamping**:
  - `server/src/routes/analytics.ts`: Line 48 (`Math.min(Math.max(Number(req.query.months) || 6, 1), 24)`).

---

### E. High Cyclomatic Complexity Functions (Exceeding Threshold 8)
As reported by ESLint complexity checks (`complexity: ["warn", 8]`):

| File | Line Reference | Symbol / Function | Cyclomatic Complexity | Problem |
| :--- | :---: | :--- | :---: | :--- |
| `server/src/routes/auth.ts` | Line 8:45 | `POST /signup` handler | **10** | Nested validation, conditional email trimming, DB query, bcrypt hashing, and session assignment. |
| `server/src/routes/transactions.ts` | Line 62:25 | `rows.forEach` (CSV row validator) | **11** | Dense nested branching checking amount, category, date validity, and transaction type. |
| `server/src/routes/transactions.ts` | Line 116:47 | `POST /` (create transaction) | **9** | Multiple condition guards and fallback checks. |
| `server/src/routes/transactions.ts` | Line 137:49 | `PUT /:id` (update transaction) | **9** | Redundant guards, parameter extraction, and status checks. |
| `server/src/utils/csv.ts` | Line 22:8 | `parseCsv` | **11** | Custom state machine parser with loop lookaheads and nested quote flags. |
| `src/app/AddTransaction.tsx` *(Frontend)* | Line 83:5 | `addTransaction` | **9** | Mixed UI state handling, edit vs create condition branching, and payload generation. |

---

## 3. Recommendations for Assignment 02 Architecture

1. **Extract Repository Layer**: Introduce repositories (e.g. `UserRepository`, `TransactionRepository`, `BudgetRepository`, `BackupRepository`) to encapsulate all SQL queries and decouple Express routes from `pg.Pool`.
2. **Introduce Service Layer**: Move business logic (currency conversion calculations, snapshot generation, CSV parsing, password hashing) into dedicated service classes.
3. **Centralize Validation**: Use a unified validation schema (e.g. Zod or custom validator functions) to validate transaction and budget inputs across standard endpoints, CSV imports, and backup restores.
4. **Extract Configuration & Constants**: Centralize default currency (`PKR`), pagination limits, backup retention limits, and session cookie names into a dedicated config module.
5. **Decompose Complex Functions**: Refactor `parseCsv`, `POST /signup`, and CSV row validation into smaller, single-responsibility helper functions to keep cyclomatic complexity strictly below 8.
