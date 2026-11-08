# ExpenseMate — Assignment 02 Final Report

**Repository:** `ExpenseMatee`
**Branch:** `assignment-02`
**Baseline:** tag `assignment-01-baseline` (`ecb83cd`)
**Final state:** commit 6 (`test(docs): integration and regression tests, metrics comparison, final reports`)
**Team:** Saad Naeem, Uzair

## 1. Objective

Assignment 02 asked us to evolve the existing ExpenseMate codebase without
changing its external behaviour: introduce versioned database migrations,
apply the Controller → Service → Repository → Database architecture, rewrite
one module after proving its old behaviour with characterization tests, and
prove the whole system with integration/regression tests and measurable
before/after metrics. Assignment 01 endpoints, JSON shapes and UI contract were
treated as frozen.

## 2. Where the code started

The Assignment 01 code worked but was a two-tier monolith. A code review of the
baseline found:

- 33 `pool.query` / `client.query` calls spread across all six route modules;
  every route mixed HTTP parsing, validation, business rules and SQL.
- A single ad-hoc `schema.sql` re-run at startup, with no record of which
  migrations had been applied and no evidence that existing data survived.
- `SESSION_SECRET` silently defaulting to `"dev-secret-change-me"`, and
  `process.env` read in multiple modules.
- Duplicated date parsing, validation and `INSERT` statements; magic values
  such as `"PKR"` and salt rounds.
- Five functions above the complexity threshold of 8, the worst at complexity
  11.
- 73 automated tests, no coverage report (the coverage provider was missing).

These findings are recorded with file/line references in `docs/code-review.md`
and measured in `docs/metrics/before/`.

## 3. What we changed (one commit per task)

### Commit 1 — Baseline and before-metrics (`843db2e`)

Tagged the final Assignment 01 commit, created `assignment-02`, normalized line
endings, ran the full baseline suite (73 tests), wrote the code review, captured
the before metrics and documented the reproduction commands in
`docs/metrics/METHOD.md`.

### Commit 2 — Versioned migrations and configuration (`5e8312c`)

Replaced the destructive schema re-run with `server/src/db/migrations/`:

- `001_initial_schema.sql` reproduces the Assignment 01 schema idempotently.
- `002_transaction_integrity.sql` adds a positive-amount CHECK (`NOT VALID`)
  and an index for user/type/date queries.
- A `schema_migrations` table stores the id, SHA-256 checksum and applied time;
  each pending file runs in its own transaction under an advisory lock, and
  checksum drift is detected.

`npm run verify:migration` creates a throwaway database, reproduces the old
schema, seeds users/transactions/budgets, snapshots counts, totals and
checksums, runs the real runner, compares the snapshots and drops the scratch
database. It reported identical data before and after.

`server/src/config.ts` became the only module reading `process.env`, validates
`DATABASE_URL`, `SESSION_SECRET` (16+ chars), `PORT`, `NODE_ENV` and
`CLIENT_ORIGIN`, and fails fast. The insecure secret fallback was removed.
Details: `docs/migration-report.md`.

### Commit 3 — Transactions layering (`705d244`)

Introduced `types/transaction.ts`, `transactionsRepository.ts`,
`transactionsService.ts`, `transactionsController.ts` and a small domain error
hierarchy. `routes/transactions.ts` became a thin router with no SQL and no
`pool` import. Twelve service unit tests run against a fake repository, and the
HTTP integration tests still pass unchanged. Details:
`docs/refactoring-transactions.md`.

### Commit 4 — Budgets and analytics layering (`832f49f`)

Applied the same split to budgets and analytics. Business rules (status
thresholds, percentage consumption, currency defaults) moved into services;
SQL moved into repositories; controllers only handle HTTP. `routes/budgets.ts`
and `routes/analytics.ts` became thin routers. Added 13 budget unit tests and 6
analytics unit tests plus `docs/layer-checks.md`, which proves controllers and
services import `pool` zero times. Details: `docs/refactoring-budgets.md`.

### Commit 5 — CSV/Auth rewrite (`547fb72`)

Before rewriting, we captured the old behaviour with characterization tests:
20 CSV tests and 15 HTTP auth tests, run against the old code first. We then
replaced the complexity-11 `parseCsv` state machine with single-purpose
`CsvParser` and `CsvFormatter` classes (keeping `toCsv`/`parseCsv` as compatible
wrappers) and moved all inline auth SQL, bcrypt and session rules into
`AuthRepository`, `AuthService` and `AuthController`. The characterization
suites were re-run unchanged and still passed. ESLint and jscpd on the rewritten
files report 0 warnings and 0 clones. Details: `docs/rewriting-report.md`.

