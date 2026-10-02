import { db } from '../database/db.js';

const now = () => new Date().toISOString();

function nextHoldNumber() {
  const latest = db.prepare('SELECT hold_number FROM held_bills ORDER BY id DESC LIMIT 1').get() as { hold_number: string } | undefined;
  const sequence = latest ? Number(latest.hold_number.replace('HOLD-', '')) + 1 : 1;
  return `HOLD-${String(sequence).padStart(6, '0')}`;
}

function decode(row: { payload: string; [key: string]: unknown }) {
  let payload: Record<string, unknown> = {};
  try { payload = JSON.parse(row.payload) as Record<string, unknown>; } catch { payload = {}; }
  const items = Array.isArray(payload.items) ? payload.items : [];
  return {
    ...row,
    ...payload,
    item_count: items.reduce((sum, item) => sum + Number((item as { quantity?: number }).quantity || 0), 0),
    items,
  };
}

export function listHeldBills() {
  const rows = db.prepare('SELECT * FROM held_bills ORDER BY created_at DESC, id DESC').all() as Array<{ payload: string; [key: string]: unknown }>;
  return rows.map(decode);
}

export function getHeldBill(id: number) {
  const row = db.prepare('SELECT * FROM held_bills WHERE id = ?').get(id) as { payload: string; [key: string]: unknown } | undefined;
  return row ? decode(row) : undefined;
}

export function createHeldBill(input: { cashierId?: string; cashierName?: string; customer?: Record<string, unknown>; items?: Array<Record<string, unknown>>; discount?: number; notes?: string }) {
  if (!Array.isArray(input.items) || input.items.length === 0) throw new Error('EMPTY_CART');
  for (const item of input.items) {
    const quantity = Number(item.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('INVALID_QUANTITY');
  }
  const timestamp = now();
  const holdNumber = nextHoldNumber();
  const payload = JSON.stringify({
    cashierId: input.cashierId || 'CASHIER',
    cashierName: input.cashierName || input.cashierId || 'Cashier',
    customer: input.customer || { id: null, name: 'Walk-in Customer', phone: '' },
    items: input.items,
    discount: Number(input.discount || 0),
    notes: String(input.notes || '').trim(),
  });
  const result = db.prepare('INSERT INTO held_bills (hold_number, cashier_id, payload, notes, created_at) VALUES (?, ?, ?, ?, ?)').run(holdNumber, input.cashierId || 'CASHIER', payload, String(input.notes || '').trim(), timestamp);
  return getHeldBill(Number(result.lastInsertRowid));
}

export function deleteHeldBill(id: number) {
  const result = db.prepare('DELETE FROM held_bills WHERE id = ?').run(id);
  return result.changes > 0;
}