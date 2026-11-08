# Before / After Metrics Comparison

All numbers below are measured from the saved command output in
`docs/metrics/before/` and `docs/metrics/after/`, using the exact commands in
`docs/metrics/METHOD.md`. Nothing is estimated.

**Baseline:** `assignment-01-baseline` / commit 1 (`843db2e`)
**After:** commit 6 (testing and documentation)

## Summary table

| Metric | Before | After | Evidence |
|---|---:|---:|---|
| ESLint complexity warnings (> 8) | 5 | 4 | `before/eslint-complexity.txt`, `after/eslint-complexity.txt` |
| Highest reported complexity | 11 | 16 | same files |
| jscpd duplicated lines (total repo) | 0.72% (12 / 1,676) | 2.47% (105 / 4,248) | `before/jscpd.txt`, `after/jscpd.txt` |
| jscpd duplicated tokens | 0.95% (119 / 12,526) | 2.29% (619 / 27,064) | same files |
| jscpd clones inside rewritten CSV/auth modules | n/a | 0 | `after/jscpd-rewritten.txt` |
| Source files importing `pool` directly | 8 | 8 | `before/pool-usage.txt`, `after/pool-usage.txt` |
| Route files importing `pool` directly | 6 of 6 | 2 (`backup.ts`, `currencies.ts`) | same files |
| Route-level `pool.query` / `client.query` calls | 33 | 14 | same files |
| Repository files / SQL calls | 0 / 0 | 4 / 21 | `after/pool-usage.txt` |
| Controllers or services importing `pool` | 0 | 0 | `after/pool-usage.txt` |
| Route files mixing HTTP + validation + business + SQL | 6 | 2 | `after/pool-usage.txt`, `docs/layer-checks.md` |
| Automated test files | 12 | 18 | test runs below |
| Automated tests passing | 73 | 154 | test runs below |
| Coverage — statements | NOT RUN (provider missing) | 75.18% | `after/coverage.txt` |
| Coverage — branches | NOT RUN | 78.68% | `after/coverage.txt` |
| Coverage — functions | NOT RUN | 83.44% | `after/coverage.txt` |
| Coverage — lines | NOT RUN | 75.37% | `after/coverage.txt` |

## Notes on each metric (honest interpretation)

- **Complexity.** Five warnings became four. The two modules rewritten in
  commit 5 (`csv.ts` complexity 11, `auth.ts` complexity 10) no longer appear in
  the report at all. The four remaining warnings are in
  `budgetsService.ts` (16) and `transactionsService.ts` (13, 14, 11), introduced
  by the earlier layering commits; they were left unchanged because commit 6 is
  testing/documentation only. The "highest" number therefore went up even
  though the targeted warnings were removed.
- **Duplication.** The full-repo percentage rose because the codebase roughly
  doubled in size and the new controllers share an identical error-handling
  block, the two integration suites share a setup block, and
  `transactionsService.ts` repeats its create/update validation. Scoped to the
  two modules rewritten in commit 5, jscpd reports **0 clones**.
- **`pool` coupling.** The raw count of source files importing `pool` is still
  8, but the composition changed: before it was `app.ts` + `migrate.ts` + all
  6 route files; after it is `app.ts` + `migrate.ts` + 4 repositories + only 2
  route files (`backup.ts`, `currencies.ts`, which were not in scope). SQL moved
  from routes (33 calls) into repositories (21 calls); route-level calls dropped
  to 14. Controllers and services import `pool` **zero** times.
- **Responsibilities.** Six route files previously owned HTTP handling,
  validation, business rules and SQL together. After commits 3–5, four
  subsystems are split into 4 controllers / 4 services / 4 repositories, each
  with a single responsibility. `backup.ts` and `currencies.ts` still contain
  their original inline logic (documented as a known limitation).
- **Tests and coverage.** 73 → 154 passing tests. The baseline coverage run
  could not execute because `@vitest/coverage-v8` was not installed; it is now
  a dev dependency and the measured coverage is 75.18% statements / 78.68%
  branches / 83.44% functions / 75.37% lines.
