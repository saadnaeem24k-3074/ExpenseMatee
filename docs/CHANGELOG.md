# Changelog

All notable changes to the ExpenseMate project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to Semantic Versioning.

## [Unreleased]

## [Assignment 02 - Commit 1: Setup] - 2026-11-06

**Commit hash:** `843db2e`

### Added
- **Git Baseline & Branching**:
  - Tagged `assignment-01-baseline` at the final Assignment 01 commit (`ecb83cd`).
  - Created and switched to development branch `assignment-02`.
  - Added `.gitattributes` configured with `* text=auto eol=lf` for cross-platform line ending normalization.
- **Baseline Test Execution**:
  - Executed full test suite and recorded verified results in `docs/baseline-test-results.md`:
    - 7 frontend test files (15 unit tests) passed.
    - 3 backend unit test files (27 unit tests) passed.
    - 2 backend integration test files (31 integration tests) passed against PostgreSQL `expensemate_test`.
    - Total: 12 test files, 73 tests passed (0 failures).
- **Backend Code Review**:
  - Produced `docs/code-review.md` cataloging maintenance problems with file and line references:
    - 33 direct `pool.query` / `client.query` calls across all 6 route modules.
    - Business logic trapped in HTTP route controllers.
    - Duplicated validation, date parsing clones, and redundant SQL `INSERT` statements.
    - Magic literals and hardcoded defaults (e.g. currency `"PKR"`, salt rounds `12`).
    - High-complexity functions exceeding threshold 8 (up to complexity 11 in `auth.ts`, `transactions.ts`, and `csv.ts`).
- **Maintainability Metrics ("Before" State)**:
  - Saved raw measurement outputs in `docs/metrics/before/`:
    - `eslint-complexity.txt` (ESLint complexity report with max allowed 8)
    - `jscpd.txt` (Code clone detection reporting 2 clones, ~0.72% duplication)
    - `pool-usage.txt` (Static scan reporting 8 files importing `pool` and 33 route queries)
    - `coverage.txt` (Vitest coverage command execution log)
  - Created `docs/metrics/METHOD.md` detailing the commands and reproduction steps for all metrics.
- **Architecture Documentation**:
  - Created `docs/architecture-before.md` containing a Mermaid diagram illustrating the current two-tier monolithic architecture (Routes -> pool.query -> PostgreSQL).

## [Assignment 02 - Commit 2: Migration] - 2026-11-08

**Commit hash:** `5e8312c`
**Commit message:** `feat(migration): versioned DB migrations with data verification and centralised config`
**Author:** Saad Naeem

### Added
- **Versioned migration system** (`server/src/db/migrations/`):
  - `001_initial_schema.sql` — Assignment 01 schema reproduced verbatim with idempotent statements, safe to apply to an existing database.
  - `002_transaction_integrity.sql` — `transactions_amount_positive` CHECK (`amount > 0`, `NOT VALID`) and `idx_transactions_user_type_date`.
  - `schema_migrations` tracking table recording `id`, SHA-256 `checksum`, and `applied_at`.
- **Data-safety verification** (`server/src/db/verifyMigration.ts`, `npm run verify:migration`):
  - Creates a throwaway database, reproduces the pre-migration schema, seeds 2 users / 3 transactions / 2 budgets, snapshots counts + totals + checksums, runs the real migration runner, compares snapshots, and drops the scratch database.
- **Centralised configuration** (`server/src/config.ts`):
  - Validates `DATABASE_URL`, `SESSION_SECRET` (min 16 chars), `PORT`, `NODE_ENV`, `CLIENT_ORIGIN`; fails fast with actionable errors.
  - Now the only module that reads `process.env`.
- **Documentation** (`docs/migration-report.md`): before/target state, reason, steps, risks, rollback notes, and real migration/verification/test output.

### Changed
- `server/src/db/migrate.ts` rewritten: runs only pending migrations in filename order, one transaction per migration, checksum-drift detection, advisory lock, and explicit applied/skipped logging. `npm run migrate` still works.
- `server/src/db/pool.ts`, `server/src/app.ts`, `server/src/index.ts` now consume `config` instead of reading `process.env` directly; removed the insecure `"dev-secret-change-me"` fallback.
- `server/.env.example` completed with comments and the test-database note.
- `server/package.json`: added `verify:migration`; `test:unit` now excludes `dist/**` so compiled tests cannot be executed accidentally.

### Removed
- `server/src/db/schema.sql` — superseded by `migrations/001_initial_schema.sql`.

### Verification
- `npm run migrate` applied 2 migrations on the first run and skipped both on the second (idempotent).
- `npm run verify:migration` reported identical row counts, totals, and checksums before and after migration.
- `npm run build` passed; all existing tests still pass: backend unit 27/27, backend integration 31/31, frontend 15/15 (73 total).

