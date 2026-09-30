-- Staff activity and accountability
-- Reuses users (employees) and locations (branches). Idempotent for existing databases.

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('owner', 'manager', 'attendant'));

ALTER TABLE users ADD COLUMN IF NOT EXISTS job_title TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

UPDATE users SET is_active = TRUE WHERE is_active IS NULL;
UPDATE users SET job_title = CASE
  WHEN role IN ('owner', 'manager') THEN COALESCE(job_title, 'Manager')
  ELSE COALESCE(job_title, 'Attendant')
END
WHERE job_title IS NULL;

CREATE TABLE IF NOT EXISTS activity_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS employee_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES users(id),
  location_id UUID NOT NULL REFERENCES locations(id),
  secondary_location_id UUID REFERENCES locations(id),
  category_id UUID REFERENCES activity_categories(id),
  activity_text TEXT NOT NULL,
  related_order_id UUID REFERENCES orders(id),
  related_customer_id UUID REFERENCES customers(id),
  related_reference TEXT,
  activity_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES users(id),
  updated_by UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS employee_activity_revisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_id UUID NOT NULL REFERENCES employee_activities(id) ON DELETE CASCADE,
  previous_text TEXT NOT NULL,
  previous_category_id UUID,
  previous_location_id UUID,
  previous_secondary_location_id UUID,
  edited_by UUID NOT NULL REFERENCES users(id),
  edited_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS management_note_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS management_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES users(id),
  note TEXT NOT NULL,
  note_type_id UUID REFERENCES management_note_types(id),
  note_date DATE NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS activity_reminder_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled BOOLEAN DEFAULT FALSE,
  hours_without_activity INTEGER DEFAULT 4,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);

ALTER TABLE employee_activities ADD COLUMN IF NOT EXISTS related_reference TEXT;
CREATE INDEX IF NOT EXISTS idx_employee_activities_employee_id ON employee_activities(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_activities_activity_date ON employee_activities(activity_date);
CREATE INDEX IF NOT EXISTS idx_employee_activities_location_id ON employee_activities(location_id);
CREATE INDEX IF NOT EXISTS idx_employee_activities_category_id ON employee_activities(category_id);
CREATE INDEX IF NOT EXISTS idx_employee_activities_created_at ON employee_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_employee_activities_employee_date ON employee_activities(employee_id, activity_date);
CREATE INDEX IF NOT EXISTS idx_employee_activities_text_search ON employee_activities USING gin (to_tsvector('simple', activity_text));
CREATE INDEX IF NOT EXISTS idx_activity_revisions_activity_id ON employee_activity_revisions(activity_id);
CREATE INDEX IF NOT EXISTS idx_management_notes_employee_id ON management_notes(employee_id);
CREATE INDEX IF NOT EXISTS idx_management_notes_created_at ON management_notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_job_title ON users(job_title);

INSERT INTO activity_categories (name, sort_order) VALUES
  ('Customer Service', 1),
  ('Laundry Received', 2),
  ('Washing', 3),
  ('Drying', 4),
  ('Folding', 5),
  ('Ironing', 6),
  ('Pickup', 7),
  ('Delivery', 8),
  ('Branch Transfer', 9),
  ('Cleaning', 10),
  ('Machine Maintenance', 11),
  ('Customer Complaint', 12),
  ('Customer Follow-up', 13),
  ('Stock/Supplies', 14),
  ('Other', 15)
ON CONFLICT (name) DO NOTHING;

INSERT INTO management_note_types (name) VALUES
  ('Compliment'),
  ('Coaching'),
  ('Attendance'),
  ('Performance'),
  ('Reminder'),
  ('Other')
ON CONFLICT (name) DO NOTHING;

INSERT INTO activity_reminder_settings (id, enabled, hours_without_activity)
VALUES (1, false, 4)
ON CONFLICT (id) DO NOTHING;

DROP TRIGGER IF EXISTS update_employee_activities_updated_at ON employee_activities;
CREATE TRIGGER update_employee_activities_updated_at
    BEFORE UPDATE ON employee_activities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_management_notes_updated_at ON management_notes;
CREATE TRIGGER update_management_notes_updated_at
    BEFORE UPDATE ON management_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
