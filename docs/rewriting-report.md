# Rewriting Report — Clean Class-Based Modules

**Assignment 02 · Commit 5 · Part C (Rewrite)**
**Author:** Uzair
**Date:** 2026-11-08

## Chosen modules and why

I read the current code plus `docs/metrics/before/eslint-complexity.txt` and
`docs/metrics/before/jscpd.txt`. Two modules had the clearest, measured problems:

| Candidate | Before evidence | Decision |
|---|---|---|
| `server/src/utils/csv.ts` | `parseCsv` complexity **11** (limit 8); one large state machine doing tokenising, blank-row filtering and header mapping | **Rewrite** as `CsvParser` + `CsvFormatter` |
| `server/src/routes/auth.ts` | signup handler complexity **10**; SQL, HTTP, session handling, validation and bcrypt all in one route file | **Rewrite** as `AuthController` + `AuthService` + `AuthRepository` |

Rejected candidates: `backupValidation.ts` is already two tiny pure guards
(no real complexity problem), `AddTransaction.tsx` has complexity 9 but is
lower than the two chosen, and `transactions.ts` / `budgets.ts` were already
layered in earlier commits (705d244, 832f49f), so rewriting them again would
duplicate work.

## 1. CSV module

### Old responsibility / problem
`parseCsv` was a single function containing a character state machine, blank
record filtering, header normalisation and row-object construction. It mixed
three responsibilities and scored complexity 11. Formatting was a second
stand-alone function with its own escaping rules.

### New design
- `CsvFormatter` — `format()` → `formatRecord()` → `escapeField()` /
  `needsQuoting()`. One job: turn headers + rows into CSV text.
- `CsvParser` — `parse()` → `normalizeLineEndings()` / `parseRecords()` /
  `readField()` → `readPlainField()` / `readQuotedField()` → `readHeaders()` /
  `toRow()` / `isBlankRecord()`. Each method has one job and no method exceeds
  the complexity limit.
- Delimiter, quote and line-break constants replace inline literals.
- Public functions `toCsv()` and `parseCsv()` are kept as thin wrappers so the
  existing `TransactionsService`, tests and callers are untouched.

### Why a rewrite instead of a refactor
The original loop combined tokenisation and row building in one scope; any
partial refactor would still leave the same nested branch structure. Splitting
the state machine into named read-splitting methods and moving header/row
mapping into separate steps removes the complexity rather than moving it.

### Behaviour preserved
`src/utils/csv.characterization.test.ts` (20 tests) was written and run against
the **old** implementation first, then re-run unchanged after the rewrite.
It covers quoting, escaped quotes, embedded commas/newlines, CRLF, blank lines,
header lower-casing/trimming, missing/extra columns, empty input and round-trip.

Valid-CSV behaviour is identical. One intentionally documented edge change:
a double quote is only opened as a quoted field at the start of a field
(RFC 4180); the old code toggled quote mode even mid-field, which mangled
malformed input.

Real output against the old implementation (before rewrite):

```text
 RUN  v5.0.1 D:/SCD Assignment/ExpenseMatee/server

 Test Files  1 passed (1)
      Tests  20 passed (20)
```

After rewrite, characterization + original tests:

```text
 RUN  v5.0.1 D:/SCD Assignment/ExpenseMatee/server

 Test Files  2 passed (2)
      Tests  30 passed (30)
```

## 2. Auth module

### Old responsibility / problem
`routes/auth.ts` was the controller, service and repository at once: it read
`req.body`, validated input, normalised emails, ran raw SQL through `pool.query`,
called bcrypt, wrote `req.session`, and shaped responses. The signup handler
alone scored complexity 10, and the logic could not be unit-tested without a
real database and HTTP server.

### New design
- `AuthRepository` (`repositories/authRepository.ts`) — all SQL only:
  `findByEmail`, `findPublicById`, `create`, `updateBaseCurrency`. Pool is
  constructor-injected.
- `AuthService` (`services/authService.ts`) — all business rules only:
  validation, email normalisation, password hashing/verification, conflict
  detection, profile updates. It has no `req`/`res` and no SQL.
  Dependencies are injectable (`IAuthRepository`, `PasswordHasher`), and
  `MIN_PASSWORD_LENGTH`, `DEFAULT_BASE_CURRENCY` and `DEFAULT_BCRYPT_ROUNDS`
  replace magic literals. `BcryptPasswordHasher` wraps bcrypt.
- `AuthController` (`controllers/authController.ts`) — HTTP only: reads input,
  sets `req.session.userId`, returns the same JSON, maps `AppError` to status
  codes.
- `routes/auth.ts` now only wires routes to the controller, matching the
  transactions/budgets pattern from the previous commits.

