import express from 'express';
import cors from 'cors';
import { createProduct, getNextShopBarcode, getProduct, listPriceHistory, listProducts, updateProduct, updateProductPrice } from './repositories/productRepository.js';
import { createBrand, listCategories, listSubcategories, listBrands, listUnits } from './repositories/lookupRepository.js';
import { db } from './database/db.js';
import { adjustStock, batches, listInventory, movements, stockIn, stockOut, summary, updateMinimum } from './repositories/inventoryRepository.js';
import { finalize, getBill, listBills, lookup as lookupBillingProduct, searchProducts } from './repositories/billingRepository.js';
import { createCustomer, getCustomerBills, getCustomerById, getCustomerByPhone, listCustomers, updateCustomer } from './repositories/customerRepository.js';
import { createSupplier, getSupplier, listSuppliers, setSupplierStatus, supplierSummary, updateSupplier } from './repositories/supplierRepository.js';
import { addPurchasePayment, cancelPurchase, createPurchase, getPurchase, listPurchasePayments, listPurchases, lookupPurchaseProduct, purchaseSummary, receivePurchase, searchPurchaseProducts, updateDraftPurchase } from './repositories/purchaseRepository.js';
import { createExpense, createExpenseCategory, deleteExpense, expenseSummary, getExpense, listExpenseCategories, listExpenses, updateExpense } from './repositories/expenseRepository.js';
import { createHeldBill, deleteHeldBill, getHeldBill, listHeldBills } from './repositories/heldBillRepository.js';
import { dashboardRecentBills, expensesReport, gstReport, productSalesReport, purchaseReport, reportSummary, salesReport, topCategories } from './repositories/reportRepository.js';
import { getProfile, getStoreSettings, updateProfile, updateStoreSettings } from './repositories/settingsRepository.js';

export const app = express();
app.use(cors());
app.use(express.json());
const ok = (data: unknown) => ({ success: true, data });
const fail = (message: string, code?: string) => ({ success: false, ...(code ? { code } : {}), message });
const canManageProducts = (req: express.Request) => ['OWNER', 'ADMIN'].includes(String(req.header('x-user-role') || '').toUpperCase());
const inventoryRole = (req: express.Request) => String(req.header('x-user-role') || '').toUpperCase();
const canManageInventory = (req: express.Request) => ['OWNER', 'ADMIN'].includes(inventoryRole(req));
const canManagePurchases = canManageInventory;

app.get('/api/health', (_req, res) => {
  try {
    db.prepare('SELECT 1').get();
    return res.json({ status: 'ok', database: 'connected' });
  } catch {
    return res.status(500).json({ status: 'error', database: 'disconnected' });
  }
});

app.get('/api/customers', (req, res) => res.json(ok(listCustomers(String(req.query.search || '')))));
app.get('/api/customers/search', (req, res) => {
  const phone = String(req.query.phone || '');
  const customer = getCustomerByPhone(phone);
  if (!customer) return res.status(404).json(fail('Customer not found.'));
  return res.json(ok(customer));
});
app.get('/api/customers/:id', (req, res) => {
  const customer = getCustomerById(Number(req.params.id));
  if (!customer) return res.status(404).json(fail('Customer not found.'));
  return res.json(ok(customer));
});
app.get('/api/customers/:id/bills', (req, res) => res.json(ok(getCustomerBills(Number(req.params.id)))));
app.post('/api/customers', (req, res) => {
  try {
    const customer = createCustomer(req.body || {});
    return res.status(201).json(ok(customer));
  } catch (error) {
    if (String(error).includes('INVALID_CUSTOMER')) return res.status(400).json(fail('Name and mobile number are required.'));
    return res.status(400).json(fail('Unable to save customer.'));
  }
});
app.put('/api/customers/:id', (req, res) => {
  try {
    const customer = updateCustomer(Number(req.params.id), req.body || {});
    if (!customer) return res.status(404).json(fail('Customer not found.'));
    return res.json(ok(customer));
  } catch (error) {
    if (String(error).includes('INVALID_CUSTOMER')) return res.status(400).json(fail('Name and mobile number are required.'));
    if (String(error).includes('CUSTOMER_PHONE_EXISTS')) return res.status(409).json(fail('This mobile number already belongs to another customer.'));
    return res.status(400).json(fail('Unable to update customer.'));
  }
});

