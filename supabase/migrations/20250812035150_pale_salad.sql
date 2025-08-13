/*
  # Add Discount Functionality to Orders

  1. Updates
    - Add `discount_amount` column to orders table
    - Add `discount_reason` column to orders table
    - Add `subtotal` column to orders table (amount before discount)

  2. Changes
    - `total_amount` becomes final amount after discount
    - `subtotal` stores original calculated amount
    - `discount_amount` stores discount given
    - `discount_reason` stores reason for discount
*/

-- Add discount columns to orders table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'subtotal'
  ) THEN
    ALTER TABLE orders ADD COLUMN subtotal decimal(10,2) DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'discount_amount'
  ) THEN
    ALTER TABLE orders ADD COLUMN discount_amount decimal(10,2) DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'discount_reason'
  ) THEN
    ALTER TABLE orders ADD COLUMN discount_reason text;
  END IF;
END $$;

-- Update existing orders to have subtotal equal to total_amount
UPDATE orders 
SET subtotal = total_amount 
WHERE subtotal = 0 OR subtotal IS NULL;