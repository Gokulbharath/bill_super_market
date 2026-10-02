import { db } from '../database/db.js';
import { listPurchases } from './purchaseRepository.js';
import { listExpenses } from './expenseRepository.js';

type DateRange = { from?: string; to?: string };

function rangeValues(range: DateRange) {
  return [range.from || '1900-01-01', range.to || '2999-12-31'];
}

export function reportSummary(range: DateRange) {
  const [from, to] = rangeValues(range);
  const sales = db.prepare(`
    SELECT COALESCE(SUM(grand_total), 0) AS total_sales,
      COUNT(*) AS total_bills,
      COALESCE((SELECT SUM(bi.quantity) FROM bill_items bi JOIN bills b ON b.id = bi.bill_id WHERE b.status = 'COMPLETED' AND date(b.bill_date) BETWEEN date(?) AND date(?)), 0) AS total_items,
      COALESCE((SELECT SUM(bi.tax_amount) FROM bill_items bi JOIN bills b ON b.id = bi.bill_id WHERE b.status = 'COMPLETED' AND date(b.bill_date) BETWEEN date(?) AND date(?)), 0) AS gst_collected,
      COALESCE((SELECT SUM(bi.line_total - COALESCE(bi.discount_amount, 0) - bi.tax_amount) FROM bill_items bi JOIN bills b ON b.id = bi.bill_id WHERE b.status = 'COMPLETED' AND date(b.bill_date) BETWEEN date(?) AND date(?)), 0) AS taxable_sales,
      (SELECT COUNT(*) FROM bill_items bi JOIN bills b ON b.id = bi.bill_id WHERE b.status = 'COMPLETED' AND date(b.bill_date) BETWEEN date(?) AND date(?) AND bi.cost_price_snapshot IS NULL) AS unknown_cost_items,
      COALESCE((SELECT SUM(bi.quantity * bi.cost_price_snapshot) FROM bill_items bi JOIN bills b ON b.id = bi.bill_id WHERE b.status = 'COMPLETED' AND date(b.bill_date) BETWEEN date(?) AND date(?) AND bi.cost_price_snapshot IS NOT NULL), 0) AS known_cost
    FROM bills WHERE status = 'COMPLETED' AND date(bill_date) BETWEEN date(?) AND date(?)
  `).get(from, to, from, to, from, to, from, to, from, to, from, to) as Record<string, number>;
  const purchase = db.prepare("SELECT COALESCE(SUM(grand_total), 0) AS total FROM purchases WHERE status = 'RECEIVED' AND date(purchase_date) BETWEEN date(?) AND date(?)").get(from, to) as { total: number };
  const expense = db.prepare("SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE status <> 'PENDING' AND date(expense_date) BETWEEN date(?) AND date(?)").get(from, to) as { total: number };
  const costsComplete = sales.unknown_cost_items === 0;
  const grossProfit = costsComplete ? Number(sales.taxable_sales) - Number(sales.known_cost) : null;
  return {
    totalSales: Number(sales.total_sales),
    totalBills: Number(sales.total_bills),
    totalItemsSold: Number(sales.total_items),
    totalPurchaseCost: Number(purchase.total),
    totalExpenses: Number(expense.total),
    grossProfit,
    netProfit: grossProfit === null ? null : grossProfit - Number(expense.total),
    gstCollected: Number(sales.gst_collected),
    unknownCostItems: Number(sales.unknown_cost_items),
    costOfGoodsSold: costsComplete ? Number(sales.known_cost) : null,
  };
}

export function salesReport(range: DateRange & { search?: string; paymentMethod?: string }) {
  const [from, to] = rangeValues(range);
  const terms = ["b.status = 'COMPLETED'", 'date(b.bill_date) BETWEEN date(?) AND date(?)'];
  const values: Array<string | number> = [from, to];
  if (range.search?.trim()) {
    const term = `%${range.search.trim()}%`;
    terms.push('(b.bill_number LIKE ? OR b.customer_name_snapshot LIKE ? OR b.customer_phone_snapshot LIKE ?)');
    values.push(term, term, term);
  }
  if (range.paymentMethod && range.paymentMethod !== 'ALL') { terms.push('b.payment_method = ?'); values.push(range.paymentMethod); }
  return db.prepare(`
    SELECT b.*, COALESCE(b.customer_name_snapshot, c.name, 'Walk-in Customer') AS customer_name,
      COALESCE(b.customer_phone_snapshot, c.phone, '') AS customer_phone,
      (SELECT COUNT(*) FROM bill_items bi WHERE bi.bill_id = b.id) AS item_count,
      (SELECT COALESCE(SUM(bi.quantity), 0) FROM bill_items bi WHERE bi.bill_id = b.id) AS quantity_count
    FROM bills b LEFT JOIN customers c ON c.id = b.customer_id
    WHERE ${terms.join(' AND ')} ORDER BY b.created_at DESC LIMIT 2000
  `).all(...values);
}

