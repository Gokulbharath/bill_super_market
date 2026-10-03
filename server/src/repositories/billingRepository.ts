import { db } from '../database/db.js';
import { getCustomerById } from './customerRepository.js';

const now = () => new Date().toISOString();

type BillItemInput = { productId: number; quantity: number };

function getProduct(id: number) {
  return db.prepare(`SELECT p.id, p.name_english AS nameEnglish, p.name_tamil AS nameTamil, p.purchase_price AS purchasePrice, p.selling_price AS sellingPrice, p.mrp, p.gst_percent AS gstPercent, u.symbol AS unitSymbol, u.name AS unitName, pi.identifier_value AS identifierValue FROM products p LEFT JOIN units u ON u.id = p.unit_id LEFT JOIN product_identifiers pi ON pi.product_id = p.id AND pi.is_primary = 1 WHERE p.id = ? AND p.status = 'ACTIVE'`).get(id) as { id: number; nameEnglish: string; nameTamil: string; purchasePrice: number; sellingPrice: number; mrp: number; gstPercent: number; unitSymbol?: string; unitName?: string; identifierValue?: string } | undefined;
}

function nextBillNumber() {
  const year = new Date().getFullYear();
  const row = db.prepare('SELECT bill_number AS billNumber FROM bills WHERE bill_number LIKE ? ORDER BY id DESC LIMIT 1').get(`SSM-${year}-%`) as { billNumber?: string } | undefined;
  const sequence = row?.billNumber ? Number(row.billNumber.slice(-6)) + 1 : 1;
  return `SSM-${year}-${String(sequence).padStart(6, '0')}`;
}

const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

function calculate(items: Array<{ sellingPrice: number; quantity: number; gstPercent: number }>, discount: number) {
  const subtotal = money(items.reduce((sum, item) => sum + item.sellingPrice * item.quantity, 0));
  if (!Number.isFinite(discount) || discount < 0 || discount > subtotal) throw new Error('INVALID_DISCOUNT');
  const discountAmount = money(discount);
  const grandTotal = money(subtotal - discountAmount);

  return {
    subtotal,
    discount: discountAmount,
    grandTotal,
  };
}

export function lookup(value: string) {
  const product = db.prepare(`SELECT p.id, p.name_english AS nameEnglish, p.name_tamil AS nameTamil, p.sku, p.selling_price AS sellingPrice, p.mrp, p.gst_percent AS gstPercent, s.current_quantity AS currentStock, u.symbol AS unitSymbol, u.name AS unitName, pi.identifier_value AS identifierValue FROM product_identifiers pi JOIN products p ON p.id = pi.product_id LEFT JOIN inventory_stock s ON s.product_id = p.id LEFT JOIN units u ON u.id = p.unit_id WHERE pi.identifier_value = ? AND p.status = 'ACTIVE'`).get(value.trim());
  return product || null;
}

export function searchProducts(term: string) {
  return db.prepare(`SELECT p.id, p.name_english AS nameEnglish, p.name_tamil AS nameTamil, p.sku, p.selling_price AS sellingPrice, p.mrp, p.gst_percent AS gstPercent, s.current_quantity AS currentStock, u.symbol AS unitSymbol, u.name AS unitName, pi.identifier_value AS identifierValue FROM products p LEFT JOIN inventory_stock s ON s.product_id = p.id LEFT JOIN units u ON u.id = p.unit_id LEFT JOIN product_identifiers pi ON pi.product_id = p.id AND pi.is_primary = 1 WHERE p.status = 'ACTIVE' AND (p.name_english LIKE ? OR p.name_tamil LIKE ? OR p.sku LIKE ? OR pi.identifier_value LIKE ? OR p.id IN (SELECT brand_id FROM brands WHERE name LIKE ?)) ORDER BY p.name_english LIMIT 30`).all(...Array(5).fill(`%${term}%`));
}

