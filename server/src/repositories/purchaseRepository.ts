import { db } from '../database/db.js';
import { stockIn } from './inventoryRepository.js';

type PurchaseItemInput = {
  productId: number;
  quantity: number;
  purchaseCost: number;
  batchNumber?: string;
  manufacturingDate?: string;
  expiryDate?: string;
};

type PurchaseInput = {
  supplierId: number;
  purchaseDate: string;
  supplierInvoiceNumber?: string;
  supplierInvoiceDate?: string;
  referenceNumber?: string;
  discount?: number;
  otherCharges?: number;
  roundOff?: number;
  notes?: string;
  items: PurchaseItemInput[];
};

const now = () => new Date().toISOString();
const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

function validateDate(value: string, optional = false) {
  if (!value && optional) return;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00`))) throw new Error('INVALID_DATE');
}

function purchaseNumber(date: string) {
  const year = new Date(`${date}T00:00:00`).getFullYear();
  const prefix = `PUR-${year}-`;
  const latest = db.prepare('SELECT purchase_number FROM purchases WHERE purchase_number LIKE ? ORDER BY id DESC LIMIT 1').get(`${prefix}%`) as { purchase_number: string } | undefined;
  const sequence = latest ? Number(latest.purchase_number.slice(-6)) + 1 : 1;
  return `${prefix}${String(sequence).padStart(6, '0')}`;
}

function resolveInput(input: PurchaseInput) {
  if (!Number.isInteger(input.supplierId) || input.supplierId <= 0) throw new Error('SUPPLIER_REQUIRED');
  const supplier = db.prepare('SELECT id, name, status FROM suppliers WHERE id = ?').get(input.supplierId) as { id: number; name: string; status: string } | undefined;
  if (!supplier) throw new Error('SUPPLIER_NOT_FOUND');
  if (supplier.status !== 'ACTIVE') throw new Error('SUPPLIER_INACTIVE');
  validateDate(input.purchaseDate);
  validateDate(input.supplierInvoiceDate || '', true);
  if (!Array.isArray(input.items) || input.items.length === 0) throw new Error('EMPTY_PURCHASE');

  const rows = input.items.map((item) => {
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) throw new Error('INVALID_QUANTITY');
    if (!Number.isFinite(item.purchaseCost) || item.purchaseCost < 0) throw new Error('INVALID_PURCHASE_COST');
    validateDate(item.manufacturingDate || '', true);
    validateDate(item.expiryDate || '', true);
    if (item.manufacturingDate && item.expiryDate && item.expiryDate < item.manufacturingDate) throw new Error('INVALID_DATE');
    const product = db.prepare(`
      SELECT p.id, p.name_english AS nameEnglish, p.name_tamil AS nameTamil, p.gst_percent AS gstPercent,
        u.symbol AS unitSymbol, u.name AS unitName, pi.identifier_value AS identifierValue
      FROM products p
      LEFT JOIN units u ON u.id = p.unit_id
      LEFT JOIN product_identifiers pi ON pi.product_id = p.id AND pi.is_primary = 1
      WHERE p.id = ? AND p.status = 'ACTIVE'
    `).get(item.productId) as { id: number; nameEnglish: string; nameTamil: string; gstPercent: number; unitSymbol?: string; unitName?: string; identifierValue?: string } | undefined;
    if (!product) throw new Error('PRODUCT_NOT_FOUND');
    return { ...item, product };
  });

  const subtotal = money(rows.reduce((sum, item) => sum + item.purchaseCost * item.quantity, 0));
  const discount = Number(input.discount || 0);
  const otherCharges = Number(input.otherCharges || 0);
  const roundOff = Number(input.roundOff || 0);
  if (![discount, otherCharges, roundOff].every(Number.isFinite) || discount < 0 || discount > subtotal || otherCharges < 0 || Math.abs(roundOff) > 1000) throw new Error('INVALID_PURCHASE_TOTAL');
  let allocatedDiscount = 0;
  const calculatedItems = rows.map((item, index) => {
    const gross = item.purchaseCost * item.quantity;
    const lineDiscount = index === rows.length - 1 ? money(discount - allocatedDiscount) : subtotal > 0 ? money(discount * gross / subtotal) : 0;
    allocatedDiscount = money(allocatedDiscount + lineDiscount);
    const taxableAmount = money(gross - lineDiscount);
    const taxAmount = money(taxableAmount * item.product.gstPercent / 100);
    const cgst = money(taxAmount / 2);
    const sgst = money(taxAmount - cgst);
    return { ...item, taxableAmount, cgst, sgst, taxAmount, lineTotal: money(taxableAmount + taxAmount) };
  });
  const taxableAmount = money(calculatedItems.reduce((sum, item) => sum + item.taxableAmount, 0));
  const cgst = money(calculatedItems.reduce((sum, item) => sum + item.cgst, 0));
  const sgst = money(calculatedItems.reduce((sum, item) => sum + item.sgst, 0));
  const grandTotal = money(taxableAmount + cgst + sgst + otherCharges + roundOff);

  return {
    supplier,
    items: calculatedItems,
    totals: { subtotal, discount: money(discount), taxableAmount, cgst, sgst, otherCharges: money(otherCharges), roundOff: money(roundOff), grandTotal },
  };
}

function insertItems(purchaseId: number, items: ReturnType<typeof resolveInput>['items'], createdAt: string) {
  const insert = db.prepare(`
    INSERT INTO purchase_items (
      purchase_id, product_id, product_name_snapshot, product_tamil_name_snapshot, barcode_snapshot,
      quantity, unit, purchase_cost, gst_rate, taxable_amount, cgst, sgst, tax_amount, line_total,
      batch_number, manufacturing_date, expiry_date, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const item of items) {
    insert.run(purchaseId, item.product.id, item.product.nameEnglish, item.product.nameTamil || '', item.product.identifierValue || '', item.quantity, item.product.unitSymbol || item.product.unitName || 'UNIT', item.purchaseCost, item.product.gstPercent, item.taxableAmount, item.cgst, item.sgst, item.taxAmount, item.lineTotal, item.batchNumber?.trim() || '', item.manufacturingDate || null, item.expiryDate || null, createdAt);
  }
}

