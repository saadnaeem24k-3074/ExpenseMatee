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
