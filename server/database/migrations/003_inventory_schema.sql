CREATE TABLE IF NOT EXISTS inventory_stock (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL UNIQUE,
  current_quantity REAL NOT NULL DEFAULT 0 CHECK (current_quantity >= 0),
  minimum_quantity REAL NOT NULL DEFAULT 0 CHECK (minimum_quantity >= 0),
  unit TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS inventory_batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  batch_number TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  purchase_price REAL NOT NULL DEFAULT 0 CHECK (purchase_price >= 0),
  manufacturing_date TEXT,
  expiry_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  batch_id INTEGER,
  movement_type TEXT NOT NULL,
  quantity REAL NOT NULL,
  before_quantity REAL NOT NULL,
  after_quantity REAL NOT NULL CHECK (after_quantity >= 0),
  unit TEXT NOT NULL,
  reference_id TEXT,
  reason TEXT,
  notes TEXT,
  created_by TEXT NOT NULL DEFAULT 'SYSTEM',
  created_at TEXT NOT NULL,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (batch_id) REFERENCES inventory_batches(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_product ON inventory_movements(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_batches_expiry ON inventory_batches(expiry_date);