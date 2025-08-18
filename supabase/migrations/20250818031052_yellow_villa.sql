/*
  # Add Transaction Codes to Orders and Expenses

  1. Updates
    - Add `transaction_code` column to orders table
    - Add `transaction_code` column to expenses table
    - Add `order_date` column to orders table for custom date entry

  2. Changes
    - Orders can have custom dates for backdating
    - Both orders and expenses can track transaction codes for payments
*/

-- Add transaction code and custom date to orders table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'transaction_code'
  ) THEN
    ALTER TABLE orders ADD COLUMN transaction_code text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'order_date'
  ) THEN
    ALTER TABLE orders ADD COLUMN order_date date DEFAULT CURRENT_DATE;
  END IF;
END $$;

-- Add transaction code to expenses table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'transaction_code'
  ) THEN
    ALTER TABLE expenses ADD COLUMN transaction_code text;
  END IF;
END $$;

-- DO $$
-- BEGIN
--   IF NOT EXISTS (
--     SELECT 1 FROM information_schema.columns
--     WHERE table_name = 'expenses' AND column_name = 'expense_date'
--   ) THEN
--     ALTER TABLE expenses ADD COLUMN expense_date date DEFAULT CURRENT_DATE;
--   END IF;
-- END $$;

-- Update existing orders to have order_date equal to created_at date
UPDATE orders 
SET order_date = created_at::date 
WHERE order_date IS NULL;

-- UPDATE expenses 
-- SET expense_date = created_at::date 
-- WHERE expense_date IS NULL;