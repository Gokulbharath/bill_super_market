import { useEffect, useMemo, useState } from 'react';
import { Download, Eye, Printer, Search } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { adminService, type ExpenseRecord, type ReportSummary } from '@/services/adminService';
import { supplierPurchaseService, type SupplierRecord } from '@/services/supplierPurchaseService';
import { productService, type BillRecord } from '@/services/productService';
import { InvoicePreviewDialog } from '@/features/pos/InvoicePreviewDialog';
import { formatCurrency, formatDate } from '@/utils/format';

type ReportTab = 'OVERVIEW' | 'SALES' | 'PRODUCTS' | 'GST' | 'PURCHASES' | 'EXPENSES' | 'PROFIT';
type GenericRow = Record<string, unknown>;

const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => `${today().slice(0, 7)}-01`;
const number = (row: GenericRow, key: string) => Number(row[key] || 0);
const text = (row: GenericRow, key: string) => String(row[key] || '');

function rangeFor(period: string) {
  const current = new Date();
  const date = (value: Date) => value.toISOString().slice(0, 10);
  if (period === 'TODAY') return { from: date(current), to: date(current) };
  if (period === 'YESTERDAY') { const yesterday = new Date(current); yesterday.setDate(yesterday.getDate() - 1); return { from: date(yesterday), to: date(yesterday) }; }
  if (period === 'THIS_WEEK') { const start = new Date(current); start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); return { from: date(start), to: date(current) }; }
  if (period === 'LAST_MONTH') { const start = new Date(current.getFullYear(), current.getMonth() - 1, 1); const end = new Date(current.getFullYear(), current.getMonth(), 0); return { from: date(start), to: date(end) }; }
  return { from: monthStart(), to: date(current) };
}

