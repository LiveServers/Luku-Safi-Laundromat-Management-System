/*
  # Laundromat Management System Database Schema

  1. New Tables
    - `users` - System users (laundromat owners/staff)
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `password` (text, hashed)
      - `name` (text)
      - `role` (text, default 'owner')
      - `created_at` (timestamp)
    - `customers` - Laundromat customers
      - `id` (uuid, primary key)
      - `name` (text)
      - `email` (text, nullable)
      - `phone` (text, nullable)
      - `address` (text, nullable)
      - `created_at` (timestamp)
    - `orders` - Service orders
      - `id` (uuid, primary key)
      - `customer_id` (uuid, foreign key to customers)
      - `service_type` (text)
      - `weight` (decimal)
      - `items` (integer)
      - `total_amount` (decimal)
      - `payment_status` (text, default 'pending')
      - `status` (text, default 'received')
      - `notes` (text, nullable)
      - `created_at` (timestamp)
      - `completed_at` (timestamp, nullable)
    - `expenses` - Business expenses
      - `id` (uuid, primary key)
      - `category` (text)
      - `description` (text)
      - `amount` (decimal)
      - `date` (date)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their data
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password text NOT NULL,
  name text NOT NULL,
  role text DEFAULT 'owner',
  created_at timestamptz DEFAULT now()
);

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  address text,
  created_at timestamptz DEFAULT now()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  service_type text NOT NULL,
  weight decimal(10,2) DEFAULT 0,
  items integer DEFAULT 0,
  total_amount decimal(10,2) NOT NULL,
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'partial', 'cancelled')),
  status text DEFAULT 'received' CHECK (status IN ('received', 'processing', 'washing', 'drying', 'folding', 'ready', 'completed', 'cancelled')),
  notes text,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  description text NOT NULL,
  amount decimal(10,2) NOT NULL,
  date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own data"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create policies for customers table
CREATE POLICY "Authenticated users can manage customers"
  ON customers
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policies for orders table
CREATE POLICY "Authenticated users can manage orders"
  ON orders
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policies for expenses table
CREATE POLICY "Authenticated users can manage expenses"
  ON expenses
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS orders_customer_id_idx ON orders(customer_id);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders(created_at);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status);
CREATE INDEX IF NOT EXISTS orders_payment_status_idx ON orders(payment_status);
CREATE INDEX IF NOT EXISTS expenses_date_idx ON expenses(date);
CREATE INDEX IF NOT EXISTS expenses_category_idx ON expenses(category);