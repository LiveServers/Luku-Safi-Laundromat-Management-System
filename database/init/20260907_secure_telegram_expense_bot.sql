-- ============================================================================
-- Luku Safi - Secure Telegram Expense Bot
-- Migration: 20260907_secure_telegram_expense_bot.sql
--
-- PURPOSE
-- -------
-- 1. Make expense location mandatory.
-- 2. Tag expenses by source so Telegram-created rows can be isolated.
-- 3. Create a dedicated PostgreSQL login for the Telegram bot.
-- 4. Create a separate NOLOGIN executor role with narrowly-scoped privileges.
-- 5. Enable Row-Level Security (RLS) so the bot can only see/update rows
--    created by Telegram.
-- 6. Expose only controlled database functions to the login role.
--
-- IMPORTANT
-- ---------
-- Run this migration as the database owner / PostgreSQL administrator because
-- it creates roles, policies, functions, and grants.
--
-- DO NOT put the Telegram database password in this migration or commit it.
-- Set the password after the migration using:
--
--   ALTER ROLE telegram_expense_bot PASSWORD 'A_LONG_RANDOM_PASSWORD';
--
-- Prefer setting that password interactively or from your secret manager.
--
-- This migration deliberately does NOT grant DELETE access to the Telegram bot.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- STEP 1: Ensure every expense already has a location before enforcing NOT NULL.
-- ---------------------------------------------------------------------------
-- We cannot safely guess a branch for historical expenses. If any NULL rows
-- exist, stop the migration and assign the correct location_id manually.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM expenses
    WHERE location_id IS NULL
  ) THEN
    RAISE EXCEPTION
      'Migration stopped: expenses with NULL location_id exist. Assign the correct branch to those rows first.';
  END IF;
END
$$;

ALTER TABLE expenses
  ALTER COLUMN location_id SET NOT NULL;

-- ---------------------------------------------------------------------------
-- STEP 2: Add audit/source columns.
-- ---------------------------------------------------------------------------
-- Existing rows are considered to have originated from the normal web/admin
-- application. Telegram inserts will explicitly use 'telegram'.
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS created_by_source TEXT;

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS updated_by_source TEXT;

UPDATE expenses
SET created_by_source = 'web'
WHERE created_by_source IS NULL;

ALTER TABLE expenses
  ALTER COLUMN created_by_source SET DEFAULT 'web';

ALTER TABLE expenses
  ALTER COLUMN created_by_source SET NOT NULL;

-- Keep source values constrained and predictable.
ALTER TABLE expenses
  DROP CONSTRAINT IF EXISTS expenses_created_by_source_check;

ALTER TABLE expenses
  ADD CONSTRAINT expenses_created_by_source_check
  CHECK (created_by_source IN ('web', 'telegram'));

ALTER TABLE expenses
  DROP CONSTRAINT IF EXISTS expenses_updated_by_source_check;

ALTER TABLE expenses
  ADD CONSTRAINT expenses_updated_by_source_check
  CHECK (
    updated_by_source IS NULL
    OR updated_by_source IN ('web', 'telegram')
  );

-- ---------------------------------------------------------------------------
-- STEP 3: Helpful indexes.
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_expenses_location_id
  ON expenses(location_id);

CREATE INDEX IF NOT EXISTS idx_expenses_date
  ON expenses(date DESC);

CREATE INDEX IF NOT EXISTS idx_expenses_created_by_source
  ON expenses(created_by_source);

-- ---------------------------------------------------------------------------
-- STEP 4: Create PostgreSQL roles.
-- ---------------------------------------------------------------------------
-- telegram_expense_executor:
--   - NOLOGIN: nobody can authenticate as this role.
--   - owns the controlled functions below.
--   - receives only the table privileges required by those functions.
--
-- telegram_expense_bot:
--   - LOGIN: used by Node.js.
--   - receives NO direct table privileges.
--   - can only execute functions in the telegram_expense_api schema.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_roles WHERE rolname = 'telegram_expense_executor'
  ) THEN
    CREATE ROLE telegram_expense_executor
      NOLOGIN
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE
      NOINHERIT
      NOBYPASSRLS;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_roles WHERE rolname = 'telegram_expense_bot'
  ) THEN
    CREATE ROLE telegram_expense_bot
      LOGIN
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE
      NOINHERIT
      NOBYPASSRLS;
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- STEP 5: Remove accidental/default access from the bot login.
-- ---------------------------------------------------------------------------
REVOKE ALL ON SCHEMA public FROM telegram_expense_bot;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM telegram_expense_bot;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM telegram_expense_bot;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM telegram_expense_bot;

