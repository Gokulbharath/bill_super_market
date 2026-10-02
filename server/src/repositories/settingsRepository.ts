import { db } from '../database/db.js';

export interface StoreSettings {
  name: string;
  shortName: string;
  address: {
    line1: string;
    line2: string;
    area: string;
    city: string;
    district: string;
    state: string;
    pincode: string;
    country: string;
  };
  phone: string;
  alternatePhone: string;
  email: string;
  gstin: string;
  receipt: {
    footerNote: string;
    showGST: boolean;
    showCustomerDetails: boolean;
    showCashier: boolean;
    showCounter: boolean;
    showBarcode: boolean;
    showQR: boolean;
    printTamilProductName: boolean;
    printEnglishProductName: boolean;
    copies: number;
    copy1Label: string;
    copy2Label: string;
    counter: string;
    paperSize: '58mm' | '80mm' | 'A4';
    receiptPrinter: string;
    labelPrinter: string;
    upiId: string;
  };
  tax: { cgst: number; sgst: number };
}

const defaults: StoreSettings = {
  name: 'SREE SUPER MARKET',
  shortName: 'Sree Super Market',
  address: { line1: 'Siruvani Main Road', line2: 'Alandurai', area: 'Alandurai', city: 'Coimbatore', district: 'Coimbatore', state: 'Tamil Nadu', pincode: '641101', country: 'India' },
  phone: '', alternatePhone: '', email: '', gstin: '',
  receipt: {
    footerNote: 'Thank you for shopping with us!', showGST: true, showCustomerDetails: true, showCashier: true,
    showCounter: true, showBarcode: false, showQR: false, printTamilProductName: true, printEnglishProductName: true,
    copies: 2, copy1Label: 'CASHIER COPY', copy2Label: 'DELIVERY COPY', counter: 'Counter 01', paperSize: '80mm',
    receiptPrinter: '', labelPrinter: '', upiId: '',
  },
  tax: { cgst: 0, sgst: 0 },
};

const timestamp = () => new Date().toISOString();

export function getStoreSettings(): StoreSettings {
  const row = db.prepare("SELECT setting_value FROM settings WHERE setting_key = 'store'").get() as { setting_value: string } | undefined;
  if (!row) return defaults;
  try {
    const saved = JSON.parse(row.setting_value) as Partial<StoreSettings>;
    return {
      ...defaults,
      ...saved,
      address: { ...defaults.address, ...(saved.address || {}) },
      receipt: { ...defaults.receipt, ...(saved.receipt || {}) },
      tax: { ...defaults.tax, ...(saved.tax || {}) },
    };
  } catch {
    return defaults;
  }
}

export function updateStoreSettings(input: Partial<StoreSettings>) {
  const current = getStoreSettings();
  const next: StoreSettings = {
    ...current,
    ...input,
    address: { ...current.address, ...(input.address || {}) },
    receipt: { ...current.receipt, ...(input.receipt || {}) },
    tax: { ...current.tax, ...(input.tax || {}) },
  };
  next.name = next.name.trim();
  if (!next.name) throw new Error('STORE_NAME_REQUIRED');
  if (!['58mm', '80mm', 'A4'].includes(next.receipt.paperSize)) throw new Error('INVALID_RECEIPT_SIZE');
  if (!Number.isInteger(next.receipt.copies) || next.receipt.copies < 1 || next.receipt.copies > 3) throw new Error('INVALID_RECEIPT_COPIES');
  if (![next.tax.cgst, next.tax.sgst].every((value) => Number.isFinite(value) && value >= 0 && value <= 100)) throw new Error('INVALID_TAX_SETTING');
  db.prepare(`INSERT INTO settings (setting_key, setting_value, updated_at) VALUES ('store', ?, ?)
    ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value, updated_at = excluded.updated_at`).run(JSON.stringify(next), timestamp());
  return next;
}

export interface ProfileRecord {
  userId: string;
  name: string;
  email: string;
  phone: string;
  avatarUrl: string;
  role: string;
  updatedAt: string;
}

export function getProfile(input: { userId: string; name: string; email: string; role: string }): ProfileRecord {
  if (!input.userId) throw new Error('PROFILE_USER_REQUIRED');
  let profile = db.prepare('SELECT user_id AS userId, name, email, phone, avatar_url AS avatarUrl, role, updated_at AS updatedAt FROM user_profiles WHERE user_id = ?').get(input.userId) as ProfileRecord | undefined;
  if (!profile) {
    const updatedAt = timestamp();
    db.prepare('INSERT INTO user_profiles (user_id, name, email, phone, avatar_url, role, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(input.userId, input.name || 'Owner', input.email || '', '', '', input.role || 'OWNER', updatedAt);
    profile = db.prepare('SELECT user_id AS userId, name, email, phone, avatar_url AS avatarUrl, role, updated_at AS updatedAt FROM user_profiles WHERE user_id = ?').get(input.userId) as ProfileRecord;
  }
  return profile;
}

export function updateProfile(input: { userId: string; name?: string; email?: string; phone?: string; avatarUrl?: string; role: string }) {
  const current = getProfile({ ...input, name: input.name || '', email: input.email || '' });
  const name = String(input.name ?? current.name).trim();
  const email = String(input.email ?? current.email).trim();
  const phone = String(input.phone ?? current.phone).trim();
  const avatarUrl = String(input.avatarUrl ?? current.avatarUrl).trim();
  if (!name) throw new Error('PROFILE_NAME_REQUIRED');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('INVALID_EMAIL');
  const updatedAt = timestamp();
  db.prepare('UPDATE user_profiles SET name = ?, email = ?, phone = ?, avatar_url = ?, updated_at = ? WHERE user_id = ?').run(name, email, phone, avatarUrl, updatedAt, input.userId);
  return db.prepare('SELECT user_id AS userId, name, email, phone, avatar_url AS avatarUrl, role, updated_at AS updatedAt FROM user_profiles WHERE user_id = ?').get(input.userId) as ProfileRecord;
}