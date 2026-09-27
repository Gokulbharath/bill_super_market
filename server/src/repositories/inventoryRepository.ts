import { db } from '../database/db.js';

const now = () => new Date().toISOString();

type ProductRow = { id: number; nameEnglish: string; nameTamil: string; productType: string; purchasePrice: number; minimumStock: number; unitName?: string; unitSymbol?: string; categoryName?: string; brandName?: string; identifierValue?: string };

function productById(id: number) {
  return db.prepare(`SELECT p.id, p.name_english AS nameEnglish, p.name_tamil AS nameTamil, p.product_type AS productType, p.purchase_price AS purchasePrice, p.minimum_stock AS minimumStock, u.name AS unitName, u.symbol AS unitSymbol, c.name AS categoryName, b.name AS brandName, pi.identifier_value AS identifierValue FROM products p LEFT JOIN units u ON u.id = p.unit_id LEFT JOIN categories c ON c.id = p.category_id LEFT JOIN brands b ON b.id = p.brand_id LEFT JOIN product_identifiers pi ON pi.product_id = p.id AND pi.is_primary = 1 WHERE p.id = ?`).get(id) as ProductRow | undefined;
}

function unitFor(product: ProductRow) { return product.unitSymbol || product.unitName || 'UNIT'; }

function ensureStock(product: ProductRow) {
  const existing = db.prepare('SELECT * FROM inventory_stock WHERE product_id = ?').get(product.id) as { id: number; current_quantity: number; minimum_quantity: number; unit: string } | undefined;
  if (existing) return existing;
  const timestamp = now();
  db.prepare('INSERT INTO inventory_stock (product_id, current_quantity, minimum_quantity, unit, updated_at) VALUES (?, 0, ?, ?, ?)').run(product.id, product.minimumStock || 0, unitFor(product), timestamp);
  return db.prepare('SELECT * FROM inventory_stock WHERE product_id = ?').get(product.id) as { id: number; current_quantity: number; minimum_quantity: number; unit: string };
}

function validateProduct(productId: number) {
  const product = productById(productId);
  if (!product) throw new Error('PRODUCT_NOT_FOUND');
  const status = db.prepare('SELECT status FROM products WHERE id = ?').get(productId) as { status: string };
  if (status.status !== 'ACTIVE') throw new Error('PRODUCT_INACTIVE');
  return product;
}

function validateQuantity(quantity: number) { if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('INVALID_QUANTITY'); }

function validateDate(value?: string) { if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('INVALID_DATE'); }

export function listInventory(query: { search?: string; status?: string; categoryId?: string; brandId?: string; productType?: string; unit?: string; expiry?: string }) {
  const terms = ['p.status = \'ACTIVE\'']; const values: Record<string, string | number> = {};
  if (query.search) { terms.push('(p.name_english LIKE @search OR p.name_tamil LIKE @search OR p.sku LIKE @search OR pi.identifier_value LIKE @search OR c.name LIKE @search OR b.name LIKE @search)'); values.search = `%${query.search}%`; }
  if (query.categoryId) { terms.push('p.category_id = @categoryId'); values.categoryId = Number(query.categoryId); }
  if (query.brandId) { terms.push('p.brand_id = @brandId'); values.brandId = Number(query.brandId); }
  if (query.productType) { terms.push('p.product_type = @productType'); values.productType = query.productType; }
  if (query.unit) { terms.push('(u.symbol = @unit OR u.name = @unit)'); values.unit = query.unit; }
  const expiryTerm = query.expiry;
  if (expiryTerm === 'EXPIRED') terms.push("ib.expiry_date < date('now') AND ib.quantity > 0");
  if (expiryTerm === 'EXPIRING_SOON') { terms.push("ib.expiry_date >= date('now') AND ib.expiry_date <= date('now', '+30 day') AND ib.quantity > 0"); }
  const rows = db.prepare(`SELECT p.id, p.name_english AS nameEnglish, p.name_tamil AS nameTamil, p.product_type AS productType, p.purchase_price AS purchasePrice, p.minimum_stock AS productMinimumStock, s.current_quantity AS currentStock, s.minimum_quantity AS minimumStock, s.unit, u.name AS unitName, u.symbol AS unitSymbol, c.name AS categoryName, b.name AS brandName, pi.identifier_value AS identifierValue, MIN(ib.expiry_date) AS nearestExpiry, (COALESCE(s.current_quantity, 0) * p.purchase_price) AS stockValue FROM products p LEFT JOIN inventory_stock s ON s.product_id = p.id LEFT JOIN inventory_batches ib ON ib.product_id = p.id AND ib.quantity > 0 LEFT JOIN units u ON u.id = p.unit_id LEFT JOIN categories c ON c.id = p.category_id LEFT JOIN brands b ON b.id = p.brand_id LEFT JOIN product_identifiers pi ON pi.product_id = p.id AND pi.is_primary = 1 WHERE ${terms.join(' AND ')} GROUP BY p.id ORDER BY p.name_english`).all(values) as Array<Record<string, unknown>>;
  return rows.map((row) => ({ ...row, currentStock: Number(row.currentStock || 0), minimumStock: Number(row.minimumStock || row.productMinimumStock || 0), stockValue: Number(row.stockValue || 0) }));
}