-- The executor must be able to reference the public schema.
GRANT USAGE ON SCHEMA public TO telegram_expense_executor;

-- ---------------------------------------------------------------------------
-- STEP 6: Enable RLS on expenses.
-- ---------------------------------------------------------------------------
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Telegram executor may only SELECT Telegram-created expenses.
DROP POLICY IF EXISTS telegram_expense_select_policy ON expenses;

CREATE POLICY telegram_expense_select_policy
ON expenses
FOR SELECT
TO telegram_expense_executor
USING (created_by_source = 'telegram');

-- Telegram executor may only INSERT rows explicitly tagged as Telegram rows.
DROP POLICY IF EXISTS telegram_expense_insert_policy ON expenses;

CREATE POLICY telegram_expense_insert_policy
ON expenses
FOR INSERT
TO telegram_expense_executor
WITH CHECK (created_by_source = 'telegram');

-- Telegram executor may only UPDATE rows originally created by Telegram, and
-- the update cannot change that row into a non-Telegram row.
DROP POLICY IF EXISTS telegram_expense_update_policy ON expenses;

CREATE POLICY telegram_expense_update_policy
ON expenses
FOR UPDATE
TO telegram_expense_executor
USING (created_by_source = 'telegram')
WITH CHECK (created_by_source = 'telegram');

-- No DELETE policy is created. DELETE is therefore denied by RLS even if a
-- DELETE grant were accidentally introduced later.

-- ---------------------------------------------------------------------------
-- STEP 7: Grant the executor ONLY the table/column privileges it requires.
-- ---------------------------------------------------------------------------
-- SELECT is limited to columns needed by the Telegram bot.
GRANT SELECT (
  id,
  category,
  description,
  amount,
  date,
  transaction_code,
  created_at,
  updated_at,
  location_id,
  created_by_source,
  updated_by_source
)
ON expenses
TO telegram_expense_executor;

-- INSERT only the fields the bot is allowed to create.
GRANT INSERT (
  category,
  description,
  amount,
  date,
  transaction_code,
  location_id,
  created_by_source
)
ON expenses
TO telegram_expense_executor;

-- UPDATE only mutable expense fields plus Telegram audit fields.
GRANT UPDATE (
  category,
  description,
  amount,
  date,
  transaction_code,
  location_id,
  updated_at,
  updated_by_source
)
ON expenses
TO telegram_expense_executor;

-- The bot needs branch names/UUIDs for validation, but no other table access.
GRANT SELECT (
  id,
  name,
  display_name,
  address,
  is_active
)
ON locations
TO telegram_expense_executor;

-- ---------------------------------------------------------------------------
-- STEP 8: Create a private API schema for bot database functions.
-- ---------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS telegram_expense_api;

REVOKE ALL ON SCHEMA telegram_expense_api FROM PUBLIC;
GRANT USAGE ON SCHEMA telegram_expense_api TO telegram_expense_bot;
GRANT USAGE ON SCHEMA telegram_expense_api TO telegram_expense_executor;