app.get('/api/products/next-shop-barcode', (req, res) => { if (!canManageProducts(req)) return res.status(403).json(fail('You do not have permission to generate shop barcodes.')); return res.json(ok({ barcode: getNextShopBarcode(), identifierType: 'INTERNAL_BARCODE' })); });
app.get('/api/products', (req, res) => res.json(ok(listProducts(req.query as Record<string, string>))));
app.get('/api/products/:id', (req, res) => { const product = getProduct(Number(req.params.id)); if (!product) return res.status(404).json(fail('Product not found')); return res.json(ok(product)); });
app.get('/api/products/:id/price-history', (req, res) => res.json(ok(listPriceHistory(Number(req.params.id)))));
app.post('/api/products', (req, res) => { if (!canManageProducts(req)) return res.status(403).json(fail('You do not have permission to create products.')); try { const product = createProduct(req.body); return res.status(201).json(ok(product)); } catch (error) { const errorText = String(error); const duplicateIdentifier = errorText.includes('product_identifiers') || errorText.includes('identifier_value'); const duplicate = errorText.includes('UNIQUE'); const message = duplicateIdentifier ? 'This barcode is already assigned to another product.' : errorText.includes('IDENTIFIER_REQUIRED') ? 'A barcode is required for a manufacturer product.' : errorText.includes('INVALID_IDENTIFIER') ? 'Barcode format is not valid for the selected identifier type.' : errorText.includes('SHOP_IDENTIFIER_MANAGED') ? 'Shop barcodes are generated by the server.' : duplicate ? 'SKU or product code already exists.' : 'Unable to create product.'; return res.status(duplicate ? 409 : 400).json(fail(message, duplicateIdentifier ? 'DUPLICATE_IDENTIFIER' : undefined)); } });
app.put('/api/products/:id', (req, res) => { if (!canManageProducts(req)) return res.status(403).json(fail('You do not have permission to update products.')); try { const product = updateProduct(Number(req.params.id), { ...req.body, changedBy: req.header('x-user-role') || 'SYSTEM' }); if (!product) return res.status(404).json(fail('Product not found')); return res.json(ok(product)); } catch (error) { const message = String(error).includes('SELLING_PRICE_EXCEEDS_MRP') ? 'Selling price cannot be greater than MRP.' : String(error).includes('INVALID_PRICE') ? 'Prices must be zero or greater.' : String(error).includes('UNIQUE') ? 'SKU or product code already exists.' : 'Unable to update product.'; return res.status(400).json(fail(message)); } });
app.patch('/api/products/:id/price', (req, res) => { if (!canManageProducts(req)) return res.status(403).json(fail('You do not have permission to update product prices.')); try { const product = updateProductPrice(Number(req.params.id), { ...req.body, changedBy: req.header('x-user-role') || 'SYSTEM' }); if (!product) return res.status(404).json(fail('Product not found')); return res.json(ok(product)); } catch (error) { const message = String(error).includes('SELLING_PRICE_EXCEEDS_MRP') ? 'Selling price cannot be greater than MRP.' : String(error).includes('INVALID_PRICE') ? 'Prices must be zero or greater.' : 'Unable to update product price.'; return res.status(400).json(fail(message)); } });
app.delete('/api/products/:id', (req, res) => { if (!canManageProducts(req)) return res.status(403).json(fail('You do not have permission to deactivate products.')); const result = db.prepare("UPDATE products SET status='INACTIVE', updated_at=? WHERE id=?").run(new Date().toISOString(), Number(req.params.id)); if (!result.changes) return res.status(404).json(fail('Product not found')); return res.json(ok({ message: 'Product deactivated successfully.' })); });

