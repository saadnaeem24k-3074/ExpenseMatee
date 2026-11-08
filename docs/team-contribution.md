# Team Contribution — Assignment 02

| Commit | Hash | Message | Owner |
|---|---|---|---|
| 1 | `843db2e` | Setup: code review and before-metrics for Assignment 02 | Uzair |
| 2 | `5e8312c` | `feat(migration): versioned DB migrations with data verification and centralised config` | Saad Naeem |
| 3 | `705d244` | `refactor(transactions): controller-service-repository layering for transactions` | Uzair |
| 4 | `832f49f` | `refactor(budgets): layered budgets and monthly summary with unit tests` | Uzair |
| 5 | `547fb72` | `refactor(rewrite): rewrite CsvParser/CsvFormatter and AuthService with tests and report` | Uzair (assignment task owner; committed from the shared workstation account) |
| 6 | pending | `test(docs): integration and regression tests, metrics comparison, final reports` | Saad Naeem |

## Saad Naeem

- Designed the versioned migration system and data-safety verification
  (`001_initial_schema.sql`, `002_transaction_integrity.sql`,
  `verifyMigration.ts`, `docs/migration-report.md`).
- Centralised configuration and removed the insecure session-secret fallback.
- Reviewed the CSV/Auth rewrite, the characterization approach and the layer
  boundary checks (`docs/rewriting-report.md`, `docs/layer-checks.md`).
- Prepared the final integration/regression plan, test evidence, before/after
  metrics comparison, defect log, final report and demo checklist.

## Uzair

- Produced the baseline code review, baseline test evidence and "before"
  metrics (`docs/code-review.md`, `docs/baseline-test-results.md`,
  `docs/metrics/before/`).
- Implemented the transactions Controller → Service → Repository split and the
  transaction unit tests (`docs/refactoring-transactions.md`).
- Implemented the budgets and analytics layering, budget-status logic and unit
  tests (`docs/refactoring-budgets.md`, `docs/layer-checks.md`).
- Owned the CSV/Auth rewrite task in the assignment plan: characterization
  suites, `CsvParser`/`CsvFormatter`, `AuthRepository`/`AuthService`/
  `AuthController` and `docs/rewriting-report.md`.

## Shared

- Both members ran the full suites and read the final diff.
- Both can trace the "Add Transaction", "Monthly Budget Summary" and
  "CSV import/export" requests through route → controller → service →
  repository → PostgreSQL.
- Both can explain the migration checksum/tracking mechanism and why the
  integration tests now run sequentially.
