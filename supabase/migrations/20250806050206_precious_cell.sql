/*
  # Enhanced Laundromat System with Services and Roles

  1. New Tables
    - `services` - Configurable services and pricing
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `display_name` (text)
      - `base_price` (decimal)
      - `price_per_item` (decimal, nullable)
      - `price_per_kg` (decimal, nullable)
      - `requires_weight` (boolean, default false)
      - `requires_items` (boolean, default true)
      - `is_active` (boolean, default true)
      - `created_at` (timestamp)

  2. Updates
    - Update users table to have proper role management
    - Add default services data

  3. Security
    - Enable RLS on services table
    - Add policies for role-based access
*/

-- Create services table
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  display_name text NOT NULL,
  base_price decimal(10,2) NOT NULL DEFAULT 0,
  price_per_item decimal(10,2),
  price_per_kg decimal(10,2),
  requires_weight boolean DEFAULT false,
  requires_items boolean DEFAULT true,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on services table
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- Create policies for services table
CREATE POLICY "Everyone can read active services"
  ON services
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Only owners can manage services"
  ON services
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'owner'
    )
  );

-- Insert default services (in KSH)
INSERT INTO services (name, display_name, base_price, price_per_item, price_per_kg, requires_weight, requires_items) VALUES
('ironing', 'Ironing Service', 0, 100, NULL, false, true),
('laundry-bags', 'Laundry Bags (Sale)', 0, 200, NULL, false, true),
('express-wash', 'Express Wash & Dry', 300, NULL, 150, true, true),
('normal-wash', 'Normal Wash & Dry', 200, NULL, 120, true, true),
('duvet-wash', 'Duvet/Comforter Wash', 0, 600, NULL, false, true),
('wash-fold', 'Wash & Fold', 200, NULL, 100, true, true),
('single-shirt', 'Single Shirt', 0, 80, NULL, false, true),
('single-trouser', 'Single Trouser', 0, 120, NULL, false, true),
('single-dress', 'Single Dress', 0, 150, NULL, false, true),
('single-jacket', 'Single Jacket', 0, 200, NULL, false, true),
('single-bedsheet', 'Single Bedsheet', 0, 100, NULL, false, true),
('single-curtain', 'Single Curtain', 0, 250, NULL, false, true)
ON CONFLICT (name) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS services_active_idx ON services(is_active);
CREATE INDEX IF NOT EXISTS services_name_idx ON services(name);