app.get('/api/categories', (_req, res) => res.json(ok(listCategories())));
app.get('/api/subcategories', (_req, res) => res.json(ok(listSubcategories())));
app.get('/api/brands', (_req, res) => res.json(ok(listBrands())));
app.post('/api/brands', (req, res) => {
  if (!['OWNER', 'ADMIN'].includes(String(req.header('x-user-role') || '').toUpperCase())) return res.status(403).json(fail('You do not have permission to create brands.'));
  try { return res.status(201).json(ok(createBrand(req.body))); }
  catch (error) { const message = String(error).includes('Brand already exists') ? 'Brand already exists.' : error instanceof Error ? error.message : 'Unable to create brand. Please try again.'; return res.status(message === 'Brand already exists.' ? 409 : 400).json(fail(message)); }
});
app.get('/api/units', (_req, res) => res.json(ok(listUnits())));
app.get('/api/suppliers/summary', (_req, res) => res.json(ok(supplierSummary())));
app.get('/api/suppliers', (req, res) => res.json(ok(listSuppliers(String(req.query.search || ''), String(req.query.status || 'ALL').toUpperCase()))));
app.get('/api/suppliers/:id/purchases', (req, res) => res.json(ok(listPurchases({ supplierId: req.params.id }))));
app.get('/api/suppliers/:id', (req, res) => {
  const supplier = getSupplier(Number(req.params.id));
  if (!supplier) return res.status(404).json(fail('Supplier not found.'));
  return res.json(ok(supplier));
});
app.post('/api/suppliers', (req, res) => {
  if (!canManagePurchases(req)) return res.status(403).json(fail('You do not have permission to manage suppliers.'));
  try { return res.status(201).json(ok(createSupplier(req.body || {}))); }
  catch (error) { return res.status(400).json(fail(supplierMessage(error))); }
});
app.put('/api/suppliers/:id', (req, res) => {
  if (!canManagePurchases(req)) return res.status(403).json(fail('You do not have permission to manage suppliers.'));
  try {
    const supplier = updateSupplier(Number(req.params.id), req.body || {});
    if (!supplier) return res.status(404).json(fail('Supplier not found.'));
    return res.json(ok(supplier));
  } catch (error) { return res.status(400).json(fail(supplierMessage(error))); }
});
app.patch('/api/suppliers/:id/status', (req, res) => {
  if (!canManagePurchases(req)) return res.status(403).json(fail('You do not have permission to manage suppliers.'));
  try {
    const supplier = setSupplierStatus(Number(req.params.id), String(req.body.status || '').toUpperCase());
    if (!supplier) return res.status(404).json(fail('Supplier not found.'));
    return res.json(ok(supplier));
  } catch (error) { return res.status(400).json(fail(supplierMessage(error))); }
});

app.get('/api/purchase-products/lookup/:value', (req, res) => {
  const product = lookupPurchaseProduct(req.params.value);
  if (!product) return res.status(404).json(fail('Product not found.'));
  return res.json(ok(product));
});
app.get('/api/purchase-products/search', (req, res) => res.json(ok(searchPurchaseProducts(String(req.query.q || '')))));
app.get('/api/purchases/summary', (_req, res) => res.json(ok(purchaseSummary())));
app.get('/api/purchases', (req, res) => res.json(ok(listPurchases(req.query as Record<string, string>))));
app.post('/api/purchases', (req, res) => {
  if (!canManagePurchases(req)) return res.status(403).json(fail('You do not have permission to manage purchases.'));
  try { return res.status(201).json(ok(createPurchase(req.body || {}))); }
  catch (error) { return res.status(400).json(fail(purchaseMessage(error))); }
});
app.get('/api/purchases/:id/payments', (req, res) => {
  try { return res.json(ok(listPurchasePayments(Number(req.params.id)))); }
  catch (error) { return res.status(404).json(fail(purchaseMessage(error))); }
});
app.get('/api/purchases/:id', (req, res) => {
  const purchase = getPurchase(Number(req.params.id));
  if (!purchase) return res.status(404).json(fail('Purchase not found.'));
  return res.json(ok(purchase));
});
app.put('/api/purchases/:id', (req, res) => {
  if (!canManagePurchases(req)) return res.status(403).json(fail('You do not have permission to manage purchases.'));
  try { return res.json(ok(updateDraftPurchase(Number(req.params.id), req.body || {}))); }
  catch (error) { return res.status(400).json(fail(purchaseMessage(error))); }
});
app.post('/api/purchases/:id/receive', (req, res) => {
  if (!canManagePurchases(req)) return res.status(403).json(fail('You do not have permission to receive purchases.'));
  try { return res.json(ok(receivePurchase(Number(req.params.id), inventoryRole(req) || 'SYSTEM'))); }
  catch (error) { return res.status(400).json(fail(purchaseMessage(error))); }
});
app.post('/api/purchases/:id/payments', (req, res) => {
  if (!canManagePurchases(req)) return res.status(403).json(fail('You do not have permission to record supplier payments.'));
  try { return res.status(201).json(ok(addPurchasePayment(Number(req.params.id), req.body || {}))); }
  catch (error) { return res.status(400).json(fail(purchaseMessage(error))); }
});
app.post('/api/purchases/:id/cancel', (req, res) => {
  if (!canManagePurchases(req)) return res.status(403).json(fail('You do not have permission to cancel purchases.'));
  try { return res.json(ok(cancelPurchase(Number(req.params.id)))); }
  catch (error) { return res.status(400).json(fail(purchaseMessage(error))); }
});

