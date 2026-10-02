import { db } from '../database/db.js';

export type SupplierInput = {
  name?: string;
  contactPerson?: string;
  phone?: string;
  alternatePhone?: string;
  email?: string;
  gstin?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  notes?: string;
  status?: string;
};

const timestamp = () => new Date().toISOString();

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, '');
  const local = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
  if (!/^[6-9]\d{9}$/.test(local)) throw new Error('INVALID_PHONE');
  return local;
}

function supplierQuery(where = '') {
  return `
    SELECT s.*,
      (SELECT COUNT(*) FROM purchases p WHERE p.supplier_id = s.id AND p.status <> 'CANCELLED') AS total_purchases,
      (SELECT COALESCE(SUM(p.grand_total), 0) FROM purchases p WHERE p.supplier_id = s.id AND p.status <> 'CANCELLED') AS total_purchase_value,
      (SELECT MAX(p.purchase_date) FROM purchases p WHERE p.supplier_id = s.id AND p.status <> 'CANCELLED') AS last_purchase_date,
      (SELECT COALESCE(SUM(pp.amount), 0) FROM purchase_payments pp JOIN purchases p ON p.id = pp.purchase_id WHERE p.supplier_id = s.id AND p.status <> 'CANCELLED') AS amount_paid,
      (SELECT COALESCE(SUM(p.grand_total), 0) FROM purchases p WHERE p.supplier_id = s.id AND p.status <> 'CANCELLED') -
      (SELECT COALESCE(SUM(pp.amount), 0) FROM purchase_payments pp JOIN purchases p ON p.id = pp.purchase_id WHERE p.supplier_id = s.id AND p.status <> 'CANCELLED') AS outstanding
    FROM suppliers s ${where}
  `;
}

function validateInput(input: SupplierInput, existing?: Record<string, unknown>) {
  const name = String(input.name ?? existing?.name ?? '').trim();
  const phone = normalizePhone(String(input.phone ?? existing?.phone ?? ''));
  const alternatePhoneValue = String(input.alternatePhone ?? existing?.alternate_phone ?? '').trim();
  const alternatePhone = alternatePhoneValue ? normalizePhone(alternatePhoneValue) : '';
  const email = String(input.email ?? existing?.email ?? '').trim();
  const gstin = String(input.gstin ?? existing?.gstin ?? '').trim().toUpperCase();
  const status = String(input.status ?? existing?.status ?? 'ACTIVE').toUpperCase();
  if (!name) throw new Error('INVALID_NAME');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('INVALID_EMAIL');
  if (gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/.test(gstin)) throw new Error('INVALID_GSTIN');
  if (!['ACTIVE', 'INACTIVE'].includes(status)) throw new Error('INVALID_STATUS');
  return {
    name,
    contactPerson: String(input.contactPerson ?? existing?.contact_person ?? '').trim(),
    phone,
    alternatePhone,
    email,
    gstin,
    addressLine1: String(input.addressLine1 ?? existing?.address_line1 ?? existing?.address ?? '').trim(),
    addressLine2: String(input.addressLine2 ?? existing?.address_line2 ?? '').trim(),
    city: String(input.city ?? existing?.city ?? '').trim(),
    state: String(input.state ?? existing?.state ?? '').trim(),
    pincode: String(input.pincode ?? existing?.pincode ?? '').trim(),
    notes: String(input.notes ?? existing?.notes ?? '').trim(),
    status,
  };
}

function assertUnique(phone: string, gstin: string, id?: number) {
  const phoneMatch = db.prepare('SELECT id FROM suppliers WHERE phone = ? AND id <> COALESCE(?, -1)').get(phone, id ?? null);
  if (phoneMatch) throw new Error('DUPLICATE_PHONE');
  if (gstin) {
    const gstinMatch = db.prepare('SELECT id FROM suppliers WHERE upper(gstin) = ? AND id <> COALESCE(?, -1)').get(gstin, id ?? null);
    if (gstinMatch) throw new Error('DUPLICATE_GSTIN');
  }
}

