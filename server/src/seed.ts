import { db } from './database/db.js';
import { runMigrations } from './database/migrate.js';

type CountRow = { count: number };

export function seedDatabase() {
  const now = () => new Date().toISOString();
  const categories = [
    'Dairy', 'Biscuits', 'Beverages', 'Groceries', 'Household', 'Personal Care', 'Snacks', 'Bakery', 'Vegetables', 'Stationery'
  ];
  const subcategories = [
    ['Dairy', 'Milk'], ['Dairy', 'Curd'], ['Biscuits', 'Cream Biscuits'], ['Beverages', 'Soft Drinks'], ['Groceries', 'Rice'], ['Household', 'Detergent'], ['Personal Care', 'Soap'], ['Snacks', 'Namkeen'], ['Bakery', 'Bread'], ['Vegetables', 'Fresh Veg']
  ];
  const brands = [
    'Aavin', 'Parle', 'Dove', 'Maggi', 'Aashirvaad', 'Tata', 'Coca-Cola', 'Britannia', 'Surf Excel', 'Colgate',
    'Aachi', 'Sakthi', 'Anil', 'GRB', 'Milky Mist', 'Hatsun', 'Arun', "Cavin's", 'Ibaco', 'Nandini', 'MTR', 'Priya',
    'Lion', 'Shanthi', 'Eastern', 'Double Horse', '24 Mantra', 'ID', 'Bambino', 'India Gate', 'Daawat', 'Fortune',
    'Patanjali', 'Thums Up', 'Sprite', 'Fanta', 'Maaza', 'Kinley', 'Bisleri', 'Pepsi', '7UP', 'Mirinda', 'Horlicks',
    'Boost', 'Complan', 'Vim', 'Harpic', 'Lizol', 'Dettol', 'Lifebuoy', 'Lux', 'Pears', 'Santoor', 'Clinic Plus',
    'Head & Shoulders', 'Pantene', 'Closeup', 'Sensodyne', 'Pepsodent', 'Fair & Lovely', 'Nivea', 'Vaseline', 'Ponds', 'Himalaya', 'Nestle'
  ];
  const units = [
    { name: 'Piece', symbol: 'PCS' },
    { name: 'Kilogram', symbol: 'KG' },
    { name: 'Gram', symbol: 'G' },
    { name: 'Litre', symbol: 'L' },
    { name: 'Millilitre', symbol: 'ML' },
    { name: 'Packet', symbol: 'PKT' },
    { name: 'Box', symbol: 'BOX' },
    { name: 'Bottle', symbol: 'BTL' }
  ];
  const suppliers = [
    { supplier_code: 'SUP-001', name: 'Aavin Supply Co.', phone: '9876543210', email: 'aavin@sree.local', address: 'Coimbatore' },
    { supplier_code: 'SUP-002', name: 'Parle Distribution', phone: '9876543211', email: 'parle@sree.local', address: 'Coimbatore' },
    { supplier_code: 'SUP-003', name: 'Metro Wholesale', phone: '9876543212', email: 'metro@sree.local', address: 'Coimbatore' }
  ];

  const categoryInsert = db.prepare('INSERT OR IGNORE INTO categories (name, description, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)');
  for (const name of categories) categoryInsert.run(name, `${name} category`, 'ACTIVE', now(), now());

  const subcategoryInsert = db.prepare('INSERT OR IGNORE INTO subcategories (category_id, name, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)');
  for (const [categoryName, subName] of subcategories) {
    const category = db.prepare('SELECT id FROM categories WHERE name = ?').get(categoryName) as { id: number } | undefined;
    if (category) subcategoryInsert.run(category.id, subName, 'ACTIVE', now(), now());
  }

  const brandInsert = db.prepare('INSERT OR IGNORE INTO brands (name, description, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)');
  for (const name of brands) brandInsert.run(name, `${name} brand`, 'ACTIVE', now(), now());

  const unitInsert = db.prepare('INSERT OR IGNORE INTO units (name, symbol, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)');
  for (const unit of units) unitInsert.run(unit.name, unit.symbol, 'ACTIVE', now(), now());

  const supplierInsert = db.prepare('INSERT OR IGNORE INTO suppliers (supplier_code, name, phone, email, address, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  for (const supplier of suppliers) supplierInsert.run(supplier.supplier_code, supplier.name, supplier.phone, supplier.email, supplier.address, 'ACTIVE', now(), now());

  const productInsert = db.prepare(`INSERT OR IGNORE INTO products (
    product_code, sku, name_english, name_tamil, short_name, description, product_type, category_id, subcategory_id, brand_id, unit_id, supplier_id, pack_size, purchase_price, selling_price, mrp, discount_percent, gst_percent, hsn_code, opening_stock, minimum_stock, maximum_stock, warehouse, shelf_number, low_stock_alert, has_expiry, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const aavinCategory = db.prepare('SELECT id FROM categories WHERE name = ?').get('Dairy') as { id: number } | undefined;
  const aavinBrand = db.prepare('SELECT id FROM brands WHERE name = ?').get('Aavin') as { id: number } | undefined;
  const packUnit = db.prepare('SELECT id FROM units WHERE symbol = ?').get('L') as { id: number } | undefined;
  const supplier = db.prepare('SELECT id FROM suppliers WHERE supplier_code = ?').get('SUP-001') as { id: number } | undefined;

  if (aavinCategory && aavinBrand && packUnit && supplier) {
    const existingProductCount = Number((db.prepare('SELECT COUNT(*) AS count FROM products').get() as CountRow | undefined)?.count ?? 0);
    if (existingProductCount === 0) {
      productInsert.run(
        'PROD000001', 'AAV-MILK-500', 'Aavin Full Cream Milk', 'ஆவின் முழு கொழுப்பு பால்', 'Milk', 'Fresh dairy product', 'MANUFACTURER_PRODUCT',
        aavinCategory.id, null, aavinBrand.id, packUnit.id, supplier.id, 1, 22, 30, 32, 6, 5, '0401', 30, 12, 60, 'Main Store', 'A-01', 1, 0, 'ACTIVE', now(), now()
      );
    }
  }

  const identifierInsert = db.prepare('INSERT OR IGNORE INTO product_identifiers (product_id, identifier_type, identifier_value, is_primary, source, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const product = db.prepare('SELECT id FROM products WHERE sku = ?').get('AAV-MILK-500') as { id: number } | undefined;
  if (product) {
    const existingIdentifierCount = Number((db.prepare('SELECT COUNT(*) AS count FROM product_identifiers WHERE product_id = ?').get(product.id) as CountRow | undefined)?.count ?? 0);
    if (existingIdentifierCount === 0) {
      identifierInsert.run(product.id, 'EAN13', '8901234567890', 1, 'MANUFACTURER', now(), now());
    }
  }

  return true;
}

if (process.argv[1]?.includes('seed.ts') || process.argv[1]?.includes('seed.js')) {
  runMigrations();
  seedDatabase();
  console.log('Seed data initialized.');
}