app.get('/api/expenses/categories', (_req, res) => res.json(ok(listExpenseCategories())));
app.post('/api/expenses/categories', (req, res) => {
  if (!['OWNER', 'ADMIN'].includes(inventoryRole(req))) return res.status(403).json(fail('You do not have permission to manage expense categories.'));
  try { return res.status(201).json(ok(createExpenseCategory(String(req.body.name || '')))); }
  catch (error) { return res.status(400).json(fail(expenseMessage(error))); }
});
app.get('/api/expenses/summary', (_req, res) => res.json(ok(expenseSummary())));
app.get('/api/expenses', (req, res) => res.json(ok(listExpenses(req.query as Record<string, string>))));
app.get('/api/expenses/:id', (req, res) => {
  const expense = getExpense(Number(req.params.id));
  if (!expense) return res.status(404).json(fail('Expense not found.'));
  return res.json(ok(expense));
});
app.post('/api/expenses', (req, res) => {
  if (!['OWNER', 'ADMIN'].includes(inventoryRole(req))) return res.status(403).json(fail('You do not have permission to manage expenses.'));
  try { return res.status(201).json(ok(createExpense(req.body || {}, String(req.header('x-user-name') || inventoryRole(req))))); }
  catch (error) { return res.status(400).json(fail(expenseMessage(error))); }
});
app.put('/api/expenses/:id', (req, res) => {
  if (!['OWNER', 'ADMIN'].includes(inventoryRole(req))) return res.status(403).json(fail('You do not have permission to manage expenses.'));
  try {
    const expense = updateExpense(Number(req.params.id), req.body || {});
    if (!expense) return res.status(404).json(fail('Expense not found.'));
    return res.json(ok(expense));
  } catch (error) { return res.status(400).json(fail(expenseMessage(error))); }
});
app.delete('/api/expenses/:id', (req, res) => {
  if (!['OWNER', 'ADMIN'].includes(inventoryRole(req))) return res.status(403).json(fail('You do not have permission to delete expenses.'));
  if (!deleteExpense(Number(req.params.id))) return res.status(404).json(fail('Expense not found.'));
  return res.json(ok({ deleted: true }));
});

app.get('/api/held-bills', (_req, res) => res.json(ok(listHeldBills())));
app.post('/api/held-bills', (req, res) => {
  try {
    return res.status(201).json(ok(createHeldBill({
      ...req.body,
      cashierId: req.body.cashierId || req.header('x-user-id') || inventoryRole(req) || 'CASHIER',
      cashierName: req.body.cashierName || req.header('x-user-name') || inventoryRole(req) || 'Cashier',
    })));
  } catch (error) { return res.status(400).json(fail(heldBillMessage(error))); }
});
app.get('/api/held-bills/:id', (req, res) => {
  const heldBill = getHeldBill(Number(req.params.id));
  if (!heldBill) return res.status(404).json(fail('Held bill not found.'));
  return res.json(ok(heldBill));
});
app.delete('/api/held-bills/:id', (req, res) => {
  if (!deleteHeldBill(Number(req.params.id))) return res.status(404).json(fail('Held bill not found.'));
  return res.json(ok({ deleted: true }));
});

