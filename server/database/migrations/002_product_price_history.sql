CREATE TABLE IF NOT EXISTS product_price_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  old_purchase_price REAL NOT NULL,
  new_purchase_price REAL NOT NULL,
  old_mrp REAL NOT NULL,
  new_mrp REAL NOT NULL,
  old_selling_price REAL NOT NULL,
  new_selling_price REAL NOT NULL,
  changed_by TEXT NOT NULL DEFAULT 'SYSTEM',
  changed_at TEXT NOT NULL,
  reason TEXT DEFAULT '',
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_product_price_history_product ON product_price_history(product_id, changed_at DESC);