## [Assignment 02 - Commit 3: Transactions Refactoring] - 2026-11-08

**Commit hash:** `705d244`
**Commit message:** `refactor(transactions): controller-service-repository layering for transactions`

### Added
- **Layered Architecture for Transactions**:
  - `server/src/types/transaction.ts`: Strongly typed domain models (`Transaction`, `TransactionExportRow`, `CreateTransactionInput`, `UpdateTransactionInput`, `ValidImportRow`, `CsvImportResult`, `CsvImportError`).
  - `server/src/repositories/transactionsRepository.ts`: Encapsulates all SQL persistence (`findAllByUser`, `findExportByUser`, `findById`, `insert`, `update`, `deleteById`, `bulkInsert`, `findByUserAndDateRange`) behind `ITransactionsRepository`.
  - `server/src/services/transactionsService.ts`: Pure business logic layer handling input validation, type enforcement, defaults, CSV parsing/row validation, and CSV export formatting.
  - `server/src/controllers/transactionsController.ts`: Presentation/HTTP controller handling request parsing, response formatting, and error status mapping.
  - `server/src/errors/appError.ts`: Standard domain error hierarchy (`AppError`, `ValidationError`, `NotFoundError`).
  - `server/src/services/transactionsService.test.ts`: 12 unit tests using `FakeTransactionsRepository`.
- **Documentation**:
  - `docs/refactoring-transactions.md`: Verification report with test execution results and a detailed trace of "Add Transaction" across all layers.
  - `docs/architecture-after.md`: Mermaid diagram and analysis of concrete code-quality improvements.

### Changed
- `server/src/routes/transactions.ts`: Streamlined to a thin router wiring routes to controller methods; removed all SQL and direct `pool` imports.

## [Assignment 02 - Commit 4: Budgets and Analytics Refactoring] - 2026-11-08

**Commit hash:** `832f49f`
**Commit message:** `refactor(budgets): layered budgets and monthly summary with unit tests`

### Added
- **Layered Architecture for Budgets**:
  - `server/src/types/budget.ts`: Strongly-typed interfaces (`Budget`, `BudgetWithSpendingRaw`, `BudgetWithSpending`, `UpsertBudgetInput`, `UpsertBudgetData`).
  - `server/src/repositories/budgetsRepository.ts`: Encapsulates SQL for budget queries and upserts (`findByMonthAndYear`, `upsert`, `deleteById`, `findById`) behind `IBudgetsRepository`.
  - `server/src/services/budgetsService.ts`: Pure domain logic computing budget status (`ok`, `warning`, `exceeded`) and percentage consumption, with parameter validation and currency defaults.
  - `server/src/controllers/budgetsController.ts`: Presentation controller handling `GET /api/budgets`, `POST /api/budgets`, and `DELETE /api/budgets/:id`.
  - `server/src/services/budgetsService.test.ts`: 13 in-memory unit tests using `FakeBudgetsRepository` verifying status thresholds, multi-category calculation, validations, and edge cases.
- **Layered Architecture for Analytics**:
  - `server/src/types/analytics.ts`: Data types (`CategoryBreakdownRow`, `MonthlyTrendRow`, `CategoryBreakdownResult`, `MonthlyTrendResult`).
  - `server/src/repositories/analyticsRepository.ts`: Pure SQL queries for category breakdowns and multi-month historical trends behind `IAnalyticsRepository`.
  - `server/src/services/analyticsService.ts`: Service managing date defaults, parameter clamping (1-24 months), and response assembly.
  - `server/src/controllers/analyticsController.ts`: Presentation controller handling `GET /api/analytics/category-breakdown` and `GET /api/analytics/trend`.
  - `server/src/services/analyticsService.test.ts`: 6 in-memory unit tests using `FakeAnalyticsRepository`.
- **Documentation & Verification**:
  - `docs/layer-checks.md`: Layer isolation report confirming zero `pool` imports and zero raw SQL statements in controllers and services, and zero business calculations in repositories.
  - `docs/refactoring-budgets.md`: Verification report with test execution outputs and an end-to-end trace of "Monthly Budget Summary" through all four layers.
  - `docs/architecture-after.md`: Updated comprehensive architecture document and Mermaid diagram covering Transactions, Budgets, and Analytics subsystems.

### Changed
- `server/src/routes/budgets.ts`: Reduced to a thin 17-line router without SQL or `pool` imports.
- `server/src/routes/analytics.ts`: Reduced to a thin 15-line router without SQL or `pool` imports.

## [Assignment 02 - Commit 5: Rewrite] - 2026-11-08

**Commit hash:** `547fb72`
**Commit message:** `refactor(rewrite): rewrite CsvParser/CsvFormatter and AuthService with tests and report`
**Author:** Uzair