function nextSupplierCode() {
  const nextId = Number((db.prepare('SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM suppliers').get() as { next_id: number }).next_id);
  return `SUP${String(nextId).padStart(6, '0')}`;
}

export function listSuppliers(search = '', status = 'ALL') {
  const terms: string[] = [];
  const params: string[] = [];
  const term = search.trim();
  if (term) {
    terms.push('(s.name LIKE ? OR s.contact_person LIKE ? OR s.phone LIKE ? OR s.alternate_phone LIKE ? OR s.gstin LIKE ? OR s.supplier_code LIKE ?)');
    params.push(...Array(6).fill(`%${term}%`));
  }
  if (status !== 'ALL') {
    terms.push('s.status = ?');
    params.push(status);
  }
  const where = terms.length ? `WHERE ${terms.join(' AND ')}` : '';
  return db.prepare(`${supplierQuery(where)} ORDER BY s.name COLLATE NOCASE`).all(...params);
}

export function getSupplier(id: number) {
  return db.prepare(`${supplierQuery('WHERE s.id = ?')} LIMIT 1`).get(id);
}

export function createSupplier(input: SupplierInput) {
  const supplier = validateInput(input);
  assertUnique(supplier.phone, supplier.gstin);
  const now = timestamp();
  const address = [supplier.addressLine1, supplier.addressLine2, supplier.city, supplier.state, supplier.pincode].filter(Boolean).join(', ');
  const result = db.prepare(`
    INSERT INTO suppliers (
      supplier_code, name, contact_person, phone, alternate_phone, email, gstin,
      address, address_line1, address_line2, city, state, pincode, notes, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(nextSupplierCode(), supplier.name, supplier.contactPerson, supplier.phone, supplier.alternatePhone, supplier.email, supplier.gstin, address, supplier.addressLine1, supplier.addressLine2, supplier.city, supplier.state, supplier.pincode, supplier.notes, supplier.status, now, now);
  return getSupplier(Number(result.lastInsertRowid));
}

export function updateSupplier(id: number, input: SupplierInput) {
  const existing = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!existing) return undefined;
  const supplier = validateInput(input, existing);
  assertUnique(supplier.phone, supplier.gstin, id);
  const address = [supplier.addressLine1, supplier.addressLine2, supplier.city, supplier.state, supplier.pincode].filter(Boolean).join(', ');
  db.prepare(`
    UPDATE suppliers SET name = ?, contact_person = ?, phone = ?, alternate_phone = ?, email = ?, gstin = ?,
      address = ?, address_line1 = ?, address_line2 = ?, city = ?, state = ?, pincode = ?, notes = ?, status = ?, updated_at = ?
    WHERE id = ?
  `).run(supplier.name, supplier.contactPerson, supplier.phone, supplier.alternatePhone, supplier.email, supplier.gstin, address, supplier.addressLine1, supplier.addressLine2, supplier.city, supplier.state, supplier.pincode, supplier.notes, supplier.status, timestamp(), id);
  return getSupplier(id);
}

export function setSupplierStatus(id: number, status: string) {
  if (!['ACTIVE', 'INACTIVE'].includes(status)) throw new Error('INVALID_STATUS');
  const result = db.prepare('UPDATE suppliers SET status = ?, updated_at = ? WHERE id = ?').run(status, timestamp(), id);
  return result.changes ? getSupplier(id) : undefined;
}

export function supplierSummary() {
  return db.prepare(`
    SELECT
      COUNT(*) AS total_suppliers,
      COALESCE(SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END), 0) AS active_suppliers,
      (SELECT COUNT(*) FROM purchases WHERE status <> 'CANCELLED') AS total_purchases,
      COALESCE(SUM(outstanding), 0) AS outstanding_amount
    FROM (${supplierQuery()})
  `).get();
}