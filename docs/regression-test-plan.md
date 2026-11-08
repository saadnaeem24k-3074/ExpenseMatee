# Regression Test Plan — Assignment 01 Feature Contract

The goal is to prove that every Assignment 01 feature still behaves the same
after the layering, migration and rewrite work. Existing endpoints, request
bodies and JSON response shapes were treated as a frozen contract.

**Environment:** Windows 10, Node.js, PostgreSQL 18.6, databases `expensemate`
and `expensemate_test`. Server tests are integration tests against the real
database; frontend tests use Vitest + Testing Library.

**Commands run for this plan (real output in `docs/test-results.md`):**

```powershell
cd server
npm run test:unit
npm run test:integration

cd ..
npm test
npm run build
cd server; npm run build
```

Automated suites total **154 passing tests**: 93 server unit, 46 server
integration, 15 frontend. Builds pass for both client and server.

## Feature-to-test mapping

| # | Assignment 01 feature | Automated evidence | Result |
|---|---|---|---|
| 1 | Sign up (validation, duplicate email, password hashing, session) | `auth.characterization.test.ts` signup group (6 tests); `api.integration.test.ts` IT-01 (4 tests) | PASS |
| 2 | Log in / log out / session persistence | auth characterization login + session groups (9 tests); IT-01 | PASS |
| 3 | Read and update profile / base currency | auth characterization session group (3 tests) | PASS |
| 4 | Add transaction | `api.integration.test.ts` IT-02 "creates, lists, updates and deletes"; `transactionsService.test.ts` (12 unit tests) | PASS |
| 5 | Edit transaction | IT-02 same test (PUT path); `transactionsService.test.ts` update tests | PASS |
| 6 | Delete transaction | IT-02 same test (DELETE path); service unit tests | PASS |
| 7 | Transaction validation and error messages | IT-02 "validates input"; `transactionsService.test.ts` validation cases | PASS |
| 8 | Categories in transaction list and breakdown | IT-04 "returns per-category totals…"; `MonthlyCategory.test.tsx` | PASS |
| 9 | Currency list and conversion | IT-02 "serves the supported currency list"; IT-03 currency conversion; IT-04 mixed currencies; `currency.test.ts`; `utils.test.ts` | PASS |
| 10 | Create / update / delete budgets (upsert) | IT-03 (5 tests); `budgetsService.test.ts` (13 unit tests) | PASS |
| 11 | Budget status `ok` / `warning` / `exceeded` | IT-03 threshold test; `budgetStatus.test.ts`; `budgetsService.test.ts` | PASS |
| 12 | Budget ignores income, other categories and other months | IT-03 "ignores income, other categories and other months" | PASS |
| 13 | Monthly category view | IT-04 per-category month totals; `MonthlyCategory.test.tsx` (2 tests) | PASS |
| 14 | Monthly trend chart data | IT-04 "zero-filled trend of the requested length, oldest first" | PASS |
| 15 | CSV import (valid + invalid rows) | IT-05 "imports valid rows…"; `csv.test.ts`; `csv.characterization.test.ts` (20 tests) | PASS |
| 16 | CSV export and round-trip | IT-05 export + round-trip; CSV characterization round-trip test | PASS |
| 17 | Cloud backup create / list / restore / delete / retention | `cloudBackup.integration.test.ts` IT-08 to IT-12 (8 tests); `api.integration.test.ts` IT-06 (2 tests) | PASS |
| 18 | User data isolation | IT-07; IT-12 | PASS |
| 19 | Protected routes reject anonymous requests | IT-01 "blocks every protected route without a session" | PASS |
| 20 | Dashboard summary cards (UI rendering) | `StatCard.test.tsx` (2 tests); backend totals covered by IT-04 | PASS (logic) |
| 21 | Full UI click-through in a browser (all pages) | Manual checklist below | **NOT RUN** — no browser automation is configured in this repo |

## Manual UI checklist (not executed in this run)

These steps are listed so a reviewer can repeat them; they are **NOT RUN** and
must not be reported as passing until someone performs them.

1. Start PostgreSQL, run `npm run migrate`, then `npm run dev` in `server/` and
   `npm run dev` at the repo root.
2. Sign up a fresh user; confirm redirect to the dashboard and a `PKR` base
   currency.
3. Add a transaction; edit it; delete it; refresh after each step and confirm
   the list and totals update.
4. Change the base currency in the profile and confirm amounts are converted.
5. Open the monthly category view and the trend chart; confirm both match the
   transactions entered.
6. Create a budget, then add spending to push it through `ok` → `warning` →
   `exceeded`; confirm the badge and percentage.
7. Export CSV, delete the transactions, re-import the file, and confirm the
   rows return.
8. Create a cloud backup, delete a transaction, restore the backup, and confirm
   the transaction returns.
9. Log out and confirm protected pages redirect to login.

## Regression risks accepted

- `routes/backup.ts` and `routes/currencies.ts` still contain inline SQL. Their
  behaviour is covered by IT-05/IT-06/IT-08–IT-12 and the currency tests, but
  they are the least-layered modules.
- UI screens are covered at component and API level, not end-to-end. The
  manual checklist above is the remaining gap.