function updateTotals(purchaseId: number, input: PurchaseInput, totals: ReturnType<typeof resolveInput>['totals'], updatedAt: string) {
  db.prepare(`
    UPDATE purchases SET supplier_id = ?, purchase_date = ?, supplier_invoice_number = ?, supplier_invoice_date = ?,
      reference_number = ?, subtotal = ?, discount = ?, taxable_amount = ?, cgst = ?, sgst = ?, other_charges = ?,
      round_off = ?, grand_total = ?, notes = ?, updated_at = ? WHERE id = ?
  `).run(input.supplierId, input.purchaseDate, input.supplierInvoiceNumber?.trim() || '', input.supplierInvoiceDate || '', input.referenceNumber?.trim() || '', totals.subtotal, totals.discount, totals.taxableAmount, totals.cgst, totals.sgst, totals.otherCharges, totals.roundOff, totals.grandTotal, input.notes?.trim() || '', updatedAt, purchaseId);
}

function paidFor(purchaseId: number) {
  return Number((db.prepare('SELECT COALESCE(SUM(amount), 0) AS paid FROM purchase_payments WHERE purchase_id = ?').get(purchaseId) as { paid: number }).paid);
}

function withPayments(purchase: Record<string, unknown>) {
  const id = Number(purchase.id);
  const paid = money(paidFor(id));
  const total = Number(purchase.grand_total || 0);
  return {
    ...purchase,
    paid_amount: paid,
    balance: money(Math.max(0, total - paid)),
    payment_status: paid >= total ? 'PAID' : paid > 0 ? 'PARTIAL' : 'UNPAID',
  };
}

export function createPurchase(input: PurchaseInput) {
  const resolved = resolveInput(input);
  const createdAt = now();
  return db.transaction(() => {
    const number = purchaseNumber(input.purchaseDate);
    const result = db.prepare(`
      INSERT INTO purchases (
        purchase_number, supplier_id, purchase_date, supplier_invoice_number, supplier_invoice_date, reference_number,
        subtotal, discount, taxable_amount, cgst, sgst, other_charges, round_off, grand_total, status, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?, ?, ?)
    `).run(number, input.supplierId, input.purchaseDate, input.supplierInvoiceNumber?.trim() || '', input.supplierInvoiceDate || '', input.referenceNumber?.trim() || '', resolved.totals.subtotal, resolved.totals.discount, resolved.totals.taxableAmount, resolved.totals.cgst, resolved.totals.sgst, resolved.totals.otherCharges, resolved.totals.roundOff, resolved.totals.grandTotal, input.notes?.trim() || '', createdAt, createdAt);
    const id = Number(result.lastInsertRowid);
    insertItems(id, resolved.items, createdAt);
    return getPurchase(id);
  })();
}

