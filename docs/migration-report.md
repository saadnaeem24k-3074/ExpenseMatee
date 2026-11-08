# Migration Report — Versioned Database Migrations & Centralised Config

**Assignment 02 · Commit 2 · Part A (Migration)**
**Author:** Saad Naeem
**Date:** 2026-11-08

## 1. Before state

- The database schema lived in one file, `server/src/db/schema.sql`, which combined
  every table, index, and seed row for the whole project.
- `server/src/db/migrate.ts` read that file and executed the entire thing on every
  run. There was no record of what had already been applied, no ordering, and no
  way to tell whether a run had partially completed.
- Configuration was scattered: `process.env.DATABASE_URL` in `pool.ts`,
  `process.env.PORT` in `index.ts`, and `process.env.NODE_ENV`, `CLIENT_ORIGIN`,
  `SESSION_SECRET` in `app.ts`. Missing values silently fell back to insecure
  defaults (for example `SESSION_SECRET` fell back to `"dev-secret-change-me"`).

## 2. Target state

- `server/src/db/migrations/` contains numbered, immutable SQL migrations:
  - `001_initial_schema.sql` — the exact Assignment 01 schema, with every
    statement written idempotently so it can be applied to an existing database.
  - `002_transaction_integrity.sql` — adds a `CHECK (amount > 0)` constraint on
    `transactions` (as `NOT VALID`, so legacy rows are not scanned) and an index
    on `transactions(user_id, type, date)` for per-user, type-filtered reports.
- `server/src/db/migrate.ts` is now a small, reusable migration runner that:
  - keeps a `schema_migrations` table (`id`, `checksum`, `applied_at`);
  - applies only pending files, in filename order;
  - runs each migration inside its own transaction (all-or-nothing);
  - records the file only after success, so it is safe to run repeatedly;
  - detects edited migrations through a SHA-256 checksum;
  - uses a PostgreSQL advisory lock so two migrate processes cannot race;
  - prints exactly what it applied or skipped.
- `server/src/config.ts` is the **only** module that reads `process.env`. It
  validates `DATABASE_URL`, `SESSION_SECRET`, `PORT`, `NODE_ENV`, and
  `CLIENT_ORIGIN` and fails fast with an actionable message. `pool.ts`,
  `app.ts`, and `index.ts` consume the exported `config` object.
- `server/src/db/verifyMigration.ts` proves data safety on a throwaway database.
- The old `schema.sql` was removed (it is now `001_initial_schema.sql`).

## 3. Why

The previous "run the whole schema every time" approach cannot support the
Assignment 02 layering work: later commits will add tables/columns, and those
changes must apply cleanly to a database that already holds Assignment 01 data.
Versioned migrations make schema change traceable, repeatable, and reversible,
while a single validated config module removes hidden defaults and hard-coded
secrets. This is the infrastructure the Controller → Service → Repository
refactor depends on.

## 4. Steps performed

1. Copied the current schema verbatim into `migrations/001_initial_schema.sql`
   (plus an explanatory header comment).
2. Added `migrations/002_transaction_integrity.sql` with the guarded constraint
   and index.
3. Rewrote `migrate.ts` around `schema_migrations`, per-migration transactions,
   checksums, and an advisory lock; kept `npm run migrate` as the entry point.
4. Added `config.ts`; refactored `pool.ts`, `app.ts`, and `index.ts` to use it and
   removed the scattered `dotenv/config` and `process.env` reads.
5. Added `verifyMigration.ts` and the `npm run verify:migration` script.
6. Expanded `server/.env.example` with comments and the test-database note.
7. Ran the migration twice, ran the verification script, built the server, and
   ran every test suite. Outputs are pasted below.

## 5. Risks and compatibility

| Risk | Mitigation |
|---|---|
| Applying to an existing Assignment 01 database | `001` uses `IF NOT EXISTS` / `ON CONFLICT DO NOTHING`, so it is a no-op for existing objects; verification proves row-level data is unchanged. |
| Legacy rows with `amount <= 0` | The new CHECK is added `NOT VALID`: it is enforced for new writes but does not scan or reject historical rows. It can be validated later once data is cleaned. |
| Half-applied migration | Every migration runs inside `BEGIN … COMMIT`; on error it is rolled back and no `schema_migrations` row is written. |
| Editing an already-applied migration | A SHA-256 checksum mismatch aborts the run with a clear error. New changes must go into a new numbered file. |
| Two migrate processes at once | `pg_advisory_lock` serialises them. |
| Missing/invalid env values | `config.ts` throws before the pool or server is created. |
| Losing data during a risky change | Take a backup first: `pg_dump "$DATABASE_URL" > backup.sql`. |

### Rollback / down notes

The runner has no automatic `down` step (destructive rollbacks are unsafe to
automate). Rollback is documented per change and applied manually if needed:

- **002 (safe to reverse, no data loss):**
  ```sql
  ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_amount_positive;
  DROP INDEX IF EXISTS idx_transactions_user_type_date;
  DELETE FROM schema_migrations WHERE id = '002_transaction_integrity.sql';
  ```
- **001 (baseline):** reversing it means dropping core tables, so it is only done
  by restoring a `pg_dump` backup. Do **not** drop these tables in production
  just to roll back; restore the backup instead.

