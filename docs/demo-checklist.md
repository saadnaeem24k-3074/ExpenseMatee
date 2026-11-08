# Demo Checklist — Assignment 02

## Before the demo (10 minutes)

- [ ] PostgreSQL is running on `localhost:5432`.
- [ ] `server/.env` exists with `DATABASE_URL`, `SESSION_SECRET` (16+ chars),
      `PORT`, `NODE_ENV`, `CLIENT_ORIGIN`.
- [ ] `server/.env.test` points at `expensemate_test`.
- [ ] `cd server; npm install` completed.
- [ ] `npm install` at repo root completed.
- [ ] `npm run migrate` and then `npm run migrate` again (second run must log
      "skipped", proving idempotency).
- [ ] `npm run test:unit`, `npm run test:integration`, `npm test` all green.

## Demo script

### 1. Show the layered request path

- [ ] Open `server/src/routes/transactions.ts`: only route wiring, no SQL/pool.
- [ ] Open `transactionsController.ts`: HTTP only.
- [ ] Open `transactionsService.ts`: validation/business rules.
- [ ] Open `transactionsRepository.ts`: SQL only.
- [ ] Open `docs/architecture-after.md` and point at the Mermaid diagram.

### 2. Show migrations

- [ ] Show `server/src/db/migrations/001_initial_schema.sql` and
      `002_transaction_integrity.sql`.
- [ ] Show `schema_migrations` rows with `\d schema_migrations` in psql.
- [ ] Run `npm run migrate` again; show both migrations skipped.
- [ ] Mention `npm run verify:migration` and its identical before/after
      checksums (`docs/migration-report.md`).

### 3. Run the tests live

```powershell
cd server
npm run test:unit
npm run test:integration
cd ..
npm test
```

- [ ] 93 server unit, 46 server integration, 15 frontend = 154 passing.
- [ ] Optional: `cd server; npx vitest run --coverage` and show 75.18%
      statements.

### 4. Walk through the app (manual)

- [ ] Sign up a new user; show dashboard and `PKR` base currency.
- [ ] Add a transaction, edit it, delete it.
- [ ] Change base currency; show converted totals.
- [ ] Open monthly category view and trend chart.
- [ ] Create a budget and push it from `ok` to `warning` to `exceeded`.
- [ ] Export CSV, delete rows, import the CSV back.
- [ ] Create a cloud backup, delete a transaction, restore the backup.
- [ ] Log out and show a protected page redirecting to login.

### 5. Show metrics and reports

- [ ] `docs/metrics/comparison.md`: 73 → 154 tests; 5 → 4 complexity warnings;
      6 → 2 route files importing pool; 33 → 14 route-level SQL calls.
- [ ] `docs/rewriting-report.md`: characterization tests passed before and
      after the rewrite; 0 clones in the rewritten files.
- [ ] `docs/defect-log.md`: six defects found and fixed.
- [ ] `docs/test-results.md`: real command output.
- [ ] `docs/CHANGELOG.md`: one entry per commit.

## Likely questions and answers

- **Why do two routes still have SQL?** Backup and currencies were not in the
  assigned layering scope; they are documented as a known limitation and are
  covered by integration tests.
- **Why did duplication rise?** The codebase doubled; the new controllers share
  an error-handling block and the integration suites share setup. Scoped to the
  rewritten modules, duplication is 0.
- **Why sequential integration tests?** All files share one
  `expensemate_test` database; parallel runs caused duplicate-key and FK races.
  `fileParallelism: false` and `maxWorkers: 1` fix it.
- **How do you know the rewrite did not change behaviour?** 20 CSV and 15 auth
  characterization tests were written against the old code, then re-run
  unchanged against the new code.

## After the demo

- [ ] `git status` shows only intended files.
- [ ] Commit 6 is the only new commit on `assignment-02`.
- [ ] Push `assignment-02` to `origin`.
