# Metrics Collection Methodology

This document details the exact commands, environments, configurations, and reproduction steps used to collect the maintainability metrics for the codebase.

## 1. Environment & Setup

- **Node.js**: v20+ / npm v10+
- **Platform**: Windows / PowerShell (also compatible with bash / macOS / Linux)
- **Target Subsystem**: `server/src` (Backend codebase)

---

## 2. Metric Collection Commands

### A. Cyclomatic Complexity Report (ESLint)
- **Goal**: Identify functions in `server/src` whose cyclomatic complexity exceeds the allowed threshold of 8.
- **Rule**: `complexity: ["warn", 8]`
- **Command**:
  ```bash
  npx eslint server/src --rule '{"complexity": ["warn", 8]}'
  ```
- **Output File**: `docs/metrics/before/eslint-complexity.txt`
- **Output Summary**:
  - `server/src/routes/auth.ts`: 1 function (complexity 10)
  - `server/src/routes/transactions.ts`: 3 functions (complexity 11, 9, 9)
  - `server/src/utils/csv.ts`: 1 function (`parseCsv`, complexity 11)
  - **Total**: 5 functions exceeding complexity threshold of 8.

---

### B. Duplicated Code Detection (jscpd)
- **Goal**: Detect copy-pasted blocks, structural clones, and token duplications in `server/src`.
- **Tool**: `jscpd` (v5.4.2+)
- **Command**:
  ```bash
  npx jscpd server/src
  ```
- **Output File**: `docs/metrics/before/jscpd.txt`
- **Output Summary**:
  - 19 files analyzed (1,676 lines, 12,526 tokens)
  - 2 clones found (12 duplicated lines, 119 duplicated tokens, ~0.72% duplication)
  - Clones detected between `routes/analytics.ts` and `routes/budgets.ts` (date parsing logic), and inside `routes/transactions.ts` (POST and PUT transaction body validation).

---

### C. Direct Database Coupling (`pool` Imports & Queries)
- **Goal**: Count the number of files directly importing PostgreSQL connection `pool` and the total number of `pool.query` / `client.query` calls per file.
- **Method**: Static analysis across TypeScript files in `server/src`.
- **Command (PowerShell)**:
  ```powershell
  cd server
  Get-ChildItem -Path src -Recurse -Filter *.ts | ForEach-Object {
      $content = Get-Content $_.FullName -Raw
      $hasPoolImport = $content -match "import\s+.*pool.*from"
      $queryMatches = [regex]::Matches($content, "(?:pool|client)\.query")
      [PSCustomObject]@{
          File = $_.FullName.Substring($_.FullName.IndexOf("src"))
          ImportsPool = $hasPoolImport
          PoolQueryCount = $queryMatches.Count
      }
  } | Format-Table -AutoSize
  ```
- **Command (POSIX sh / grep)**:
  ```bash
  # Files importing pool:
  grep -rn "import.*pool.*from" server/src/

  # Number of query invocations per file:
  grep -o -E "(pool|client)\.query" server/src/routes/* | cut -d: -f1 | sort | uniq -c
  ```
- **Output File**: `docs/metrics/before/pool-usage.txt`
- **Output Summary**:
  - Direct `pool` imports: 8 files (`app.ts`, `migrate.ts`, and all 6 route files: `analytics.ts`, `auth.ts`, `backup.ts`, `budgets.ts`, `currencies.ts`, `transactions.ts`).
  - Total `pool.query` / `client.query` calls in route handlers: **33 calls**.

---

### D. Test Coverage
- **Goal**: Measure line, statement, branch, and function coverage across the test suites.
- **Command**:
  ```bash
  cd server
  npx vitest run --coverage
  ```
- **Output File**: `docs/metrics/before/coverage.txt`
- **Status**: Vitest reports `MISSING DEPENDENCY Cannot find dependency '@vitest/coverage-v8'`. Coverage will be generated once the v8 coverage provider is installed or configured.
