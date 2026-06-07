-- Insert default locations
INSERT INTO locations (name, display_name, address, phone, paybill_number, account_number) VALUES
('muthiga', 'Luku Safi Laundromat Muthiga', 'Muthiga, Kiambu County','+254 708718595', '542542', '177535'),
('gitaru', 'Luku Safi Laundromat Gitaru', 'Gitaru, Kiambu County','+254 797755987' , '542542', '177535')
ON CONFLICT (name) DO NOTHING;

-- Set default location for existing records (Muthiga as the original)
UPDATE orders SET location_id = (SELECT id FROM locations WHERE name = 'muthiga' LIMIT 1) WHERE location_id IS NULL;
UPDATE expenses SET location_id = (SELECT id FROM locations WHERE name = 'muthiga' LIMIT 1) WHERE location_id IS NULL;
UPDATE customers SET location_id = (SELECT id FROM locations WHERE name = 'muthiga' LIMIT 1) WHERE location_id IS NULL;
UPDATE users SET location_id = (SELECT id FROM locations WHERE name = 'muthiga' LIMIT 1) WHERE location_id IS NULL;