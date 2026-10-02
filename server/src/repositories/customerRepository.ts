import { db } from '../database/db.js';

export type CustomerRecord = {
  id: number;
  customer_code: string;
  name: string;
  phone: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export function normalizePhone(value: string) {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  return digits;
}

export function getCustomerById(id: number) {
  return db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as CustomerRecord | undefined;
}

export function getCustomerByPhone(phone: string) {
  const normalized = normalizePhone(phone);
  if (!normalized) return undefined;
  return db.prepare('SELECT * FROM customers WHERE phone = ?').get(normalized) as CustomerRecord | undefined;
}

export function nextCustomerCode() {
  const row = db.prepare('SELECT customer_code AS customerCode FROM customers ORDER BY id DESC LIMIT 1').get() as { customerCode?: string } | undefined;
  const sequence = row?.customerCode ? Number(row.customerCode.replace('CUS', '')) + 1 : 1;
  return `CUS${String(sequence).padStart(6, '0')}`;
}

export function listCustomers(search = '') {
  const term = String(search || '').trim();
  if (!term) {
    return db.prepare('SELECT * FROM customers ORDER BY created_at DESC LIMIT 100').all() as CustomerRecord[];
  }

  const value = `%${term}%`;
  return db.prepare(`
    SELECT *
    FROM customers
    WHERE name LIKE ?
       OR phone LIKE ?
       OR customer_code LIKE ?
    ORDER BY created_at DESC
    LIMIT 100
  `).all(value, value, value) as CustomerRecord[];
}

export function createCustomer(input: { name?: string; phone?: string; status?: string }) {
  const name = String(input.name || '').trim();
  const phone = normalizePhone(String(input.phone || ''));
  if (!name || !phone) throw new Error('INVALID_CUSTOMER');

  const existing = getCustomerByPhone(phone);
  if (existing) return existing;

  const customerCode = nextCustomerCode();
  const timestamp = new Date().toISOString();
  const result = db.prepare(
    'INSERT INTO customers (customer_code, name, phone, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(customerCode, name, phone, input.status || 'ACTIVE', timestamp, timestamp);

  return getCustomerById(Number(result.lastInsertRowid));
}

export function updateCustomer(id: number, input: { name?: string; phone?: string; status?: string }) {
  const customer = getCustomerById(id);
  if (!customer) return undefined;

  const nextName = String(input.name ?? customer.name).trim();
  const nextPhone = normalizePhone(String(input.phone ?? customer.phone));
  if (!nextName || !nextPhone) throw new Error('INVALID_CUSTOMER');

  const duplicate = db.prepare('SELECT id FROM customers WHERE phone = ? AND id != ?').get(nextPhone, id) as { id: number } | undefined;
  if (duplicate) throw new Error('CUSTOMER_PHONE_EXISTS');

  db.prepare('UPDATE customers SET name = ?, phone = ?, status = ?, updated_at = ? WHERE id = ?').run(nextName, nextPhone, input.status || customer.status, new Date().toISOString(), id);
  return getCustomerById(id);
}

export function getCustomerBills(customerId: number) {
  return db.prepare('SELECT * FROM bills WHERE customer_id = ? ORDER BY created_at DESC LIMIT 50').all(customerId) as Array<Record<string, unknown>>;
}