export function summary() {
  const rows = listInventory({});
  const today = new Date().toISOString().slice(0, 10);
  const movementCount = db.prepare("SELECT COUNT(*) AS count FROM inventory_movements WHERE date(created_at) = date(?) AND movement_type = 'ADJUSTMENT'").get(today) as { count: number };
  return { totalProducts: rows.length, totalStockUnits: rows.reduce((sum, row) => sum + Number(row.currentStock), 0), totalStockValue: rows.reduce((sum, row) => sum + Number(row.stockValue), 0), lowStock: rows.filter((row) => Number(row.currentStock) > 0 && Number(row.currentStock) <= Number(row.minimumStock)).length, outOfStock: rows.filter((row) => Number(row.currentStock) === 0).length, expiringSoon: listInventory({ expiry: 'EXPIRING_SOON' }).length, expired: listInventory({ expiry: 'EXPIRED' }).length, adjustmentsToday: movementCount.count };
}

export function movements(limit = 50) {
  return db.prepare(`SELECT m.*, p.name_english AS productName, pi.identifier_value AS identifierValue FROM inventory_movements m JOIN products p ON p.id = m.product_id LEFT JOIN product_identifiers pi ON pi.product_id = p.id AND pi.is_primary = 1 ORDER BY m.created_at DESC LIMIT ?`).all(limit);
}