export function finalize(input: { items: BillItemInput[]; discount?: number; cashierId: string; cashierName?: string; counter?: string; customerId?: number | null; customerName?: string; customerPhone?: string }) {
  if (!input.items.length) throw new Error('EMPTY_CART');

  const timestamp = now();
  const customer = input.customerId ? getCustomerById(input.customerId) : null;
  if (input.customerId && !customer) throw new Error('INVALID_CUSTOMER');

  return db.transaction(() => {
    const resolved = input.items.map((item) => {
      if (!Number.isFinite(item.quantity) || item.quantity <= 0) throw new Error('INVALID_QUANTITY');
      const product = getProduct(item.productId);
      if (!product) throw new Error('PRODUCT_NOT_FOUND');
      const stock = db.prepare('SELECT current_quantity AS currentQuantity, unit FROM inventory_stock WHERE product_id = ?').get(product.id) as { currentQuantity: number; unit: string } | undefined;
      if (!stock || stock.currentQuantity < item.quantity) throw new Error('INSUFFICIENT_STOCK');
      return { ...item, product, stock };
    });

    const totals = calculate(resolved.map((item) => ({ ...item.product, quantity: item.quantity })), Number(input.discount || 0));
    const billNumber = nextBillNumber();
    const customerNameSnapshot = customer?.name || input.customerName?.trim() || 'Walk-in Customer';
    const customerPhoneSnapshot = customer?.phone || input.customerPhone || '';
    const cashierNameSnapshot = input.cashierName?.trim() || input.cashierId;
    const counterSnapshot = input.counter?.trim() || 'Counter 01';

    const bill = db.prepare(`
      INSERT INTO bills (
        bill_number, cashier_id, bill_date, subtotal, discount, grand_total,
        payment_method, status, customer_id, customer_name_snapshot, customer_phone_snapshot,
        cashier_name_snapshot, counter_snapshot, paid_amount, balance,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      billNumber,
      input.cashierId,
      timestamp.slice(0, 10),
      totals.subtotal,
      totals.discount,
      totals.grandTotal,
      'CASH',
      'COMPLETED',
      customer ? customer.id : null,
      customerNameSnapshot,
      customerPhoneSnapshot,
      cashierNameSnapshot,
      counterSnapshot,
      totals.grandTotal,
      0,
      timestamp,
      timestamp,
    );

    const billId = Number(bill.lastInsertRowid);
    const insertItem = db.prepare('INSERT INTO bill_items (bill_id, product_id, product_name_snapshot, product_tamil_name_snapshot, barcode_snapshot, quantity, unit, selling_price, mrp, gst_percent, line_total, discount_amount, cost_price_snapshot, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');

    for (const [index, item] of resolved.entries()) {
      const lineTotal = item.product.sellingPrice * item.quantity;
      insertItem.run(
        billId,
        item.product.id,
        item.product.nameEnglish,
        item.product.nameTamil || '',
        item.product.identifierValue || '',
        item.quantity,
        item.stock.unit || item.product.unitSymbol || item.product.unitName || 'UNIT',
        item.product.sellingPrice,
        item.product.mrp,
        item.product.gstPercent,
        lineTotal,
        0,
        item.product.purchasePrice,
        timestamp,
      );

      let remaining = item.quantity;
      const batches = db.prepare('SELECT id, quantity FROM inventory_batches WHERE product_id = ? AND quantity > 0 ORDER BY CASE WHEN expiry_date IS NULL THEN 1 ELSE 0 END, expiry_date, id').all(item.product.id) as Array<{ id: number; quantity: number }>;
      for (const batch of batches) {
        const used = Math.min(remaining, batch.quantity);
        db.prepare('UPDATE inventory_batches SET quantity = quantity - ?, updated_at = ? WHERE id = ?').run(used, timestamp, batch.id);
        remaining -= used;
        if (remaining <= 0) break;
      }

      const after = item.stock.currentQuantity - item.quantity;
      db.prepare('UPDATE inventory_stock SET current_quantity = ?, updated_at = ? WHERE product_id = ?').run(after, timestamp, item.product.id);
      db.prepare('INSERT INTO inventory_movements (product_id, movement_type, quantity, before_quantity, after_quantity, unit, reference_id, reason, notes, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(item.product.id, 'SALE', -item.quantity, item.stock.currentQuantity, after, item.stock.unit, String(billId), 'BILL', billNumber, input.cashierId, timestamp);
    }

    return getBill(billId);
  })();
}

export function getBill(id: number) {
  const bill = db.prepare(`
    SELECT b.*, c.name AS customer_name, c.phone AS customer_phone
    FROM bills b
    LEFT JOIN customers c ON c.id = b.customer_id
    WHERE b.id = ?
  `).get(id) as Record<string, unknown> | undefined;

  if (!bill) return undefined;
  return { ...bill, items: db.prepare('SELECT * FROM bill_items WHERE bill_id = ? ORDER BY id').all(id) };
}

export function listBills(search = '') {
  return db.prepare(`
    SELECT b.*, c.name AS customer_name, c.phone AS customer_phone
    FROM bills b
    LEFT JOIN customers c ON c.id = b.customer_id
    WHERE b.bill_number LIKE ?
    ORDER BY b.created_at DESC
    LIMIT 50
  `).all(`%${search}%`);
}
