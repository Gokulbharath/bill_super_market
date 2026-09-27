CREATE TABLE IF NOT EXISTS bills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bill_number TEXT NOT NULL UNIQUE,
  cashier_id TEXT NOT NULL,
  bill_date TEXT NOT NULL,
  subtotal REAL NOT NULL CHECK (subtotal >= 0),
  discount REAL NOT NULL DEFAULT 0 CHECK (discount >= 0),
  taxable_amount REAL NOT NULL CHECK (taxable_amount >= 0),
  cgst REAL NOT NULL DEFAULT 0,
  sgst REAL NOT NULL DEFAULT 0,
  grand_total REAL NOT NULL CHECK (grand_total >= 0),
  payment_method TEXT NOT NULL DEFAULT 'CASH',
  status TEXT NOT NULL DEFAULT 'COMPLETED',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bill_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bill_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  product_name_snapshot TEXT NOT NULL,
  product_tamil_name_snapshot TEXT DEFAULT '',
  barcode_snapshot TEXT DEFAULT '',
  quantity REAL NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL,
  selling_price REAL NOT NULL,
  mrp REAL NOT NULL,
  gst_percent REAL NOT NULL,
  tax_amount REAL NOT NULL,
  line_total REAL NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS held_bills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hold_number TEXT NOT NULL UNIQUE,
  cashier_id TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bills_created_at ON bills(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bill_items_product ON bill_items(product_id);