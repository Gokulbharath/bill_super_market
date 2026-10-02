ALTER TABLE held_bills ADD COLUMN notes TEXT NOT NULL DEFAULT '';
ALTER TABLE bill_items ADD COLUMN cost_price_snapshot REAL;

CREATE TABLE IF NOT EXISTS expense_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  expense_number TEXT NOT NULL UNIQUE,
  expense_date TEXT NOT NULL,
  category_id INTEGER NOT NULL,
  category_name_snapshot TEXT NOT NULL,
  description TEXT NOT NULL,
  amount REAL NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('CASH', 'UPI', 'BANK', 'CARD', 'OTHER')),
  reference TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PAID' CHECK (status IN ('PAID', 'PENDING')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (category_id) REFERENCES expense_categories(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS settings (
  setting_key TEXT PRIMARY KEY,
  setting_value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  avatar_url TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category_date ON expenses(category_id, expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_held_bills_created ON held_bills(created_at DESC);

INSERT OR IGNORE INTO expense_categories (name, status, created_at, updated_at) VALUES
  ('Rent', 'ACTIVE', datetime('now'), datetime('now')),
  ('Electricity', 'ACTIVE', datetime('now'), datetime('now')),
  ('Water', 'ACTIVE', datetime('now'), datetime('now')),
  ('Transport', 'ACTIVE', datetime('now'), datetime('now')),
  ('Maintenance', 'ACTIVE', datetime('now'), datetime('now')),
  ('Salary', 'ACTIVE', datetime('now'), datetime('now')),
  ('Internet', 'ACTIVE', datetime('now'), datetime('now')),
  ('Packaging', 'ACTIVE', datetime('now'), datetime('now')),
  ('Cleaning', 'ACTIVE', datetime('now'), datetime('now')),
  ('Miscellaneous', 'ACTIVE', datetime('now'), datetime('now'));

INSERT OR IGNORE INTO settings (setting_key, setting_value, updated_at) VALUES (
  'store',
  '{"name":"SREE SUPER MARKET","shortName":"Sree Super Market","address":{"line1":"Siruvani Main Road","line2":"Alandurai","area":"Alandurai","city":"Coimbatore","district":"Coimbatore","state":"Tamil Nadu","pincode":"641101","country":"India"},"phone":"","alternatePhone":"","email":"","gstin":"","receipt":{"footerNote":"Thank you for shopping with us!","showGST":true,"showCustomerDetails":true,"showCashier":true,"showCounter":true,"showBarcode":false,"showQR":false,"printTamilProductName":true,"printEnglishProductName":true,"copies":2,"copy1Label":"CASHIER COPY","copy2Label":"DELIVERY COPY","counter":"Counter 01","paperSize":"80mm","receiptPrinter":"","labelPrinter":"","upiId":""},"tax":{"cgst":0,"sgst":0}}',
  datetime('now')
);