### Why a rewrite instead of a refactor
The HTTP, session, validation, hashing and SQL concerns were interleaved in the
same handlers. A small refactor would still have left SQL and bcrypt inside the
route. Extracting a service and repository class is the only way to satisfy the
required Controller → Service → Repository direction and to inject a fake
repository/hasher for fast unit tests.

### Behaviour preserved
`src/integration/auth.characterization.test.ts` (15 HTTP tests) was written and
run against the **old** inline routes, capturing exact status codes, error
messages and JSON shapes (signup/login/session/logout/base-currency/profile).
It was then re-run unchanged against the new controller/service/repository.

Real output against the old implementation (before rewrite):

```text
 RUN  v5.0.1 D:/SCD Assignment/ExpenseMatee/server

 Test Files  1 passed (1)
      Tests  15 passed (15)
```

After rewrite:

```text
 RUN  v5.0.1 D:/SCD Assignment/ExpenseMatee/server

 Test Files  1 passed (1)
      Tests  15 passed (15)
```

No endpoint, response shape or error message changed. New edge-case unit tests
(`src/services/authService.test.ts`, 15 tests) use a fake repository + fake
hasher to cover: default/custom base currency, email normalisation, duplicate
email, minimum-length boundary, non-string password, wrong password, unknown
email, missing credentials, profile lookup/update and password never leaking.

## 3. Complexity and duplication — after

Commands follow `docs/metrics/METHOD.md`.

### ESLint complexity, rewritten files only

```text
> npx eslint server/src/utils/csv.ts server/src/services/authService.ts `
    server/src/repositories/authRepository.ts server/src/controllers/authController.ts `
    server/src/routes/auth.ts --rule '{"complexity": ["warn", 8]}'

(no output — 0 warnings, 0 errors)
```

Saved to `docs/metrics/after/eslint-complexity-rewritten.txt`.

The previous `parseCsv` (complexity **11**) and signup handler (complexity
**10**) no longer appear. The full `server/src` run
(`docs/metrics/after/eslint-complexity.txt`) still reports warnings in
`budgetsService.ts` / `transactionsService.ts` and one unused import in
`budgetsService.test.ts`; those files were produced by the other layering
commits, not by this rewrite, and are out of scope here.

### jscpd, rewritten files only

```text
> npx jscpd server/src/utils/csv.ts server/src/services/authService.ts `
    server/src/repositories/authRepository.ts server/src/controllers/authController.ts `
    server/src/routes/auth.ts

No duplicates found.
...
│ typescript  │ 5 │ 432 │ 2581 │ 0 │ 0 (0.00%) │ 0 (0.00%) │
Found 0 clones.
```

Saved to `docs/metrics/after/jscpd-rewritten.txt`. The full-repo run is saved
as `docs/metrics/after/jscpd.txt` for context; its percentage is higher than
the Assignment 01 baseline because other commits added more source and test
files, and it detects the shared controller error-handling pattern and the
shared integration-test setup, not duplication inside the rewritten modules.

## 4. Full test suite

Backend build (`tsc -b`):

```text
> expensemate-server@1.0.0 build
> tsc -b
```

Backend unit tests:

```text
> expensemate-server@1.0.0 test:unit
> vitest run --exclude src/integration/** --exclude dist/**

 Test Files  8 passed (8)
      Tests  93 passed (93)
```

Backend integration tests (real PostgreSQL, `expensemate_test`):

```text
> expensemate-server@1.0.0 test:integration
> vitest run src/integration --maxWorkers=1

 Test Files  3 passed (3)
      Tests  46 passed (46)
```

Frontend tests:

```text
> expense-tracker@0.0.0 test
> vitest run

 Test Files  7 passed (7)
      Tests  15 passed (15)
```

## 5. Files changed

| File | Change |
|---|---|
| `server/src/utils/csv.ts` | rewritten as `CsvParser` + `CsvFormatter`; `parseCsv`/`toCsv` wrappers kept |
| `server/src/utils/csv.characterization.test.ts` | new — 20 behaviour-locking tests (run before and after) |
| `server/src/types/user.ts` | new — user/auth types |
| `server/src/repositories/authRepository.ts` | new — SQL-only auth data access |
| `server/src/services/authService.ts` | new — auth business rules + injectable hasher |
| `server/src/controllers/authController.ts` | new — HTTP/session handling only |
| `server/src/routes/auth.ts` | rewritten as thin route wiring |
| `server/src/services/authService.test.ts` | new — 15 isolated unit/edge-case tests |
| `server/src/integration/auth.characterization.test.ts` | new — 15 HTTP contract tests (run before and after) |
| `docs/metrics/after/*` | new — real ESLint complexity + jscpd output |
