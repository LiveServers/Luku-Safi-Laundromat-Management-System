CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(is_active);
CREATE INDEX IF NOT EXISTS idx_services_name ON services(name);

-- Create locations table
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  paybill_number TEXT,
  account_number TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add location_id to existing tables
ALTER TABLE orders ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id);

-- Create indexes for location foreign keys
CREATE INDEX IF NOT EXISTS idx_orders_location_id ON orders(location_id);
CREATE INDEX IF NOT EXISTS idx_expenses_location_id ON expenses(location_id);
CREATE INDEX IF NOT EXISTS idx_customers_location_id ON customers(location_id);
CREATE INDEX IF NOT EXISTS idx_users_location_id ON users(location_id);