app.get('/api/settings', (_req, res) => res.json(ok(getStoreSettings())));
app.put('/api/settings', (req, res) => {
  if (inventoryRole(req) !== 'OWNER') return res.status(403).json(fail('Only the owner can update store settings.'));
  try { return res.json(ok(updateStoreSettings(req.body || {}))); }
  catch (error) { return res.status(400).json(fail(settingsMessage(error))); }
});
app.get('/api/profile', (req, res) => {
  try {
    return res.json(ok(getProfile({
      userId: String(req.header('x-user-id') || ''),
      name: String(req.header('x-user-name') || ''),
      email: String(req.header('x-user-email') || ''),
      role: inventoryRole(req),
    })));
  } catch (error) { return res.status(400).json(fail(profileMessage(error))); }
});
app.put('/api/profile', (req, res) => {
  try {
    return res.json(ok(updateProfile({
      userId: String(req.header('x-user-id') || ''),
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      avatarUrl: req.body.avatarUrl,
      role: inventoryRole(req),
    })));
  } catch (error) { return res.status(400).json(fail(profileMessage(error))); }
});

app.get('/api/reports/summary', (req, res) => res.json(ok(reportSummary(req.query as Record<string, string>))));
app.get('/api/reports/sales', (req, res) => res.json(ok(salesReport(req.query as Record<string, string>))));
app.get('/api/reports/products', (req, res) => res.json(ok(productSalesReport(req.query as Record<string, string>))));
app.get('/api/reports/top-categories', (req, res) => res.json(ok(topCategories(req.query as Record<string, string>))));
app.get('/api/reports/purchases', (req, res) => res.json(ok(purchaseReport(req.query as Record<string, string>))));
app.get('/api/reports/expenses', (req, res) => res.json(ok(expensesReport(req.query as Record<string, string>))));
app.get('/api/reports/gst', (req, res) => res.json(ok(gstReport(req.query as Record<string, string>))));
app.get('/api/reports/profit', (req, res) => {
  const result = reportSummary(req.query as Record<string, string>);
  return res.json(ok({ salesRevenue: result.totalSales, costOfGoodsSold: result.costOfGoodsSold, grossProfit: result.grossProfit, expenses: result.totalExpenses, netProfit: result.netProfit, unknownCostItems: result.unknownCostItems }));
});
app.get('/api/dashboard/summary', (_req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const reports = reportSummary({ from: today, to: today });
  const inventory = summary();
  const expenses = expenseSummary() as { today_total: number };
  return res.json(ok({ todaySales: reports.totalSales, todayBills: reports.totalBills, currentStock: inventory.totalStockUnits, lowStockItems: inventory.lowStock, todayExpenses: expenses.today_total, todayProfit: reports.netProfit }));
});
app.get('/api/dashboard/recent-bills', (_req, res) => res.json(ok(dashboardRecentBills())));

app.get('/api/products/lookup/:value', (req, res) => {
  const value = req.params.value.trim();
  const found = db.prepare(`SELECT p.id, p.product_code AS productCode, p.name_english AS nameEnglish, p.name_tamil AS nameTamil, p.sku, b.name AS brand, c.name AS category, p.mrp, p.selling_price AS sellingPrice
    FROM product_identifiers pi
    JOIN products p ON p.id = pi.product_id
    LEFT JOIN brands b ON b.id = p.brand_id
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE pi.identifier_value = ?`).get(value) as { id: number; productCode: string; nameEnglish: string; nameTamil: string; sku: string; brand?: string; category?: string; mrp: number; sellingPrice: number } | undefined;
  if (!found) return res.json({ exists: false });
  return res.json({ exists: true, product: found });
});

app.get('/api/identifiers/:value', (req, res) => res.redirect(`/api/products/lookup/${encodeURIComponent(req.params.value)}`));

app.get('/api/pos/products/lookup/:value', (req, res) => { const product = lookupBillingProduct(req.params.value); if (!product) return res.status(404).json(fail('Product not found.')); return res.json(ok(product)); });
app.get('/api/pos/products/search', (req, res) => res.json(ok(searchProducts(String(req.query.q || '')))));
app.post('/api/bills', (req, res) => { try { return res.status(201).json(ok(finalize({ ...req.body, cashierId: inventoryRole(req) || 'CASHIER' }))); } catch (error) { return res.status(400).json(fail(billingMessage(error))); } });
app.get('/api/bills', (req, res) => res.json(ok(listBills(String(req.query.search || '')))));
app.get('/api/bills/:id', (req, res) => { const bill = getBill(Number(req.params.id)); if (!bill) return res.status(404).json(fail('Bill not found.')); return res.json(ok(bill)); });

