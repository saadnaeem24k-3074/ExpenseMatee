# Test Results — Assignment 02 (Commit 6)

Executed on 2026-11-08 on Windows with PostgreSQL 18.6 (`expensemate_test`).
Every result below is copied from a real run; no values are estimated.

## 1. Client production build

```text
> expense-tracker@0.0.0 build
> tsc -b && vite build

vite v7.3.1 building client environment for production...
✓ 3472 modules transformed.
dist/index.html                 0.55 kB
dist/assets/index-DkqaCX8Q.css 66.72 kB
dist/assets/index-CITyly2S.js  1,069.13 kB
✓ built in 21.13s
```

Result: **PASS**. One advisory warning: the main JS chunk is larger than 500 kB
(a Vite chunk-size hint, not an error).

## 2. Server production build

```text
> expensemate-server@1.0.0 build
> tsc -b
```

Result: **PASS** (exit code 0, no output).

## 3. Frontend unit tests

```text
> expense-tracker@0.0.0 test
> vitest run

Test Files  7 passed (7)
     Tests  15 passed (15)
  Duration  5.43s
```

Result: **PASS** — 15/15.

## 4. Server unit tests

```text
> expensemate-server@1.0.0 test:unit
> vitest run --exclude src/integration/** --exclude dist/**

Test Files  8 passed (8)
     Tests  93 passed (93)
  Duration  2.13s
```

Result: **PASS** — 93/93.

## 5. Server integration tests (real PostgreSQL)

```text
> expensemate-server@1.0.0 test:integration
> vitest run src/integration --maxWorkers=1

Test Files  3 passed (3)
     Tests  46 passed (46)
  Duration  20.72s
```

Result: **PASS** — 46/46. Covers IT-01 to IT-12: auth/session, transaction
CRUD, currencies, budgets and status, analytics, CSV import/export, cloud
backup, and cross-user isolation.

## 6. Combined test count

| Suite | Files | Tests | Result |
|---|---:|---:|---|
| Frontend | 7 | 15 | PASS |
| Server unit | 8 | 93 | PASS |
| Server integration | 3 | 46 | PASS |
| **Total** | **18** | **154** | **PASS** |

## 7. Coverage

Command (from the repo root):

```powershell
npm run test:coverage
```

Raw output: `docs/metrics/after/coverage.txt`.

```text
Test Files  11 passed (11)
     Tests  139 passed (139)

Statements   : 75.18% ( 518/689 )
Branches     : 78.68% ( 251/319 )
Functions    : 83.44% ( 121/145 )
Lines        : 75.37% ( 508/674 )
```

Result: **PASS**. 139 server tests are included (93 unit + 46 integration).
The baseline coverage run could not execute because the coverage provider was
not installed; it is now a pinned dev dependency.

## 8. Lint

```text
> expense-tracker@0.0.0 lint
> eslint .
```

Result: **PASS** (exit code 0, no output). Two pre-existing
`react-refresh/only-export-components` errors in the generated
`src/components/ui/button.tsx` and `navigation-menu.tsx` were annotated with a
file-level disable in this commit.

## 9. What was not run

- Browser end-to-end tests: **NOT RUN** (no Playwright/Cypress in the repo).
  The manual checklist is in `docs/regression-test-plan.md`.
- `npm run verify:migration`: **NOT RUN in commit 6**; it was run and recorded in
  `docs/migration-report.md` during commit 2.