### Commit 6 — Integration, regression and final reports

Added the sequential Vitest configuration and coverage provider, verified all
Assignment 01 workflows with 46 integration tests plus 93 server unit and 15
frontend tests, recorded the real output, compared before/after metrics,
logged defects, updated the changelog and README, and produced this report and
the demo checklist.

## 4. Architecture after the change

The request path is now:

```text
HTTP route (wiring only)
  → Controller (request/response, status mapping)
    → Service (validation + business rules)
      → Repository (SQL only, pool injected)
        → PostgreSQL
```

Controllers and services contain no `pool` import and no SQL. Repositories
contain no HTTP objects and no business calculations. Four subsystems
(transactions, auth, budgets, analytics) follow this shape. Two route files,
`backup.ts` and `currencies.ts`, were outside the assigned rewrite scope and
still contain inline SQL; this is documented as a known limitation. The
diagram and reasoning are in `docs/architecture-after.md`.

## 5. Results

| Metric | Before | After |
|---|---:|---:|
| Automated tests passing | 73 | **154** |
| Test files | 12 | **18** |
| ESLint complexity warnings (> 8) | 5 | **4** |
| jscpd duplicated lines (total repo) | 0.72% | 2.47% |
| jscpd clones in rewritten CSV/auth modules | n/a | **0** |
| Route files importing `pool` | 6 of 6 | **2** |
| Route-level SQL calls | 33 | **14** |
| Repositories / repository SQL calls | 0 / 0 | **4 / 21** |
| Statements / branches / functions / lines coverage | NOT RUN | **75.18% / 78.68% / 83.44% / 75.37%** |

The complexity warnings that disappeared are exactly the rewritten
`parseCsv` (11) and auth handler (10). The four remaining warnings are in
`budgetsService.ts` and `transactionsService.ts` and are covered by tests; they
were out of scope for the testing-only commit. Full-repo duplication rose
because the codebase more than doubled and new controllers share an
error-handling block and the two integration suites share setup; scoped to the
rewritten modules duplication is zero. Full evidence: `docs/metrics/comparison.md`.

## 6. Verification

- Client production build: PASS (`tsc -b && vite build`, 3472 modules).
- Server production build: PASS (`tsc -b`).
- Repository lint: PASS (`npm run lint`, 0 errors).
- Server unit: 93/93 PASS.
- Server integration (real PostgreSQL): 46/46 PASS, covering IT-01 to IT-12.
- Frontend: 15/15 PASS.
- Total: 154/154 PASS.
- Coverage: runs successfully; raw output in `docs/metrics/after/coverage.txt`.

The regression plan maps every Assignment 01 feature to an automated test or a
manual step. Browser click-through is the only **NOT RUN** item because the
repo has no E2E runner; the steps are in `docs/demo-checklist.md`.

## 7. Defects and lessons

Seven real defects were found and fixed (destructive migration path, insecure
secret fallback, compiled tests leaking into `test:unit`, parallel integration
collisions, missing coverage provider, one unused import, and two generated UI
files that broke `npm run lint`). They are listed with severity and fixing
commit in `docs/defect-log.md`.

The main lesson is that characterization tests make a rewrite safe: we could
change the internals aggressively and prove the contract had not moved. The
second is that test isolation is part of the test design — a shared PostgreSQL
database needs sequential files and an explicit exclusion for build output.

## 8. Evidence index

| Document | Contents |
|---|---|
| `docs/code-review.md` | Baseline problems with file/line references |
| `docs/migration-report.md` | Migration design, verification output, rollback |
| `docs/refactoring-transactions.md` | Transactions layering and trace |
| `docs/refactoring-budgets.md` | Budgets/analytics layering and trace |
| `docs/rewriting-report.md` | Characterization-first rewrite evidence |
| `docs/layer-checks.md` | Layer boundary checks |
| `docs/architecture-before.md`, `docs/architecture-after.md` | Diagrams |
| `docs/regression-test-plan.md` | Feature → test mapping |
| `docs/test-results.md` | Full test and coverage output |
| `docs/defect-log.md` | Defects, severity, fixes |
| `docs/metrics/comparison.md` | Before/after metrics |
| `docs/CHANGELOG.md` | Per-commit change history |
| `docs/team-contribution.md` | Ownership by commit |
| `docs/demo-checklist.md` | Step-by-step demo |
