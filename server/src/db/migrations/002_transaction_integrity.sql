-- 002_transaction_integrity.sql
-- Strengthen data integrity for transactions and speed up type-filtered
-- per-user reporting queries.
--
-- The CHECK constraint is added as NOT VALID on purpose: it is enforced for
-- all new and updated rows immediately, but existing Assignment 01 rows are
-- not scanned during the migration. That keeps the migration safe even if old
-- data contains zero or negative amounts. It can be validated later, after
-- cleaning up historical rows, with:
--   ALTER TABLE transactions VALIDATE CONSTRAINT transactions_amount_positive;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'transactions_amount_positive'
  ) THEN
    ALTER TABLE transactions
      ADD CONSTRAINT transactions_amount_positive CHECK (amount > 0) NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_transactions_user_type_date
  ON transactions(user_id, type, date);
