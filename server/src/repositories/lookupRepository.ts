import { db } from '../database/db.js';

export function listCategories() {
  return db.prepare('SELECT * FROM categories ORDER BY name ASC').all();
}

export function listSubcategories() {
  return db.prepare('SELECT * FROM subcategories ORDER BY name ASC').all();
}

export function listBrands() {
  return db.prepare('SELECT * FROM brands ORDER BY name ASC').all();
}

export function createBrand(input: { name: string; description?: string; status?: string }) {
  const name = input.name.trim();
  if (!name) throw new Error('Brand name is required.');
  const existing = db.prepare('SELECT id, name FROM brands WHERE lower(name) = lower(?)').get(name) as { id: number; name: string } | undefined;
  if (existing) throw new Error('Brand already exists.');
  const timestamp = new Date().toISOString();
  const result = db.prepare('INSERT INTO brands (name, description, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(name, input.description?.trim() || '', input.status || 'ACTIVE', timestamp, timestamp);
  return db.prepare('SELECT * FROM brands WHERE id = ?').get(result.lastInsertRowid);
}

export function listUnits() {
  return db.prepare('SELECT * FROM units ORDER BY name ASC').all();
}

export function listSuppliers() {
  return db.prepare('SELECT * FROM suppliers ORDER BY name ASC').all();
}