function writeMovement(product: ProductRow, stock: { current_quantity: number; unit: string }, quantity: number, movementType: string, batchId: number | null, reason: string, notes: string, createdBy: string) {
  const after = stock.current_quantity + quantity;
  if (after < 0) throw new Error('INSUFFICIENT_STOCK');
  const timestamp = now();
  db.prepare('UPDATE inventory_stock SET current_quantity = ?, updated_at = ? WHERE product_id = ?').run(after, timestamp, product.id);
  db.prepare('INSERT INTO inventory_movements (product_id, batch_id, movement_type, quantity, before_quantity, after_quantity, unit, reason, notes, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(product.id, batchId, movementType, quantity, stock.current_quantity, after, stock.unit, reason || '', notes || '', createdBy || 'SYSTEM', timestamp);
  return after;
}

export function stockIn(input: { productId: number; quantity: number; batchNumber?: string; manufacturingDate?: string; expiryDate?: string; notes?: string; movementType?: string; createdBy?: string }) {
  const product = validateProduct(input.productId); validateQuantity(input.quantity); validateDate(input.manufacturingDate); validateDate(input.expiryDate);
  if (input.expiryDate && input.manufacturingDate && input.expiryDate < input.manufacturingDate) throw new Error('INVALID_DATE');
  return db.transaction(() => { const stock = ensureStock(product); const timestamp = now(); const batch = db.prepare('INSERT INTO inventory_batches (product_id, batch_number, quantity, purchase_price, manufacturing_date, expiry_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(product.id, input.batchNumber?.trim() || `OPEN-${timestamp.slice(0, 10)}`, input.quantity, product.purchasePrice, input.manufacturingDate || null, input.expiryDate || null, timestamp, timestamp); const after = writeMovement(product, stock, input.quantity, input.movementType || 'STOCK_IN', Number(batch.lastInsertRowid), '', input.notes || '', input.createdBy || 'SYSTEM'); return { product: product.nameEnglish, productId: product.id, currentStock: after, batchId: Number(batch.lastInsertRowid) }; })();
}

export function stockOut(input: { productId: number; quantity: number; reason: string; notes?: string; createdBy?: string }) {
  const product = validateProduct(input.productId); validateQuantity(input.quantity);
  return db.transaction(() => { const stock = ensureStock(product); if (stock.current_quantity < input.quantity) throw new Error('INSUFFICIENT_STOCK'); let remaining = input.quantity; const batches = db.prepare('SELECT id, quantity FROM inventory_batches WHERE product_id = ? AND quantity > 0 ORDER BY CASE WHEN expiry_date IS NULL THEN 1 ELSE 0 END, expiry_date, id').all(product.id) as Array<{ id: number; quantity: number }>; for (const batch of batches) { const used = Math.min(remaining, batch.quantity); db.prepare('UPDATE inventory_batches SET quantity = quantity - ?, updated_at = ? WHERE id = ?').run(used, now(), batch.id); remaining -= used; if (remaining <= 0) break; } const after = writeMovement(product, stock, -input.quantity, 'STOCK_OUT', null, input.reason, input.notes || '', input.createdBy || 'SYSTEM'); return { product: product.nameEnglish, productId: product.id, currentStock: after }; })();
}

export function adjustStock(input: { productId: number; physicalCount: number; reason: string; notes?: string; createdBy?: string }) {
  const product = validateProduct(input.productId); if (!Number.isFinite(input.physicalCount) || input.physicalCount < 0) throw new Error('INVALID_QUANTITY');
  return db.transaction(() => { const stock = ensureStock(product); const difference = input.physicalCount - stock.current_quantity; if (difference === 0) return { product: product.nameEnglish, productId: product.id, currentStock: stock.current_quantity }; const after = writeMovement(product, stock, difference, 'ADJUSTMENT', null, input.reason, input.notes || '', input.createdBy || 'SYSTEM'); if (difference < 0) { const batch = db.prepare('SELECT id, quantity FROM inventory_batches WHERE product_id = ? AND quantity > 0 ORDER BY id DESC LIMIT 1').get(product.id) as { id: number; quantity: number } | undefined; if (batch) db.prepare('UPDATE inventory_batches SET quantity = MAX(0, quantity - ?), updated_at = ? WHERE id = ?').run(-difference, now(), batch.id); } return { product: product.nameEnglish, productId: product.id, currentStock: after }; })();
}

export function updateMinimum(productId: number, minimumQuantity: number) { validateProduct(productId); if (!Number.isFinite(minimumQuantity) || minimumQuantity < 0) throw new Error('INVALID_QUANTITY'); ensureStock(productById(productId)!); db.prepare('UPDATE inventory_stock SET minimum_quantity = ?, updated_at = ? WHERE product_id = ?').run(minimumQuantity, now(), productId); return listInventory({ search: productById(productId)!.nameEnglish })[0]; }

export function batches(productId: number) { validateProduct(productId); return db.prepare('SELECT * FROM inventory_batches WHERE product_id = ? ORDER BY CASE WHEN expiry_date IS NULL THEN 1 ELSE 0 END, expiry_date, id').all(productId); }