function downloadCsv(filename: string, rows: GenericRow[]) {
  if (!rows.length) return;
  const columns = Object.keys(rows[0]);
  const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const csv = [columns.map(escape).join(','), ...rows.map((row) => columns.map((column) => escape(row[column])).join(','))].join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ReportsPage() {
  const { toast } = useToast();
  const initialRange = rangeFor('THIS_MONTH');
  const [period, setPeriod] = useState('THIS_MONTH');
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [appliedRange, setAppliedRange] = useState(initialRange);
  const [tab, setTab] = useState<ReportTab>('OVERVIEW');
  const [search, setSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('ALL');
  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [purchaseStatus, setPurchaseStatus] = useState('ALL');
  const [expenseCategoryId, setExpenseCategoryId] = useState('');
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [sales, setSales] = useState<GenericRow[]>([]);
  const [products, setProducts] = useState<GenericRow[]>([]);
  const [purchases, setPurchases] = useState<GenericRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [gst, setGst] = useState<{ taxableSales: number; cgst: number; sgst: number; totalGst: number; grandTotal: number; products: GenericRow[] } | null>(null);
  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([]);
  const [brands, setBrands] = useState<Array<{ id: number; name: string }>>([]);
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBill, setSelectedBill] = useState<BillRecord | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const common = { from: appliedRange.from, to: appliedRange.to };
      const [summaryResult, salesResult, productsResult, purchasesResult, expensesResult, gstResult, categoryRows, brandRows, supplierRows] = await Promise.all([
        adminService.reportSummary(common),
        adminService.salesReport({ ...common, search, paymentMethod }),
        adminService.productReport({ ...common, search, categoryId, brandId }),
        adminService.purchaseReport({ ...common, supplierId, status: purchaseStatus }),
        adminService.expenseReport({ ...common, categoryId: expenseCategoryId }),
        adminService.gstReport(common),
        productService.lookup('categories'),
        productService.lookup('brands'),
        supplierPurchaseService.suppliers('', 'ALL'),
      ]);
      setSummary(summaryResult);
      setSales(salesResult);
      setProducts(productsResult);
      setPurchases(purchasesResult);
      setExpenses(expensesResult);
      setGst(gstResult);
      setCategories(categoryRows);
      setBrands(brandRows);
      setSuppliers(supplierRows);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Unable to load reports.';
      setError(message);
      toast({ title: message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 180);
    return () => window.clearTimeout(timer);
  }, [appliedRange.from, appliedRange.to, search, paymentMethod, categoryId, brandId, supplierId, purchaseStatus, expenseCategoryId]);

  const categoryTotals = useMemo(() => {
    const grouped = new Map<string, { category_name: string; quantity_sold: number; sales_amount: number; profit: number | null; unknown_cost_lines: number }>();
    products.forEach((row) => {
      const categoryName = text(row, 'category_name') || 'Uncategorized';
      const current = grouped.get(categoryName) || { category_name: categoryName, quantity_sold: 0, sales_amount: 0, profit: 0, unknown_cost_lines: 0 };
      current.quantity_sold += number(row, 'quantity_sold');
      current.sales_amount += number(row, 'selling_amount');
      if (row.profit === null) { current.profit = null; current.unknown_cost_lines += number(row, 'unknown_cost_lines'); }
      else if (current.profit !== null) current.profit += number(row, 'profit');
      grouped.set(categoryName, current);
    });
    return [...grouped.values()].sort((left, right) => right.quantity_sold - left.quantity_sold);
  }, [products]);

  const expenseRows = useMemo<GenericRow[]>(() => expenses.map((expense) => ({
    expense_number: expense.expense_number,
    expense_date: expense.expense_date,
    category_name_snapshot: expense.category_name_snapshot,
    description: expense.description,
    amount: expense.amount,
    payment_method: expense.payment_method,
    created_by: expense.created_by,
    status: expense.status,
  })), [expenses]);

  const applyPeriod = (nextPeriod: string) => {
    setPeriod(nextPeriod);
    if (nextPeriod !== 'CUSTOM') {
      const nextRange = rangeFor(nextPeriod);
      setFrom(nextRange.from);
      setTo(nextRange.to);
      setAppliedRange(nextRange);
    }
  };

  const openBill = async (id: number) => {
    try { setSelectedBill(await productService.bill(id)); }
    catch (reason) { toast({ title: reason instanceof Error ? reason.message : 'Unable to load bill.', variant: 'destructive' }); }
  };

  const activeRows = (): GenericRow[] => {
    if (tab === 'SALES') return sales;
    if (tab === 'PRODUCTS') return products;
    if (tab === 'PURCHASES') return purchases;
    if (tab === 'EXPENSES') return expenseRows;
    if (tab === 'GST') return gst?.products || [];
    if (tab === 'PROFIT') return [{ salesRevenue: summary?.totalSales, cogs: summary?.costOfGoodsSold, grossProfit: summary?.grossProfit, expenses: summary?.totalExpenses, netProfit: summary?.netProfit }];
    return sales;
  };

  return (
    <div className="report-print-root space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3"><PageHeader title="Reports" description="Sales, stock cost, GST, purchases, and expenses from SQLite." breadcrumbs={[{ label: 'Reports' }]} /><div className="flex gap-2"><Button variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Print Report</Button><Button variant="outline" onClick={() => downloadCsv(`sree-${tab.toLowerCase()}-${appliedRange.from}.csv`, activeRows())}><Download className="mr-2 h-4 w-4" />CSV Export</Button></div></div>
      <section className="rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-2"><Label htmlFor="report-period">Date range</Label><select id="report-period" className="h-9 rounded-md border bg-background px-3 text-sm" value={period} onChange={(event) => applyPeriod(event.target.value)}><option value="TODAY">Today</option><option value="YESTERDAY">Yesterday</option><option value="THIS_WEEK">This Week</option><option value="THIS_MONTH">This Month</option><option value="LAST_MONTH">Last Month</option><option value="CUSTOM">Custom Range</option></select></div>
          <div className="space-y-2"><Label htmlFor="report-from">From</Label><Input id="report-from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="report-to">To</Label><Input id="report-to" type="date" value={to} onChange={(event) => setTo(event.target.value)} /></div>
          <Button onClick={() => setAppliedRange({ from, to })}>Apply</Button><Button variant="outline" onClick={() => applyPeriod('THIS_MONTH')}>Reset</Button>
        </div>
      </section>

      {error && <div className="flex items-center justify-between rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm"><span className="text-destructive">{error}</span><Button variant="outline" size="sm" onClick={() => void load()}>Retry</Button></div>}
      {loading && <div className="rounded-md border bg-card px-4 py-6 text-sm text-muted-foreground">Loading reports...</div>}
      {!loading && !error && summary && <>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ['Total Sales', formatCurrency(summary.totalSales)], ['Total Bills', summary.totalBills], ['Total Items Sold', summary.totalItemsSold], ['Total Purchase Cost', formatCurrency(summary.totalPurchaseCost)],
            ['Total Expenses', formatCurrency(summary.totalExpenses)], ['Gross Profit', summary.grossProfit === null ? 'Unavailable' : formatCurrency(summary.grossProfit)], ['Net Profit', summary.netProfit === null ? 'Unavailable' : formatCurrency(summary.netProfit)], ['GST Collected', formatCurrency(summary.gstCollected)],
          ].map(([label, value]) => <div key={String(label)} className="rounded-lg border bg-card p-4"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></div>)}
        </div>
        {summary.unknownCostItems > 0 && <p className="text-xs text-amber-700">Profit excludes {summary.unknownCostItems} historical sale lines with no stored sale-time product cost.</p>}

        <div className="flex flex-wrap gap-1 border-b" role="tablist" aria-label="Report type">{(['OVERVIEW','SALES','PRODUCTS','GST','PURCHASES','EXPENSES','PROFIT'] as ReportTab[]).map((value) => <Button key={value} role="tab" aria-selected={tab === value} size="sm" variant={tab === value ? 'secondary' : 'ghost'} onClick={() => setTab(value)}>{value === 'OVERVIEW' ? 'Overview' : value[0] + value.slice(1).toLowerCase()}</Button>)}</div>

        <section className="space-y-4">
          <div className="flex flex-wrap items-end gap-2">
            {['SALES','PRODUCTS'].includes(tab) && <div className="relative min-w-[220px] flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder={tab === 'SALES' ? 'Search bill or customer' : 'Search product, SKU, barcode'} value={search} onChange={(event) => setSearch(event.target.value)} /></div>}
            {tab === 'SALES' && <select aria-label="Payment method filter" className="h-9 rounded-md border bg-background px-3 text-sm" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}><option value="ALL">All payment methods</option><option value="CASH">Cash</option><option value="UPI">UPI</option><option value="BANK">Bank</option><option value="CARD">Card</option></select>}
            {tab === 'PRODUCTS' && <><select aria-label="Product category filter" className="h-9 rounded-md border bg-background px-3 text-sm" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="">All categories</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select aria-label="Product brand filter" className="h-9 rounded-md border bg-background px-3 text-sm" value={brandId} onChange={(event) => setBrandId(event.target.value)}><option value="">All brands</option>{brands.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></>}
            {tab === 'PURCHASES' && <><select aria-label="Purchase supplier filter" className="h-9 rounded-md border bg-background px-3 text-sm" value={supplierId} onChange={(event) => setSupplierId(event.target.value)}><option value="">All suppliers</option>{suppliers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select aria-label="Purchase status report filter" className="h-9 rounded-md border bg-background px-3 text-sm" value={purchaseStatus} onChange={(event) => setPurchaseStatus(event.target.value)}><option value="ALL">All statuses</option><option value="DRAFT">Draft</option><option value="RECEIVED">Received</option><option value="CANCELLED">Cancelled</option></select></>}
            {tab === 'EXPENSES' && <select aria-label="Expense category report filter" className="h-9 rounded-md border bg-background px-3 text-sm" value={expenseCategoryId} onChange={(event) => setExpenseCategoryId(event.target.value)}><option value="">All expense categories</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}
          </div>

          {tab === 'OVERVIEW' && <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-lg border bg-card p-4"><h2 className="mb-3 font-semibold">Top Selling Products</h2>{products.slice(0,10).length ? <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="py-2">Product</th><th>Qty</th><th>Sales</th><th>Profit</th></tr></thead><tbody>{products.slice(0,10).map((row,index)=><tr className="border-b last:border-0" key={`${row.product_id}-${index}`}><td className="py-2">{text(row,'product_name')}</td><td>{number(row,'quantity_sold')}</td><td>{formatCurrency(number(row,'selling_amount'))}</td><td>{row.profit === null ? 'Unavailable' : formatCurrency(number(row,'profit'))}</td></tr>)}</tbody></table></div> : <p className="py-5 text-sm text-muted-foreground">No sales found for this period.</p>}</div>
            <div className="rounded-lg border bg-card p-4"><h2 className="mb-3 font-semibold">Top Categories</h2>{categoryTotals.length ? <div className="overflow-x-auto"><table className="w-full min-w-[460px] text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="py-2">Category</th><th>Qty</th><th>Sales</th><th>Profit</th></tr></thead><tbody>{categoryTotals.map((row)=><tr className="border-b last:border-0" key={row.category_name}><td className="py-2">{row.category_name}</td><td>{row.quantity_sold}</td><td>{formatCurrency(row.sales_amount)}</td><td>{row.profit === null ? 'Unavailable' : formatCurrency(row.profit)}</td></tr>)}</tbody></table></div> : <p className="py-5 text-sm text-muted-foreground">No category sales found.</p>}</div>
          </div>}

          {tab === 'SALES' && <div className="overflow-x-auto rounded-lg border bg-card"><table className="w-full min-w-[1450px] text-sm"><thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground"><tr>{['Bill No.','Date','Time','Customer','Items','Subtotal','Discount','Taxable Value','CGST','SGST','Round Off','Grand Total','Payment','Cashier','Status',''].map((heading)=><th key={heading} className="px-3 py-3">{heading}</th>)}</tr></thead><tbody>{sales.length ? sales.map((row)=><tr className="border-b last:border-0" key={String(row.id)}><td className="px-3 py-2 font-medium">{text(row,'bill_number')}</td><td className="px-3 py-2">{text(row,'bill_date')}</td><td className="px-3 py-2">{text(row,'created_at').slice(11,19)}</td><td className="px-3 py-2">{text(row,'customer_name')}</td><td className="px-3 py-2">{number(row,'quantity_count')}</td><td className="px-3 py-2">{formatCurrency(number(row,'subtotal'))}</td><td className="px-3 py-2">{formatCurrency(number(row,'discount'))}</td><td className="px-3 py-2">{formatCurrency(number(row,'taxable_amount'))}</td><td className="px-3 py-2">{formatCurrency(number(row,'cgst'))}</td><td className="px-3 py-2">{formatCurrency(number(row,'sgst'))}</td><td className="px-3 py-2">{formatCurrency(number(row,'round_off'))}</td><td className="px-3 py-2">{formatCurrency(number(row,'grand_total'))}</td><td className="px-3 py-2">{text(row,'payment_method')}</td><td className="px-3 py-2">{text(row,'cashier_name_snapshot') || text(row,'cashier_id')}</td><td className="px-3 py-2">{text(row,'status')}</td><td className="px-3 py-2"><Button size="sm" variant="outline" onClick={() => void openBill(Number(row.id))}><Eye className="mr-2 h-4 w-4"/>View / Print</Button></td></tr>) : <tr><td colSpan={16} className="px-3 py-8 text-center text-muted-foreground">No completed bills found for this period.</td></tr>}</tbody></table></div>}

          {tab === 'PRODUCTS' && <div className="overflow-x-auto rounded-lg border bg-card"><table className="w-full min-w-[1100px] text-sm"><thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground"><tr>{['Product','SKU','Barcode','Category','Quantity Sold','Purchase Cost','Selling Amount','GST','Profit','Profit %'].map((heading)=><th key={heading} className="px-3 py-3">{heading}</th>)}</tr></thead><tbody>{products.length ? products.map((row,index)=><tr className="border-b last:border-0" key={`${row.product_id}-${index}`}><td className="px-3 py-2">{text(row,'product_name')}<span className="block text-xs text-muted-foreground">{text(row,'product_tamil_name')}</span></td><td className="px-3 py-2">{text(row,'sku')}</td><td className="px-3 py-2">{text(row,'barcode')}</td><td className="px-3 py-2">{text(row,'category_name') || 'Uncategorized'}</td><td className="px-3 py-2">{number(row,'quantity_sold')}</td><td className="px-3 py-2">{row.purchase_cost === null ? 'Unavailable' : formatCurrency(number(row,'purchase_cost'))}</td><td className="px-3 py-2">{formatCurrency(number(row,'selling_amount'))}</td><td className="px-3 py-2">{formatCurrency(number(row,'gst_amount'))}</td><td className="px-3 py-2">{row.profit === null ? 'Unavailable' : formatCurrency(number(row,'profit'))}</td><td className="px-3 py-2">{row.profit_percent === null ? 'Unavailable' : `${number(row,'profit_percent').toFixed(1)}%`}</td></tr>) : <tr><td colSpan={10} className="px-3 py-8 text-center text-muted-foreground">No product sales found.</td></tr>}</tbody></table></div>}

          {tab === 'GST' && gst && <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{[['Taxable Sales',gst.taxableSales],['CGST',gst.cgst],['SGST',gst.sgst],['Total GST',gst.totalGst],['Grand Total',gst.grandTotal]].map(([label,value])=><div className="rounded-lg border bg-card p-4" key={String(label)}><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 font-semibold">{formatCurrency(Number(value))}</p></div>)}</div><div className="overflow-x-auto rounded-lg border bg-card"><table className="w-full text-sm"><thead className="border-b bg-muted/40 text-left"><tr><th className="px-4 py-3">GST Rate</th><th className="px-4 py-3">Taxable Sales</th><th className="px-4 py-3">Total GST</th><th className="px-4 py-3">Bills</th></tr></thead><tbody>{gst.products.length ? gst.products.map((row)=><tr className="border-b last:border-0" key={String(row.gst_rate)}><td className="px-4 py-3">{number(row,'gst_rate')}%</td><td className="px-4 py-3">{formatCurrency(number(row,'taxable_sales'))}</td><td className="px-4 py-3">{formatCurrency(number(row,'total_gst'))}</td><td className="px-4 py-3">{number(row,'bill_count')}</td></tr>) : <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No GST transactions found.</td></tr>}</tbody></table></div></div>}

          {tab === 'PURCHASES' && <div className="overflow-x-auto rounded-lg border bg-card"><table className="w-full min-w-[950px] text-sm"><thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground"><tr>{['Purchase No.','Date','Supplier','Supplier Invoice','Items','Purchase Total','Paid','Balance','Status'].map((heading)=><th key={heading} className="px-3 py-3">{heading}</th>)}</tr></thead><tbody>{purchases.length ? purchases.map((row)=><tr className="border-b last:border-0" key={String(row.id)}><td className="px-3 py-2">{text(row,'purchase_number')}</td><td className="px-3 py-2">{text(row,'purchase_date')}</td><td className="px-3 py-2">{text(row,'supplier_name')}</td><td className="px-3 py-2">{text(row,'supplier_invoice_number')}</td><td className="px-3 py-2">{number(row,'item_count')}</td><td className="px-3 py-2">{formatCurrency(number(row,'grand_total'))}</td><td className="px-3 py-2">{formatCurrency(number(row,'paid_amount'))}</td><td className="px-3 py-2">{formatCurrency(number(row,'balance'))}</td><td className="px-3 py-2">{text(row,'status')}</td></tr>) : <tr><td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">No purchases found.</td></tr>}</tbody></table></div>}

          {tab === 'EXPENSES' && <div className="overflow-x-auto rounded-lg border bg-card"><table className="w-full min-w-[720px] text-sm"><thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground"><tr>{['Expense Date','Category','Description','Amount','Payment Method','Created By'].map((heading)=><th key={heading} className="px-3 py-3">{heading}</th>)}</tr></thead><tbody>{expenseRows.length ? expenseRows.map((row)=><tr className="border-b last:border-0" key={String(row.expense_number)}><td className="px-3 py-2">{text(row,'expense_date')}</td><td className="px-3 py-2">{text(row,'category_name_snapshot')}</td><td className="px-3 py-2">{text(row,'description')}</td><td className="px-3 py-2">{formatCurrency(number(row,'amount'))}</td><td className="px-3 py-2">{text(row,'payment_method')}</td><td className="px-3 py-2">{text(row,'created_by')}</td></tr>) : <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">No expenses found.</td></tr>}</tbody></table></div>}

          {tab === 'PROFIT' && <div className="max-w-2xl rounded-lg border bg-card p-5"><h2 className="mb-4 font-semibold">Profit Summary</h2><div className="space-y-3 text-sm"><div className="flex justify-between"><span>Sales revenue</span><strong>{formatCurrency(summary.totalSales)}</strong></div><div className="flex justify-between"><span>Cost of goods sold</span><strong>{summary.costOfGoodsSold === null ? 'Unavailable' : `−${formatCurrency(summary.costOfGoodsSold)}`}</strong></div><div className="flex justify-between border-t pt-3"><span>Gross profit (pre-expense)</span><strong>{summary.grossProfit === null ? 'Unavailable' : formatCurrency(summary.grossProfit)}</strong></div><div className="flex justify-between"><span>Expenses</span><strong>−{formatCurrency(summary.totalExpenses)}</strong></div><div className="flex justify-between border-t pt-3 text-base font-bold"><span>Net profit</span><strong>{summary.netProfit === null ? 'Unavailable' : formatCurrency(summary.netProfit)}</strong></div></div>{summary.unknownCostItems > 0 && <p className="mt-4 text-xs text-amber-700">{summary.unknownCostItems} historical sale lines have no stored sale-time cost and are excluded from profit.</p>}</div>}
        </section>
      </>}

      <InvoicePreviewDialog open={Boolean(selectedBill)} onOpenChange={(open) => !open && setSelectedBill(null)} bill={selectedBill} />
    </div>
  );
}