app.get('/api/inventory/summary', (_req, res) => res.json(ok(summary())));
app.get('/api/inventory', (req, res) => res.json(ok(listInventory(req.query as Record<string, string>))));
app.get('/api/inventory/products', (req, res) => res.json(ok(listInventory(req.query as Record<string, string>))));
app.get('/api/inventory/movements', (req, res) => res.json(ok(movements(Number(req.query.limit) || 50))));
app.get('/api/inventory/products/:id/batches', (req, res) => { try { return res.json(ok(batches(Number(req.params.id)))); } catch { return res.status(404).json(fail('Product not found.')); } });
app.post('/api/inventory/stock-in', (req, res) => { if (!canManageInventory(req)) return res.status(403).json(fail('Unauthorized inventory action.')); try { return res.status(201).json(ok(stockIn({ ...req.body, createdBy: inventoryRole(req) }))); } catch (error) { return res.status(400).json(fail(inventoryMessage(error))); } });
app.post('/api/inventory/stock-out', (req, res) => { if (!canManageInventory(req)) return res.status(403).json(fail('Unauthorized inventory action.')); try { return res.status(201).json(ok(stockOut({ ...req.body, createdBy: inventoryRole(req) }))); } catch (error) { return res.status(400).json(fail(inventoryMessage(error))); } });
app.post('/api/inventory/adjust', (req, res) => { if (!canManageInventory(req)) return res.status(403).json(fail('Unauthorized inventory action.')); try { return res.status(201).json(ok(adjustStock({ ...req.body, createdBy: inventoryRole(req) }))); } catch (error) { return res.status(400).json(fail(inventoryMessage(error))); } });
app.patch('/api/inventory/products/:id/minimum', (req, res) => { if (!canManageInventory(req)) return res.status(403).json(fail('Unauthorized inventory action.')); try { return res.json(ok(updateMinimum(Number(req.params.id), Number(req.body.minimumQuantity)))); } catch (error) { return res.status(400).json(fail(inventoryMessage(error))); } });

function expenseMessage(error: unknown) {
  const code = String(error);
  if (code.includes('INVALID_EXPENSE_DATE')) return 'Enter a valid expense date.';
  if (code.includes('INVALID_EXPENSE_CATEGORY')) return 'Select an active expense category.';
  if (code.includes('INVALID_EXPENSE_CATEGORY_NAME')) return 'Expense category name is required.';
  if (code.includes('INVALID_EXPENSE_DESCRIPTION')) return 'Expense description is required.';
  if (code.includes('INVALID_EXPENSE_AMOUNT')) return 'Expense amount must be greater than zero.';
  if (code.includes('INVALID_EXPENSE_PAYMENT_METHOD')) return 'Select a valid payment method.';
  if (code.includes('INVALID_EXPENSE_STATUS')) return 'Select a valid expense status.';
  return 'Unable to save expense.';
}

function heldBillMessage(error: unknown) {
  const code = String(error);
  if (code.includes('EMPTY_CART')) return 'Add at least one product before holding the bill.';
  if (code.includes('INVALID_QUANTITY')) return 'Held bill quantities must be greater than zero.';
  return 'Unable to save held bill.';
}

function settingsMessage(error: unknown) {
  const code = String(error);
  if (code.includes('STORE_NAME_REQUIRED')) return 'Store name is required.';
  if (code.includes('INVALID_RECEIPT_SIZE')) return 'Choose 58mm, 80mm, or A4 receipt paper.';
  if (code.includes('INVALID_RECEIPT_COPIES')) return 'Receipt copies must be between one and three.';
  if (code.includes('INVALID_TAX_SETTING')) return 'Tax settings must be between zero and one hundred.';
  return 'Unable to save store settings.';
}

function profileMessage(error: unknown) {
  const code = String(error);
  if (code.includes('PROFILE_USER_REQUIRED')) return 'Current user profile is unavailable.';
  if (code.includes('PROFILE_NAME_REQUIRED')) return 'Profile name is required.';
  if (code.includes('INVALID_EMAIL')) return 'Enter a valid email address.';
  return 'Unable to save profile.';
}

