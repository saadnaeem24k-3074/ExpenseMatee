# Baseline Test Execution Results

This document records the real test results for the baseline state (`assignment-01-baseline`) across both frontend and backend suites.

**Test Date**: November 6, 2026  
**Environment**: Windows 11, Node.js v20+, PostgreSQL 18  
**Test Database**: `expensemate_test` (configured via `server/.env.test`)

---

## Summary of Results

| Test Suite | Scope | Test Files | Passed | Failed | Total Tests |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Frontend Unit Tests** | Components & Hooks (`src/`) | 7 | 15 | 0 | 15 |
| **Backend Unit Tests** | Utilities (`server/src/utils/`) | 3 | 27 | 0 | 27 |
| **Backend Integration Tests** | Full API + Database (`server/src/integration/`) | 2 | 31 | 0 | 31 |
| **Total** | **Full Project** | **12** | **73** | **0** | **73** |

---

## 1. Frontend Unit Tests

- **Command**: `npm test` (`vitest run`)
- **Duration**: ~22.5s
- **Status**: **PASS (15 / 15 passed)**

```
 ✓ src/lib/api.test.ts (3 tests)
   ✓ converts response properly
   ✓ handles API network errors
   ✓ sets authentication headers
 ✓ src/lib/useTransactions.test.ts (2 tests)
   ✓ computes pagination correctly
   ✓ filters transactions by search term
 ✓ src/components/StatCard.test.tsx (2 tests)
   ✓ renders title and formatted value
   ✓ renders delta indicator with positive trend
 ✓ src/lib/currency.test.ts (2 tests)
   ✓ converts amounts between currencies using base rate
   ✓ preserves precision when converting rates
 ✓ src/lib/utils.test.ts (1 test)
   ✓ cn merges class names correctly
 ✓ src/components/TransactionTable.test.tsx (3 tests)
   ✓ renders empty state when no transactions
   ✓ renders transaction rows with formatted dates and amounts
   ✓ triggers edit and delete action callbacks
 ✓ src/app/MonthlyCategory.test.tsx (2 tests)
   ✓ renders category breakdown with bar progress
   ✓ handles zero budget scenario gracefully

Test Files: 7 passed (7)
Tests:      15 passed (15)
```

---

## 2. Backend Unit Tests

- **Command**: `npm run test:unit` (`vitest run --exclude src/integration/**`)
- **Duration**: 1.77s
- **Status**: **PASS (27 / 27 passed)**

```
 ✓ src/utils/budgetStatus.test.ts (8 tests)
   ✓ is 'ok' when spend is well under budget
   ✓ is 'ok' at exactly 79%
   ✓ is 'warning' at 80%
   ✓ is 'warning' between 80% and 100%
   ✓ is 'warning' at exactly 100%
   ✓ is 'exceeded' at 101%
   ✓ is 'exceeded' when way over budget
   ✓ handles zero budget gracefully
 ✓ src/utils/backupValidation.test.ts (9 tests)
   ✓ accepts valid transaction snapshot
   ✓ rejects transaction without amount
   ✓ rejects transaction with negative amount
   ✓ rejects transaction with invalid date
   ✓ rejects transaction with unknown type
   ✓ accepts valid budget snapshot
   ✓ rejects budget with negative amount
   ✓ rejects budget with invalid month
   ✓ rejects budget without category
 ✓ src/utils/csv.test.ts (10 tests)
   ✓ encodes simple CSV without quotes
   ✓ escapes fields containing commas
   ✓ escapes fields containing quotes
   ✓ escapes fields containing newlines
   ✓ parses simple CSV into row objects
   ✓ parses CSV with quoted fields and embedded commas
   ✓ parses CSV with escaped internal quotes
   ✓ handles Windows (CRLF) and Unix (LF) line breaks
   ✓ handles trailing newlines without creating empty records
   ✓ returns empty array for empty or whitespace-only CSV

Test Files: 3 passed (3)
Tests:      27 passed (27)
```

---

## 3. Backend Integration Tests

- **Command**: `npx vitest run src/integration --fileParallelism=false`
- **Database**: PostgreSQL (`DATABASE_URL=postgres://postgres:1234@localhost:5432/expensemate_test`)
- **Duration**: 25.96s
- **Status**: **PASS (31 / 31 passed)**

> [!NOTE]
> Integration tests verify complete end-to-end flows involving Express route handlers, session cookies, password hashing (`bcrypt`), and PostgreSQL cascading tables. Tests must be executed sequentially (`--fileParallelism=false`) so that database table wiping in `beforeEach` hooks does not conflict across test suites.

```
 ✓ src/integration/api.integration.test.ts (23 tests)
   ✓ IT-01 Auth + session + database (4 tests)
     ✓ signs up, keeps the session, logs out, and rejects the session afterwards
     ✓ logs in with the right password and rejects the wrong one
     ✓ rejects duplicate emails and weak passwords
     ✓ blocks every protected route without a session
   ✓ IT-02 Transactions + currencies + database (CRUD) (3 tests)
     ✓ creates, lists, updates and deletes a transaction
     ✓ validates input
     ✓ serves the supported currency list
   ✓ IT-03 Budgets + transactions + budget-status logic (5 tests)
     ✓ moves a budget from ok to warning to exceeded as spending grows
     ✓ ignores income, other categories and other months when computing spend
     ✓ converts spending in another currency into the budget currency
     ✓ upserts instead of duplicating, and deletes
     ✓ rejects invalid budgets
   ✓ IT-04 Analytics + transactions (4 tests)
     ✓ returns per-category totals for the requested month only
     ✓ returns an empty list (not an error) for a month with no data
     ✓ returns a zero-filled trend of the requested length, oldest first
     ✓ converts mixed currencies into the user's base currency
   ✓ IT-05 CSV import / export + database (4 tests)
     ✓ imports valid rows, reports invalid ones, and rolls nothing back
     ✓ rejects an empty or missing CSV
     ✓ exports CSV that contains the imported rows
     ✓ round-trips: export then import into a second account gives the same data
   ✓ IT-06 Backup export / restore + database (2 tests)
     ✓ restores transactions and budgets from a backup after the data is wiped
     ✓ skips invalid entries and rejects a malformed backup
   ✓ IT-07 Data isolation between users (1 test)
     ✓ never shows or lets one user touch another user's data

 ✓ src/integration/cloudBackup.integration.test.ts (8 tests)
   ✓ IT-08 cloud backup: create and list (3 tests)
     ✓ stores a snapshot with the right counts and lists it
     ✓ keeps the calendar day of a transaction in the snapshot (no timezone shift)
     ✓ rejects anonymous requests
   ✓ IT-09 cloud backup: restore (2 tests)
     ✓ brings back data that was deleted after the snapshot
     ✓ returns 404 for an unknown or malformed id
   ✓ IT-10 cloud backup: delete (1 test)
     ✓ removes a snapshot and then returns 404 for it
   ✓ IT-11 cloud backup: retention (1 test)
     ✓ keeps only the 10 newest snapshots
   ✓ IT-12 cloud backup: user isolation (1 test)
     ✓ does not let one user see, restore or delete another user's snapshot

Test Files: 2 passed (2)
Tests:      31 passed (31)
```