## 6. Verification (real output)

### 6.1 First migration run (dev database already had the Assignment 01 schema)

```text
> expensemate-server@1.0.0 migrate
> tsx src/db/migrate.ts

Running migrations...
apply 001_initial_schema.sql ...
done  001_initial_schema.sql
apply 002_transaction_integrity.sql ...
done  002_transaction_integrity.sql
Applied 2 migration(s); skipped 0 already applied.
Migrations complete.
```

### 6.2 Second migration run — idempotency proof

```text
> expensemate-server@1.0.0 migrate
> tsx src/db/migrate.ts

Running migrations...
skip  001_initial_schema.sql (already applied)
skip  002_transaction_integrity.sql (already applied)
Database is up to date (2 migration(s) already applied).
Migrations complete.
```

### 6.3 Data verification on a seeded, pre-migration database

`npm run verify:migration` creates a throwaway database, reproduces the
Assignment 01 schema, seeds data, snapshots counts/totals/checksums, runs the
real runner, and compares.

```text
> expensemate-server@1.0.0 verify:migration
> tsx src/db/verifyMigration.ts

Created scratch database: expensemate_verify_1794137083670
Reproduced Assignment 01 baseline schema (before any migration was tracked).
Seeded 7 sample rows (2 users, 3 transactions, 2 budgets).
BEFORE: {
  "users": {
    "count": 2,
    "total": "120",
    "checksum": "3d755398998afc09af5d1d5aa76af84e"
  },
  "transactions": {
    "count": 3,
    "total": "6550.50",
    "checksum": "9e0f551e9570c98bcf8d0d3284aa48f6"
  },
  "budgets": {
    "count": 2,
    "total": "2500.00",
    "checksum": "861a4edbb10635b2fe251fac10da4d32"
  }
}
apply 001_initial_schema.sql ...
done  001_initial_schema.sql
apply 002_transaction_integrity.sql ...
done  002_transaction_integrity.sql
Applied 2 migration(s); skipped 0 already applied.
Runner applied: 001_initial_schema.sql, 002_transaction_integrity.sql
Runner skipped: (none)
AFTER : {
  "users": {
    "count": 2,
    "total": "120",
    "checksum": "3d755398998afc09af5d1d5aa76af84e"
  },
  "transactions": {
    "count": 3,
    "total": "6550.50",
    "checksum": "9e0f551e9570c98bcf8d0d3284aa48f6"
  },
  "budgets": {
    "count": 2,
    "total": "2500.00",
    "checksum": "861a4edbb10635b2fe251fac10da4d32"
  }
}
VERIFIED: row counts, totals and checksums are identical before and after.
schema_migrations: 001_initial_schema.sql, 002_transaction_integrity.sql
transactions_amount_positive present: true
Dropped scratch database: expensemate_verify_1794137083670
```

### 6.4 Config fail-fast check

```text
$ DATABASE_URL="mysql://localhost:3306/wrong" npx tsx src/config.ts
...
Error: Invalid DATABASE_URL "mysql://localhost:3306/wrong". Expected a PostgreSQL connection string starting with postgres:// or postgresql://.
    at readDatabaseUrl (...\server\src\config.ts:44:11)
...
exit=1
```

### 6.5 Build and existing tests

Backend type-check/build:

```text
> expensemate-server@1.0.0 build
> tsc -b
```

Backend unit tests:

```text
> expensemate-server@1.0.0 test:unit
> vitest run --exclude src/integration/** --exclude dist/**

 Test Files  3 passed (3)
      Tests  27 passed (27)
```

Backend integration tests (real PostgreSQL, `expensemate_test`):

```text
> expensemate-server@1.0.0 test:integration
> vitest run src/integration --maxWorkers=1

 Test Files  2 passed (2)
      Tests  31 passed (31)
```

Frontend tests:

```text
> expense-tracker@0.0.0 test
> vitest run

 Test Files  7 passed (7)
      Tests  15 passed (15)
```

All 73 pre-existing tests still pass; no API or UI contract was changed.

## 7. Files changed

| File | Change |
|---|---|
| `server/src/config.ts` | **new** — validated, single source of environment configuration |
| `server/src/db/migrations/001_initial_schema.sql` | **new** — baseline schema (idempotent) |
| `server/src/db/migrations/002_transaction_integrity.sql` | **new** — CHECK constraint + index |
| `server/src/db/migrate.ts` | rewritten — versioned runner with tracking, checksums, transactions, advisory lock |
| `server/src/db/verifyMigration.ts` | **new** — seeded data-safety verification |
| `server/src/db/pool.ts` | uses `config.databaseUrl` |
| `server/src/app.ts` | uses `config` instead of `process.env` |
| `server/src/index.ts` | uses `config.port` |
| `server/src/db/schema.sql` | removed — superseded by `001_initial_schema.sql` |
| `server/.env.example` | commented and completed (test DB note) |
| `server/package.json` | added `verify:migration`; unit test script excludes `dist/**` |
| `SETUP.md` | documents `verify:migration` and re-runnable migrations |
| `.gitignore` | ignores `*.tsbuildinfo` build artefacts |
| `docs/CHANGELOG.md` | Commit 2 entry appended |