### Added
- **CSV characterization suite** (`server/src/utils/csv.characterization.test.ts`): 20 tests capturing the original `toCsv`/`parseCsv` behaviour (quoting, escaped quotes, embedded commas/newlines, CRLF, blank lines, header normalisation, missing/extra columns, empty input, round-trip). Written and run against the old implementation first, then re-run unchanged.
- **Auth characterization suite** (`server/src/integration/auth.characterization.test.ts`): 15 HTTP contract tests capturing signup/login/session/logout/profile status codes, error messages and JSON shapes. Written and run against the old inline routes first, then re-run unchanged.
- **`AuthRepository`** (`server/src/repositories/authRepository.ts`): SQL-only auth data access behind `IAuthRepository`, pool injected.
- **`AuthService`** (`server/src/services/authService.ts`): validation, email normalisation, hashing/credential checks and profile rules, with injectable `IAuthRepository` + `PasswordHasher`; magic values moved to `MIN_PASSWORD_LENGTH`, `DEFAULT_BASE_CURRENCY`, `DEFAULT_BCRYPT_ROUNDS`.
- **`AuthController`** (`server/src/controllers/authController.ts`): HTTP/session concerns only.
- **`server/src/types/user.ts`**: user and auth input/output types.
- **`server/src/services/authService.test.ts`**: 15 isolated unit/edge-case tests using fake repository and fake hasher.
- **Metrics**: `docs/metrics/after/eslint-complexity.txt`, `eslint-complexity-rewritten.txt`, `jscpd.txt`, `jscpd-rewritten.txt` (real command output).
- **Documentation**: `docs/rewriting-report.md`.

### Changed
- `server/src/utils/csv.ts`: rewritten from one complexity-11 `parseCsv` state machine into single-purpose `CsvParser` and `CsvFormatter` classes; `toCsv`/`parseCsv` remain as thin compatible wrappers.
- `server/src/routes/auth.ts`: reduced to thin route wiring; inline SQL, bcrypt, validation and session handling removed.

### Verification
- Characterization tests passed against the old implementation (CSV 20/20, auth 15/15) and against the rewritten implementation (same suites, same results).
- ESLint (complexity 8) on the five rewritten files: 0 warnings, 0 errors; jscpd on the same files: 0 clones.
- Full suites pass: backend unit 93/93, backend integration 46/46, frontend 15/15.

## [Assignment 02 - Commit 6: Integration, Regression and Final Reports] - 2026-11-08

**Commit hash:** assigned when this commit is created
**Commit message:** `test(docs): integration and regression tests, metrics comparison, final reports`
**Author:** Saad Naeem

### Added
- **Sequential test configuration** (`server/vitest.config.ts`): excludes
  `dist/**` and runs integration files with `fileParallelism: false` /
  `maxWorkers: 1` so the shared `expensemate_test` database cannot race.
- **Coverage provider** (`@vitest/coverage-v8@5.0.1`, pinned) and
  `test:coverage` scripts: coverage now runs and reports 75.18% statements /
  78.68% branches / 83.44% functions / 75.37% lines (raw output in
  `docs/metrics/after/coverage.txt`).
- **Regression evidence**: `docs/regression-test-plan.md` maps every Assignment
  01 feature to its automated test or manual step; `docs/test-results.md`
  records the real build/test output (154/154 passing).
- **Final reports**: `docs/final-report.md`, `docs/demo-checklist.md`,
  `docs/defect-log.md`, `docs/team-contribution.md`,
  `docs/metrics/comparison.md`.
- **README run instructions**: database setup, migrations, backend/frontend
  start and the full test commands for a clean clone.

### Changed
- `server/src/services/budgetsService.test.ts`: removed the unused
  `ValidationError` import.
- `src/components/ui/button.tsx`, `src/components/ui/navigation-menu.tsx`:
  file-level `react-refresh/only-export-components` disable so the generated
  shadcn files no longer fail `npm run lint`.
- `docs/CHANGELOG.md`: commit hashes added to every Assignment 02 entry.
- Root `package.json`: convenience scripts `install:server`, `migrate`,
  `verify:migration`, `build:server`, `test:server`, `test:coverage`.

### Verification
- Client build PASS; server build PASS.
- Frontend 15/15, server unit 93/93, server integration 46/46 — 154/154 total.
- ESLint complexity: 0 errors, 4 warnings (down from 5).
- Coverage command PASS with the percentages above.

### Known limitations
- `routes/backup.ts` and `routes/currencies.ts` still contain inline SQL.
- Four complexity warnings remain in `budgetsService.ts` /
  `transactionsService.ts`; covered by tests, left for a future refactor.
- Browser E2E is manual; no E2E runner exists in the repo.