export function productSalesReport(range: DateRange & { search?: string; categoryId?: string; brandId?: string }) {
  const [from, to] = rangeValues(range);
  const terms = ["b.status = 'COMPLETED'", 'date(b.bill_date) BETWEEN date(?) AND date(?)'];
  const values: Array<string | number> = [from, to];
  if (range.search?.trim()) {
    const term = `%${range.search.trim()}%`;
    terms.push('(bi.product_name_snapshot LIKE ? OR bi.product_tamil_name_snapshot LIKE ? OR p.sku LIKE ? OR bi.barcode_snapshot LIKE ?)');
    values.push(term, term, term, term);
  }
  if (range.categoryId) { terms.push('p.category_id = ?'); values.push(Number(range.categoryId)); }
  if (range.brandId) { terms.push('p.brand_id = ?'); values.push(Number(range.brandId)); }
  const rows = db.prepare(`
    SELECT bi.product_id AS product_id, bi.product_name_snapshot AS product_name,
      bi.product_tamil_name_snapshot AS product_tamil_name, p.sku, bi.barcode_snapshot AS barcode,
      c.name AS category_name, br.name AS brand_name,
      SUM(bi.quantity) AS quantity_sold,
      SUM(bi.line_total - COALESCE(bi.discount_amount, 0)) AS selling_amount,
      SUM(bi.tax_amount) AS gst_amount,
      SUM(CASE WHEN bi.cost_price_snapshot IS NULL THEN 1 ELSE 0 END) AS unknown_cost_lines,
      SUM(CASE WHEN bi.cost_price_snapshot IS NOT NULL THEN bi.quantity * bi.cost_price_snapshot ELSE 0 END) AS known_cost
    FROM bill_items bi JOIN bills b ON b.id = bi.bill_id
    LEFT JOIN products p ON p.id = bi.product_id
    LEFT JOIN categories c ON c.id = p.category_id
    LEFT JOIN brands br ON br.id = p.brand_id
    WHERE ${terms.join(' AND ')}
    GROUP BY bi.product_id, bi.product_name_snapshot, bi.product_tamil_name_snapshot, p.sku, bi.barcode_snapshot, c.name, br.name
    ORDER BY quantity_sold DESC, selling_amount DESC LIMIT 2000
  `).all(...values) as Array<Record<string, number | string | null>>;
  return rows.map((row) => {
    const netSales = Number(row.selling_amount || 0) - Number(row.gst_amount || 0);
    const complete = Number(row.unknown_cost_lines || 0) === 0;
    const cost = complete ? Number(row.known_cost || 0) : null;
    const profit = cost === null ? null : netSales - cost;
    return { ...row, purchase_cost: cost, profit, profit_percent: profit === null || netSales === 0 ? null : profit / netSales * 100 };
  });
}

export function topCategories(range: DateRange) {
  const [from, to] = rangeValues(range);
  return db.prepare(`
    SELECT COALESCE(c.name, 'Uncategorized') AS category_name, SUM(bi.quantity) AS quantity_sold,
      SUM(bi.line_total - COALESCE(bi.discount_amount, 0)) AS sales_amount,
      SUM(bi.tax_amount) AS gst_amount,
      SUM(CASE WHEN bi.cost_price_snapshot IS NULL THEN 1 ELSE 0 END) AS unknown_cost_lines,
      SUM(CASE WHEN bi.cost_price_snapshot IS NOT NULL THEN bi.quantity * bi.cost_price_snapshot ELSE 0 END) AS known_cost
    FROM bill_items bi JOIN bills b ON b.id = bi.bill_id
    LEFT JOIN products p ON p.id = bi.product_id LEFT JOIN categories c ON c.id = p.category_id
    WHERE b.status = 'COMPLETED' AND date(b.bill_date) BETWEEN date(?) AND date(?)
    GROUP BY c.id, c.name ORDER BY quantity_sold DESC, sales_amount DESC LIMIT 50
  `).all(from, to);
}

export function gstReport(range: DateRange) {
  const [from, to] = rangeValues(range);
  const rows = db.prepare(`
    SELECT bi.gst_percent AS gst_rate,
      SUM(bi.line_total - COALESCE(bi.discount_amount, 0) - bi.tax_amount) AS taxable_sales,
      SUM(bi.tax_amount) AS total_gst, COUNT(DISTINCT b.id) AS bill_count
    FROM bill_items bi JOIN bills b ON b.id = bi.bill_id
    WHERE b.status = 'COMPLETED' AND date(b.bill_date) BETWEEN date(?) AND date(?)
    GROUP BY bi.gst_percent ORDER BY bi.gst_percent
  `).all(from, to) as Array<{ gst_rate: number; taxable_sales: number; total_gst: number; bill_count: number }>;
  const taxableSales = rows.reduce((sum, row) => sum + Number(row.taxable_sales || 0), 0);
  const totalGst = rows.reduce((sum, row) => sum + Number(row.total_gst || 0), 0);
  return { taxableSales, cgst: totalGst / 2, sgst: totalGst - totalGst / 2, totalGst, grandTotal: taxableSales + totalGst, products: rows };
}

export function purchaseReport(range: DateRange & { supplierId?: string; status?: string }) {
  return listPurchases({ ...range, supplierId: range.supplierId });
}

export function expensesReport(range: DateRange & { categoryId?: string }) {
  return listExpenses({ dateFrom: range.from, dateTo: range.to, categoryId: range.categoryId });
}

export function dashboardRecentBills(limit = 6) {
  return db.prepare(`
    SELECT b.*, COALESCE(b.customer_name_snapshot, c.name, 'Walk-in Customer') AS customer_name,
      (SELECT COALESCE(SUM(quantity), 0) FROM bill_items WHERE bill_id = b.id) AS item_count
    FROM bills b LEFT JOIN customers c ON c.id = b.customer_id
    WHERE b.status = 'COMPLETED' ORDER BY b.created_at DESC LIMIT ?
  `).all(limit);
}