function supplierMessage(error: unknown) {
  const code = String(error);
  if (code.includes('INVALID_PHONE')) return 'Enter a valid 10-digit Indian mobile number.';
  if (code.includes('INVALID_EMAIL')) return 'Enter a valid email address.';
  if (code.includes('INVALID_GSTIN')) return 'Enter a valid GSTIN.';
  if (code.includes('INVALID_NAME')) return 'Supplier name is required.';
  if (code.includes('DUPLICATE_PHONE')) return 'A supplier with this phone number already exists.';
  if (code.includes('DUPLICATE_GSTIN')) return 'A supplier with this GSTIN already exists.';
  if (code.includes('INVALID_STATUS')) return 'Supplier status must be Active or Inactive.';
  return 'Unable to save supplier.';
}

function purchaseMessage(error: unknown) {
  const code = String(error);
  if (code.includes('SUPPLIER_REQUIRED')) return 'Select a supplier.';
  if (code.includes('SUPPLIER_NOT_FOUND')) return 'Supplier not found.';
  if (code.includes('SUPPLIER_INACTIVE')) return 'Inactive suppliers cannot be used for new purchases.';
  if (code.includes('PURCHASE_NOT_FOUND')) return 'Purchase not found.';
  if (code.includes('PURCHASE_NOT_DRAFT')) return 'Only draft purchases can be edited, received, or cancelled.';
  if (code.includes('PURCHASE_CANCELLED')) return 'Cancelled purchases cannot receive payments.';
  if (code.includes('EMPTY_PURCHASE')) return 'Add at least one product to the purchase.';
  if (code.includes('PRODUCT_NOT_FOUND')) return 'An active product could not be found.';
  if (code.includes('INVALID_QUANTITY')) return 'Purchase quantities must be greater than zero.';
  if (code.includes('INVALID_PURCHASE_COST')) return 'Purchase costs must be zero or greater.';
  if (code.includes('INVALID_PURCHASE_TOTAL')) return 'Check the discount, other charges, and round off.';
  if (code.includes('INVALID_DATE')) return 'Enter a valid purchase, invoice, manufacturing, or expiry date.';
  if (code.includes('INVALID_PRICE')) return 'Purchase cost must be zero or greater.';
  if (code.includes('INVALID_PAYMENT_METHOD')) return 'Select a valid payment method.';
  if (code.includes('PAYMENT_EXCEEDS_BALANCE')) return 'Payment cannot be greater than the outstanding balance.';
  if (code.includes('INVALID_PAYMENT')) return 'Payment amount must be greater than zero.';
  if (code.includes('INSUFFICIENT_STOCK')) return 'Insufficient stock.';
  return 'Unable to process purchase.';
}

function inventoryMessage(error: unknown) {
  const code = String(error);
  if (code.includes('PRODUCT_NOT_FOUND')) return 'Product not found.';
  if (code.includes('PRODUCT_INACTIVE')) return 'Product is inactive.';
  if (code.includes('INSUFFICIENT_STOCK')) return 'Insufficient stock.';
  if (code.includes('INVALID_QUANTITY')) return 'Quantity must be greater than zero.';
  if (code.includes('INVALID_PRICE')) return 'Purchase price must be zero or greater.';
  if (code.includes('INVALID_DATE')) return 'Invalid expiry or manufacturing date.';
  return 'Unable to update inventory.';
}

function billingMessage(error: unknown) {
  const code = String(error);
  if (code.includes('EMPTY_CART')) return 'Add at least one product to the bill.';
  if (code.includes('PRODUCT_NOT_FOUND')) return 'Product not found.';
  if (code.includes('INSUFFICIENT_STOCK')) return 'Insufficient stock.';
  if (code.includes('INVALID_QUANTITY')) return 'Quantity must be greater than zero.';
  if (code.includes('INVALID_DISCOUNT')) return 'Invalid discount.';
  if (code.includes('INVALID_CUSTOMER')) return 'Customer details are invalid.';
  return 'Unable to finalize bill.';
}

app.use((_error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => res.status(500).json(fail('Internal server error.')));
