CREATE TABLE IF NOT EXISTS membership_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  kg_allowance DECIMAL(10,2) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES membership_plans(id),
  kg_total DECIMAL(10,2) NOT NULL,
  kg_remaining DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'depleted', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS membership_id UUID REFERENCES customer_memberships(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS membership_kg_used DECIMAL(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS purchased_membership_id UUID REFERENCES customer_memberships(id);

CREATE INDEX IF NOT EXISTS idx_customer_memberships_customer_id ON customer_memberships(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_memberships_status ON customer_memberships(status);

INSERT INTO membership_plans (name, display_name, kg_allowance, price) VALUES
('plan-16kg', '16kg Membership', 16, 2000),
('plan-30kg', '30kg Membership', 30, 3600),
('plan-50kg', '50kg Membership', 50, 5500)
ON CONFLICT (name) DO NOTHING;
