ALTER TABLE suppliers ADD COLUMN contact_person TEXT NOT NULL DEFAULT '';
ALTER TABLE suppliers ADD COLUMN alternate_phone TEXT NOT NULL DEFAULT '';
ALTER TABLE suppliers ADD COLUMN gstin TEXT NOT NULL DEFAULT '';
ALTER TABLE suppliers ADD COLUMN address_line1 TEXT NOT NULL DEFAULT '';
ALTER TABLE suppliers ADD COLUMN address_line2 TEXT NOT NULL DEFAULT '';
ALTER TABLE suppliers ADD COLUMN city TEXT NOT NULL DEFAULT '';
ALTER TABLE suppliers ADD COLUMN state TEXT NOT NULL DEFAULT '';
ALTER TABLE suppliers ADD COLUMN pincode TEXT NOT NULL DEFAULT '';
ALTER TABLE suppliers ADD COLUMN notes TEXT NOT NULL DEFAULT '';

UPDATE suppliers
SET address_line1 = COALESCE(address, '')
WHERE address_line1 = '' AND COALESCE(address, '') <> '';

CREATE INDEX IF NOT EXISTS idx_suppliers_phone ON suppliers(phone);
CREATE INDEX IF NOT EXISTS idx_suppliers_gstin ON suppliers(gstin);
CREATE INDEX IF NOT EXISTS idx_suppliers_status_name ON suppliers(status, name);

CREATE TABLE IF NOT EXISTS purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  purchase_number TEXT NOT NULL UNIQUE,
  supplier_id INTEGER NOT NULL,
  purchase_date TEXT NOT NULL,
  supplier_invoice_number TEXT NOT NULL DEFAULT '',
  supplier_invoice_date TEXT NOT NULL DEFAULT '',
  reference_number TEXT NOT NULL DEFAULT '',
  subtotal REAL NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  discount REAL NOT NULL DEFAULT 0 CHECK (discount >= 0),
  taxable_amount REAL NOT NULL DEFAULT 0 CHECK (taxable_amount >= 0),
  cgst REAL NOT NULL DEFAULT 0 CHECK (cgst >= 0),
  sgst REAL NOT NULL DEFAULT 0 CHECK (sgst >= 0),
  other_charges REAL NOT NULL DEFAULT 0 CHECK (other_charges >= 0),
  round_off REAL NOT NULL DEFAULT 0,
  grand_total REAL NOT NULL DEFAULT 0 CHECK (grand_total >= 0),
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'RECEIVED', 'CANCELLED')),
  notes TEXT NOT NULL DEFAULT '',
  received_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS purchase_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  purchase_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  product_name_snapshot TEXT NOT NULL,
  product_tamil_name_snapshot TEXT NOT NULL DEFAULT '',
  barcode_snapshot TEXT NOT NULL DEFAULT '',
  quantity REAL NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL,
  purchase_cost REAL NOT NULL CHECK (purchase_cost >= 0),
  gst_rate REAL NOT NULL DEFAULT 0 CHECK (gst_rate >= 0),
  taxable_amount REAL NOT NULL DEFAULT 0 CHECK (taxable_amount >= 0),
  cgst REAL NOT NULL DEFAULT 0 CHECK (cgst >= 0),
  sgst REAL NOT NULL DEFAULT 0 CHECK (sgst >= 0),
  tax_amount REAL NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  line_total REAL NOT NULL DEFAULT 0 CHECK (line_total >= 0),
  batch_number TEXT NOT NULL DEFAULT '',
  manufacturing_date TEXT,
  expiry_date TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS purchase_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  purchase_id INTEGER NOT NULL,
  amount REAL NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('CASH', 'UPI', 'BANK', 'OTHER')),
  reference_number TEXT NOT NULL DEFAULT '',
  payment_date TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_purchases_supplier_date ON purchases(supplier_id, purchase_date DESC);
CREATE INDEX IF NOT EXISTS idx_purchases_status_date ON purchases(status, purchase_date DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_items_product ON purchase_items(product_id);
CREATE INDEX IF NOT EXISTS idx_purchase_payments_purchase ON purchase_payments(purchase_id, payment_date DESC);