export function updateDraftPurchase(id: number, input: PurchaseInput) {
  const resolved = resolveInput(input);
  const updatedAt = now();
  return db.transaction(() => {
    const purchase = db.prepare('SELECT status FROM purchases WHERE id = ?').get(id) as { status: string } | undefined;
    if (!purchase) throw new Error('PURCHASE_NOT_FOUND');
    if (purchase.status !== 'DRAFT') throw new Error('PURCHASE_NOT_DRAFT');
    updateTotals(id, input, resolved.totals, updatedAt);
    db.prepare('DELETE FROM purchase_items WHERE purchase_id = ?').run(id);
    insertItems(id, resolved.items, updatedAt);
    return getPurchase(id);
  })();
}

export function getPurchase(id: number) {
  const row = db.prepare(`
    SELECT p.*, s.supplier_code, s.name AS supplier_name, s.phone AS supplier_phone, s.gstin AS supplier_gstin
    FROM purchases p JOIN suppliers s ON s.id = p.supplier_id WHERE p.id = ?
  `).get(id) as Record<string, unknown> | undefined;
  if (!row) return undefined;
  return {
    ...withPayments(row),
    items: db.prepare('SELECT * FROM purchase_items WHERE purchase_id = ? ORDER BY id').all(id),
    payments: db.prepare('SELECT * FROM purchase_payments WHERE purchase_id = ? ORDER BY payment_date DESC, id DESC').all(id),
  };
}

export function listPurchases(query: { search?: string; status?: string; supplierId?: string; dateFrom?: string; dateTo?: string } = {}) {
  const terms: string[] = [];
  const values: Array<string | number> = [];
  if (query.search?.trim()) {
    const term = `%${query.search.trim()}%`;
    terms.push('(p.purchase_number LIKE ? OR p.supplier_invoice_number LIKE ? OR s.name LIKE ? OR s.supplier_code LIKE ?)');
    values.push(term, term, term, term);
  }
  if (query.status && query.status !== 'ALL') { terms.push('p.status = ?'); values.push(query.status); }
  if (query.supplierId) { terms.push('p.supplier_id = ?'); values.push(Number(query.supplierId)); }
  if (query.dateFrom) { terms.push('p.purchase_date >= ?'); values.push(query.dateFrom); }
  if (query.dateTo) { terms.push('p.purchase_date <= ?'); values.push(query.dateTo); }
  const where = terms.length ? `WHERE ${terms.join(' AND ')}` : '';
  const rows = db.prepare(`
    SELECT p.*, s.supplier_code, s.name AS supplier_name,
      (SELECT COUNT(*) FROM purchase_items pi WHERE pi.purchase_id = p.id) AS item_count,
      (SELECT COALESCE(SUM(amount), 0) FROM purchase_payments pp WHERE pp.purchase_id = p.id) AS paid_amount
    FROM purchases p JOIN suppliers s ON s.id = p.supplier_id ${where}
    ORDER BY p.purchase_date DESC, p.id DESC LIMIT 500
  `).all(...values) as Array<Record<string, unknown>>;
  return rows.map(withPayments);
}

export function purchaseSummary() {
  const currentMonth = new Date().toISOString().slice(0, 7);
  return db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM purchases WHERE status <> 'CANCELLED') AS total_purchases,
      (SELECT COALESCE(SUM(grand_total), 0) FROM purchases WHERE status <> 'CANCELLED' AND substr(purchase_date, 1, 7) = ?) AS month_total,
      (SELECT COUNT(*) FROM purchases WHERE status = 'DRAFT') AS draft_count,
      (SELECT COALESCE(SUM(p.grand_total - COALESCE((SELECT SUM(pp.amount) FROM purchase_payments pp WHERE pp.purchase_id = p.id), 0)), 0) FROM purchases p WHERE p.status <> 'CANCELLED') AS outstanding_amount
  `).get(currentMonth);
}

const purchaseProductSelect = `
  SELECT p.id, p.name_english AS nameEnglish, p.name_tamil AS nameTamil, p.sku,
    p.purchase_price AS purchasePrice, p.selling_price AS sellingPrice, p.mrp,
    p.gst_percent AS gstPercent, COALESCE(s.current_quantity, 0) AS currentStock,
    u.symbol AS unitSymbol, u.name AS unitName, b.name AS brandName,
    pi.identifier_value AS identifierValue
  FROM products p
  LEFT JOIN inventory_stock s ON s.product_id = p.id
  LEFT JOIN units u ON u.id = p.unit_id
  LEFT JOIN brands b ON b.id = p.brand_id
  LEFT JOIN product_identifiers pi ON pi.product_id = p.id AND pi.is_primary = 1