-- ---------------------------------------------------------------------------
-- STEP 9: Function - list active locations.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION telegram_expense_api.list_locations()
RETURNS TABLE (
  id UUID,
  name TEXT,
  display_name TEXT,
  address TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT l.id, l.name, l.display_name, l.address
  FROM locations l
  WHERE l.is_active = TRUE
  ORDER BY l.display_name ASC;
$$;

ALTER FUNCTION telegram_expense_api.list_locations()
OWNER TO telegram_expense_executor;

REVOKE ALL ON FUNCTION telegram_expense_api.list_locations() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION telegram_expense_api.list_locations()
TO telegram_expense_bot;

-- ---------------------------------------------------------------------------
-- STEP 10: Function - create one Telegram expense.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION telegram_expense_api.create_expense(
  p_location_id UUID,
  p_category TEXT,
  p_description TEXT,
  p_amount NUMERIC,
  p_date DATE,
  p_transaction_code TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  category TEXT,
  description TEXT,
  amount NUMERIC,
  date DATE,
  transaction_code TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  location_id UUID,
  location_name TEXT,
  created_by_source TEXT,
  updated_by_source TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id UUID;
BEGIN
  -- Database-level validation. Application validation still runs too.
  IF p_location_id IS NULL THEN
    RAISE EXCEPTION 'location_id is required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM locations
    WHERE locations.id = p_location_id
      AND locations.is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'Invalid or inactive location';
  END IF;

  IF p_category IS NULL OR BTRIM(p_category) = '' THEN
    RAISE EXCEPTION 'category is required';
  END IF;

  IF p_description IS NULL OR BTRIM(p_description) = '' THEN
    RAISE EXCEPTION 'description is required';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'amount must be greater than 0';
  END IF;

  IF p_date IS NULL THEN
    RAISE EXCEPTION 'date is required';
  END IF;

  INSERT INTO expenses (
    category,
    description,
    amount,
    date,
    transaction_code,
    location_id,
    created_by_source
  )
  VALUES (
    p_category,
    BTRIM(p_description),
    p_amount,
    p_date,
    NULLIF(BTRIM(p_transaction_code), ''),
    p_location_id,
    'telegram'
  )
  RETURNING expenses.id INTO v_id;

  RETURN QUERY
  SELECT
    e.id,
    e.category,
    e.description,
    e.amount,
    e.date,
    e.transaction_code,
    e.created_at,
    e.updated_at,
    e.location_id,
    l.display_name,
    e.created_by_source,
    e.updated_by_source
  FROM expenses e
  JOIN locations l ON l.id = e.location_id
  WHERE e.id = v_id;
END;
$$;

ALTER FUNCTION telegram_expense_api.create_expense(
  UUID, TEXT, TEXT, NUMERIC, DATE, TEXT
)
OWNER TO telegram_expense_executor;

REVOKE ALL ON FUNCTION telegram_expense_api.create_expense(
  UUID, TEXT, TEXT, NUMERIC, DATE, TEXT
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION telegram_expense_api.create_expense(
  UUID, TEXT, TEXT, NUMERIC, DATE, TEXT
) TO telegram_expense_bot;

-- ---------------------------------------------------------------------------
-- STEP 11: Function - get one Telegram-created expense.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION telegram_expense_api.get_expense(
  p_id UUID
)
RETURNS TABLE (
  id UUID,
  category TEXT,
  description TEXT,
  amount NUMERIC,
  date DATE,
  transaction_code TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  location_id UUID,
  location_name TEXT,
  created_by_source TEXT,
  updated_by_source TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    e.id,
    e.category,
    e.description,
    e.amount,
    e.date,
    e.transaction_code,
    e.created_at,
    e.updated_at,
    e.location_id,
    l.display_name,
    e.created_by_source,
    e.updated_by_source
  FROM expenses e
  JOIN locations l ON l.id = e.location_id
  WHERE e.id = p_id
    AND e.created_by_source = 'telegram';
$$;

ALTER FUNCTION telegram_expense_api.get_expense(UUID)
OWNER TO telegram_expense_executor;

REVOKE ALL ON FUNCTION telegram_expense_api.get_expense(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION telegram_expense_api.get_expense(UUID)
TO telegram_expense_bot;

-- ---------------------------------------------------------------------------
-- STEP 12: Function - recent Telegram-created expenses.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION telegram_expense_api.recent_expenses(
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  category TEXT,
  description TEXT,
  amount NUMERIC,
  date DATE,
  transaction_code TEXT,
  location_id UUID,
  location_name TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    e.id,
    e.category,
    e.description,
    e.amount,
    e.date,
    e.transaction_code,
    e.location_id,
    l.display_name
  FROM expenses e
  JOIN locations l ON l.id = e.location_id
  WHERE e.created_by_source = 'telegram'
  ORDER BY e.date DESC, e.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 10), 1), 25);
$$;

ALTER FUNCTION telegram_expense_api.recent_expenses(INTEGER)
OWNER TO telegram_expense_executor;

REVOKE ALL ON FUNCTION telegram_expense_api.recent_expenses(INTEGER)
FROM PUBLIC;

GRANT EXECUTE ON FUNCTION telegram_expense_api.recent_expenses(INTEGER)
TO telegram_expense_bot;

-- ---------------------------------------------------------------------------
-- STEP 13: Function - update one Telegram-created expense.
-- ---------------------------------------------------------------------------
-- The application reads the current row, merges the requested field change,
-- then sends the COMPLETE desired row to this function.
--
-- This avoids dynamic SQL and keeps the database API narrow.
CREATE OR REPLACE FUNCTION telegram_expense_api.update_expense(
  p_id UUID,
  p_location_id UUID,
  p_category TEXT,
  p_description TEXT,
  p_amount NUMERIC,
  p_date DATE,
  p_transaction_code TEXT
)
RETURNS TABLE (
  id UUID,
  category TEXT,
  description TEXT,
  amount NUMERIC,
  date DATE,
  transaction_code TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  location_id UUID,
  location_name TEXT,
  created_by_source TEXT,
  updated_by_source TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM expenses
    WHERE expenses.id = p_id
      AND expenses.created_by_source = 'telegram'
  ) THEN
    RAISE EXCEPTION 'Expense not found or is not editable by Telegram';
  END IF;

  IF p_location_id IS NULL THEN
    RAISE EXCEPTION 'location_id is required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM locations
    WHERE locations.id = p_location_id
      AND locations.is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'Invalid or inactive location';
  END IF;

  IF p_category IS NULL OR BTRIM(p_category) = '' THEN
    RAISE EXCEPTION 'category is required';
  END IF;

  IF p_description IS NULL OR BTRIM(p_description) = '' THEN
    RAISE EXCEPTION 'description is required';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'amount must be greater than 0';
  END IF;

  IF p_date IS NULL THEN
    RAISE EXCEPTION 'date is required';
  END IF;

  UPDATE expenses
  SET
    location_id = p_location_id,
    category = p_category,
    description = BTRIM(p_description),
    amount = p_amount,
    date = p_date,
    transaction_code = NULLIF(BTRIM(p_transaction_code), ''),
    updated_at = NOW(),
    updated_by_source = 'telegram'
  WHERE expenses.id = p_id
    AND expenses.created_by_source = 'telegram';

  RETURN QUERY
  SELECT
    e.id,
    e.category,
    e.description,
    e.amount,
    e.date,
    e.transaction_code,
    e.created_at,
    e.updated_at,
    e.location_id,
    l.display_name,
    e.created_by_source,
    e.updated_by_source
  FROM expenses e
  JOIN locations l ON l.id = e.location_id
  WHERE e.id = p_id
    AND e.created_by_source = 'telegram';
END;
$$;

ALTER FUNCTION telegram_expense_api.update_expense(
  UUID, UUID, TEXT, TEXT, NUMERIC, DATE, TEXT
)
OWNER TO telegram_expense_executor;

REVOKE ALL ON FUNCTION telegram_expense_api.update_expense(
  UUID, UUID, TEXT, TEXT, NUMERIC, DATE, TEXT
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION telegram_expense_api.update_expense(
  UUID, UUID, TEXT, TEXT, NUMERIC, DATE, TEXT
) TO telegram_expense_bot;

-- ---------------------------------------------------------------------------
-- STEP 14: Prevent future objects from accidentally becoming public.
-- ---------------------------------------------------------------------------
ALTER DEFAULT PRIVILEGES IN SCHEMA telegram_expense_api
REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

COMMIT;

-- ============================================================================
-- POST-MIGRATION - REQUIRED MANUAL STEP
-- ============================================================================
-- Set a strong password without committing it to Git:
--
--   ALTER ROLE telegram_expense_bot
--   PASSWORD '<long-random-password>';
--
-- Then create a Telegram-only connection string:
--
--   postgresql://telegram_expense_bot:<password>@postgres:5432/<database>
--
-- If PostgreSQL runs in Docker, do NOT expose 5432 publicly.
-- Prefer no "ports:" entry at all, or bind only to loopback:
--
--   ports:
--     - "127.0.0.1:5432:5432"
--
-- Your firewall should also reject inbound TCP/5432 from the internet.
-- ============================================================================
