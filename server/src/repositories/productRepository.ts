import { db } from '../database/db.js';
import type { ProductInput, ProductPriceUpdate } from '../types/product.js';

const now = () => new Date().toISOString();

function validatePrices(purchasePrice: number, mrp: number, sellingPrice: number) {
  if (![purchasePrice, mrp, sellingPrice].every((value) => Number.isFinite(value) && value >= 0)) throw new Error('INVALID_PRICE');
  if (sellingPrice > mrp) throw new Error('SELLING_PRICE_EXCEEDS_MRP');
}

function insertPriceHistory(productId: number, oldPrices: { purchasePrice: number; mrp: number; sellingPrice: number }, newPrices: { purchasePrice: number; mrp: number; sellingPrice: number }, changedBy: string, reason: string) {
  if (oldPrices.purchasePrice === newPrices.purchasePrice && oldPrices.mrp === newPrices.mrp && oldPrices.sellingPrice === newPrices.sellingPrice) return;
  db.prepare('INSERT INTO product_price_history (product_id, old_purchase_price, new_purchase_price, old_mrp, new_mrp, old_selling_price, new_selling_price, changed_by, changed_at, reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(productId, oldPrices.purchasePrice, newPrices.purchasePrice, oldPrices.mrp, newPrices.mrp, oldPrices.sellingPrice, newPrices.sellingPrice, changedBy || 'SYSTEM', now(), reason || '');
}

function normalizedIdentifier(input: ProductInput) {
  if (input.productType === 'SHOP_PACKED_PRODUCT' && input.identifier) throw new Error('SHOP_IDENTIFIER_MANAGED');
  if (!input.identifier) {
    if (input.productType === 'MANUFACTURER_PRODUCT') throw new Error('IDENTIFIER_REQUIRED');
    return undefined;
  }
  const identifierValue = input.identifier.identifierValue.trim();
  const valid = input.identifier.identifierType === 'EAN13' ? /^\d{13}$/.test(identifierValue)
    : input.identifier.identifierType === 'EAN8' ? /^\d{8}$/.test(identifierValue)
      : input.identifier.identifierType === 'UPC' ? /^\d{12}$/.test(identifierValue)
        : input.identifier.identifierType === 'INTERNAL_BARCODE' ? /^[A-Za-z0-9_-]+$/.test(identifierValue)
          : identifierValue.length > 0;
  if (!valid) throw new Error('INVALID_IDENTIFIER');
  return { ...input.identifier, identifierValue };
}

function nextShopBarcode() {
  const rows = db.prepare("SELECT identifier_value AS value FROM product_identifiers WHERE identifier_type = 'INTERNAL_BARCODE' AND identifier_value LIKE 'SSM%'").all() as Array<{ value: string }>;
  const highest = rows.reduce((max, row) => {
    const match = /^SSM(\d{6})$/.exec(row.value);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `SSM${String(highest + 1).padStart(6, '0')}`;
}

export function getNextShopBarcode() {
  return nextShopBarcode();
}

function mapProductRow(row: any) {
  if (!row) return row;
  return {
    ...row,
    productCode: row.product_code,
    nameEnglish: row.name_english,
    nameTamil: row.name_tamil,
    shortName: row.short_name,
    productType: row.product_type,
    brandId: row.brand_id,
    categoryId: row.category_id,
    subcategoryId: row.subcategory_id,
    unitId: row.unit_id,
    packSize: row.pack_size,
    purchasePrice: row.purchase_price,
    sellingPrice: row.selling_price,
    gstPercent: row.gst_percent,
    hsnCode: row.hsn_code,
    openingStock: row.opening_stock,
    minimumStock: row.minimum_stock,
    maximumStock: row.maximum_stock,
    hasExpiry: Boolean(row.has_expiry),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    brandName: row.brandName,
    categoryName: row.categoryName,
    unitName: row.unitName,
    unitSymbol: row.unitSymbol,
  };
}

export function listProducts(query: { search?: string; status?: string; categoryId?: string; brandId?: string }) {
  const terms: string[] = [];
  const values: Record<string, string | number> = {};
  if (query.search) { terms.push('(p.name_english LIKE @search OR p.name_tamil LIKE @search OR p.sku LIKE @search OR p.product_code LIKE @search OR pi.identifier_value LIKE @search OR b.name LIKE @search OR c.name LIKE @search)'); values.search = `%${query.search}%`; }
  if (query.status) { terms.push('p.status = @status'); values.status = query.status; }
  if (query.categoryId) { terms.push('p.category_id = @categoryId'); values.categoryId = Number(query.categoryId); }
  if (query.brandId) { terms.push('p.brand_id = @brandId'); values.brandId = Number(query.brandId); }
  if ((query as { productType?: string }).productType) { terms.push('p.product_type = @productType'); values.productType = (query as { productType: string }).productType; }
  const where = terms.length ? `WHERE ${terms.join(' AND ')}` : '';
  const rows = db.prepare(`SELECT DISTINCT p.*, b.name AS brandName, c.name AS categoryName, sc.name AS subcategoryName, u.name AS unitName, u.symbol AS unitSymbol, pi.identifier_type AS identifierType, pi.identifier_value AS identifierValue FROM products p LEFT JOIN brands b ON b.id = p.brand_id LEFT JOIN categories c ON c.id = p.category_id LEFT JOIN subcategories sc ON sc.id = p.subcategory_id LEFT JOIN units u ON u.id = p.unit_id LEFT JOIN product_identifiers pi ON pi.product_id = p.id AND pi.is_primary = 1 ${where} ORDER BY p.updated_at DESC`).all(values) as any[];
  return rows.map(mapProductRow);
}

export function getProduct(id: number) {
  const row = db.prepare('SELECT p.*, b.name AS brandName, c.name AS categoryName, sc.name AS subcategoryName, u.name AS unitName, u.symbol AS unitSymbol, pi.identifier_type AS identifierType, pi.identifier_value AS identifierValue FROM products p LEFT JOIN brands b ON b.id = p.brand_id LEFT JOIN categories c ON c.id = p.category_id LEFT JOIN subcategories sc ON sc.id = p.subcategory_id LEFT JOIN units u ON u.id = p.unit_id LEFT JOIN product_identifiers pi ON pi.product_id = p.id AND pi.is_primary = 1 WHERE p.id = ?').get(id) as any;
  return mapProductRow(row);
}

export function createProduct(input: ProductInput) {
  const timestamp = now();
  validatePrices(input.purchasePrice, input.mrp, input.sellingPrice);
  const identifier = input.productType === 'SHOP_PACKED_PRODUCT'
    ? { identifierType: 'INTERNAL_BARCODE' as const, identifierValue: '', isPrimary: true }
    : normalizedIdentifier(input);
  const nextProduct = db.prepare<[], { next: number }>('SELECT COALESCE(MAX(id), 0) + 1 AS next FROM products').get();
  const productCode = input.productCode || `PROD${String(nextProduct?.next || 1).padStart(6, '0')}`;
  const insertProduct = db.prepare(`INSERT INTO products (product_code, sku, name_english, name_tamil, short_name, description, brand_id, category_id, subcategory_id, unit_id, pack_size, product_type, purchase_price, mrp, selling_price, gst_percent, hsn_code, opening_stock, minimum_stock, maximum_stock, has_expiry, status, created_at, updated_at) VALUES (@productCode,@sku,@nameEnglish,@nameTamil,@shortName,@description,@brandId,@categoryId,@subcategoryId,@unitId,@packSize,@productType,@purchasePrice,@mrp,@sellingPrice,@gstPercent,@hsnCode,@openingStock,@minimumStock,@maximumStock,@hasExpiry,@status,@createdAt,@updatedAt)`);
  const insertIdentifier = db.prepare('INSERT INTO product_identifiers (product_id, identifier_type, identifier_value, is_primary, source, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const productId = db.transaction(() => {
    const result = insertProduct.run({
      ...input,
      productCode,
      nameEnglish: input.nameEnglish || '',
      nameTamil: input.nameTamil || '',
      shortName: input.shortName || '',
      description: input.description || '',
      hsnCode: input.hsnCode || '',
      brandId: input.brandId || null,
      categoryId: input.categoryId || null,
      subcategoryId: input.subcategoryId || null,
      unitId: input.unitId || null,
      packSize: input.packSize || null,
      productType: input.productType,
      status: input.status || 'ACTIVE',
      hasExpiry: input.hasExpiry ? 1 : 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    if (identifier) {
      const identifierValue = input.productType === 'SHOP_PACKED_PRODUCT' ? nextShopBarcode() : identifier.identifierValue;
      insertIdentifier.run(result.lastInsertRowid, identifier.identifierType, identifierValue, identifier.isPrimary ? 1 : 0, input.productType === 'SHOP_PACKED_PRODUCT' ? 'STORE' : 'MANUFACTURER', timestamp, timestamp);
    }
    return Number(result.lastInsertRowid);
  })();

  return getProduct(productId);
}

export function updateProduct(id: number, input: ProductInput) {
  const timestamp = now();
  validatePrices(input.purchasePrice, input.mrp, input.sellingPrice);
  if (input.productType === 'SHOP_PACKED_PRODUCT' && input.identifier) throw new Error('SHOP_IDENTIFIER_IMMUTABLE');
  const identifier = input.identifier ? normalizedIdentifier(input) : undefined;
  const existing = db.prepare('SELECT product_code AS productCode, purchase_price AS purchasePrice, mrp, selling_price AS sellingPrice FROM products WHERE id = ?').get(id) as { productCode: string; purchasePrice: number; mrp: number; sellingPrice: number } | undefined;
  if (!existing) return undefined;
  const update = db.prepare(`UPDATE products SET product_code=@productCode, sku=@sku, name_english=@nameEnglish, name_tamil=@nameTamil, short_name=@shortName, description=@description, brand_id=@brandId, category_id=@categoryId, subcategory_id=@subcategoryId, unit_id=@unitId, pack_size=@packSize, product_type=@productType, purchase_price=@purchasePrice, mrp=@mrp, selling_price=@sellingPrice, gst_percent=@gstPercent, hsn_code=@hsnCode, opening_stock=@openingStock, minimum_stock=@minimumStock, maximum_stock=@maximumStock, has_expiry=@hasExpiry, status=@status, updated_at=@updatedAt WHERE id=@id`);
  const replaceIdentifier = db.prepare('INSERT INTO product_identifiers (product_id, identifier_type, identifier_value, is_primary, source, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
  db.transaction(() => {
    update.run({
      ...input,
      id,
      productCode: input.productCode || existing.productCode,
      nameEnglish: input.nameEnglish || '',
      nameTamil: input.nameTamil || '',
      shortName: input.shortName || '',
      description: input.description || '',
      hsnCode: input.hsnCode || '',
      brandId: input.brandId || null,
      categoryId: input.categoryId || null,
      subcategoryId: input.subcategoryId || null,
      unitId: input.unitId || null,
      packSize: input.packSize || null,
      hasExpiry: input.hasExpiry ? 1 : 0,
      updatedAt: timestamp,
    });
    insertPriceHistory(id, existing, { purchasePrice: input.purchasePrice, mrp: input.mrp, sellingPrice: input.sellingPrice }, input.changedBy || 'SYSTEM', 'Product details updated');
    if (identifier) {
      db.prepare('DELETE FROM product_identifiers WHERE product_id = ?').run(id);
      replaceIdentifier.run(id, identifier.identifierType, identifier.identifierValue, identifier.isPrimary ? 1 : 0, 'MANUFACTURER', timestamp, timestamp);
    }
  })();
  return getProduct(id);
}

export function updateProductPrice(id: number, input: ProductPriceUpdate) {
  validatePrices(input.purchasePrice, input.mrp, input.sellingPrice);
  const existing = db.prepare('SELECT purchase_price AS purchasePrice, mrp, selling_price AS sellingPrice FROM products WHERE id = ?').get(id) as { purchasePrice: number; mrp: number; sellingPrice: number } | undefined;
  if (!existing) return undefined;
  db.transaction(() => {
    db.prepare('UPDATE products SET purchase_price = ?, mrp = ?, selling_price = ?, updated_at = ? WHERE id = ?').run(input.purchasePrice, input.mrp, input.sellingPrice, now(), id);
    insertPriceHistory(id, existing, input, input.changedBy || 'SYSTEM', input.reason || 'Price updated');
  })();
  return getProduct(id);
}

export function listPriceHistory(id: number) {
  return db.prepare('SELECT id, product_id AS productId, old_purchase_price AS oldPurchasePrice, new_purchase_price AS newPurchasePrice, old_mrp AS oldMrp, new_mrp AS newMrp, old_selling_price AS oldSellingPrice, new_selling_price AS newSellingPrice, changed_by AS changedBy, changed_at AS changedAt, reason FROM product_price_history WHERE product_id = ? ORDER BY changed_at DESC').all(id);
}