`;

export function searchPurchaseProducts(term: string) {
  const query = term.trim();
  if (!query) return [];
  const like = `%${query}%`;
  return db.prepare(`${purchaseProductSelect}
    WHERE p.status = 'ACTIVE'
      AND (p.name_english LIKE ? OR p.name_tamil LIKE ? OR p.sku LIKE ? OR p.product_code LIKE ? OR pi.identifier_value LIKE ? OR b.name LIKE ?)
    ORDER BY p.name_english COLLATE NOCASE LIMIT 40
  `).all(like, like, like, like, like, like);
}

export function lookupPurchaseProduct(barcode: string) {
  return db.prepare(`${purchaseProductSelect}
    WHERE p.status = 'ACTIVE' AND pi.identifier_value = ? LIMIT 1
  `).get(barcode.trim());
}

export function receivePurchase(id: number, receivedBy = 'SYSTEM') {
  return db.transaction(() => {
    const purchase = db.prepare('SELECT * FROM purchases WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!purchase) throw new Error('PURCHASE_NOT_FOUND');
    if (purchase.status !== 'DRAFT') throw new Error('PURCHASE_NOT_DRAFT');
    const supplier = db.prepare('SELECT name FROM suppliers WHERE id = ?').get(purchase.supplier_id) as { name: string } | undefined;
    const items = db.prepare('SELECT * FROM purchase_items WHERE purchase_id = ? ORDER BY id').all(id) as Array<Record<string, unknown>>;
    if (!items.length) throw new Error('EMPTY_PURCHASE');
    for (const item of items) {
      stockIn({
        productId: Number(item.product_id),
        quantity: Number(item.quantity),
        batchNumber: String(item.batch_number || '') || undefined,
        manufacturingDate: String(item.manufacturing_date || '') || undefined,
        expiryDate: String(item.expiry_date || '') || undefined,
        movementType: 'PURCHASE_IN',
        purchasePrice: Number(item.purchase_cost),
        reason: supplier?.name || 'Purchase receipt',
        referenceId: String(purchase.purchase_number),
        notes: String(purchase.purchase_number),
        createdBy: receivedBy,
      });
    }
    db.prepare("UPDATE purchases SET status = 'RECEIVED', received_at = ?, updated_at = ? WHERE id = ? AND status = 'DRAFT'").run(now(), now(), id);
    return getPurchase(id);
  })();
}

export function cancelPurchase(id: number) {
  const purchase = db.prepare('SELECT status FROM purchases WHERE id = ?').get(id) as { status: string } | undefined;
  if (!purchase) throw new Error('PURCHASE_NOT_FOUND');
  if (purchase.status !== 'DRAFT') throw new Error('PURCHASE_NOT_DRAFT');
  db.prepare("UPDATE purchases SET status = 'CANCELLED', updated_at = ? WHERE id = ? AND status = 'DRAFT'").run(now(), id);
  return getPurchase(id);
}

export function addPurchasePayment(id: number, input: { amount?: number; paymentMethod?: string; referenceNumber?: string; paymentDate?: string; notes?: string }) {
  const purchase = db.prepare('SELECT grand_total, status FROM purchases WHERE id = ?').get(id) as { grand_total: number; status: string } | undefined;
  if (!purchase) throw new Error('PURCHASE_NOT_FOUND');
  if (purchase.status === 'CANCELLED') throw new Error('PURCHASE_CANCELLED');
  const amount = Number(input.amount);
  const paymentMethod = String(input.paymentMethod || '').toUpperCase();
  const paymentDate = input.paymentDate || new Date().toISOString().slice(0, 10);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('INVALID_PAYMENT');
  if (!['CASH', 'UPI', 'BANK', 'OTHER'].includes(paymentMethod)) throw new Error('INVALID_PAYMENT_METHOD');
  validateDate(paymentDate);
  if (money(paidFor(id) + amount) > Number(purchase.grand_total)) throw new Error('PAYMENT_EXCEEDS_BALANCE');
  const createdAt = now();
  const result = db.prepare('INSERT INTO purchase_payments (purchase_id, amount, payment_method, reference_number, payment_date, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, money(amount), paymentMethod, input.referenceNumber?.trim() || '', paymentDate, input.notes?.trim() || '', createdAt);
  return db.prepare('SELECT * FROM purchase_payments WHERE id = ?').get(result.lastInsertRowid);
}

export function listPurchasePayments(id: number) {
  if (!db.prepare('SELECT id FROM purchases WHERE id = ?').get(id)) throw new Error('PURCHASE_NOT_FOUND');
  return db.prepare('SELECT * FROM purchase_payments WHERE purchase_id = ? ORDER BY payment_date DESC, id DESC').all(id);
}