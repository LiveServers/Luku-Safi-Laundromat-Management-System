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