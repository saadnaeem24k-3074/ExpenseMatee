# Changelog

All notable changes to the ExpenseMate project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to Semantic Versioning.

## [Unreleased]

## [Assignment 02 - Commit 1: Setup] - 2026-11-06

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

