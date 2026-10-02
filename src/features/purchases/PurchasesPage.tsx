import { useEffect, useMemo, useState } from 'react';
import { Barcode, Eye, PackagePlus, Pencil, Plus, Printer, Search, Trash2, Wallet } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { supplierPurchaseService, type PurchasePayload, type PurchaseProduct, type PurchaseRecord, type SupplierPayload, type SupplierRecord, type PurchaseSummary } from '@/services/supplierPurchaseService';

type PurchaseLine = {
  product: PurchaseProduct;
  quantity: number;
  purchaseCost: number;
  batchNumber: string;
  manufacturingDate: string;
  expiryDate: string;
};

const today = () => new Date().toISOString().slice(0, 10);
const money = (value: number) => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const emptySupplier: SupplierPayload = { name: '', contactPerson: '', phone: '', alternatePhone: '', email: '', gstin: '', addressLine1: '', addressLine2: '', city: '', state: '', pincode: '', notes: '', status: 'ACTIVE' };

function makePayload(supplierId: string, purchaseDate: string, supplierInvoiceNumber: string, supplierInvoiceDate: string, referenceNumber: string, notes: string, discount: string, otherCharges: string, roundOff: string, lines: PurchaseLine[]): PurchasePayload {
  return {
    supplierId: Number(supplierId), purchaseDate, supplierInvoiceNumber, supplierInvoiceDate,
    referenceNumber, notes, discount: Number(discount || 0), otherCharges: Number(otherCharges || 0), roundOff: Number(roundOff || 0),
    items: lines.map((line) => ({
      productId: line.product.id,
      quantity: line.quantity,
      purchaseCost: line.purchaseCost,
      batchNumber: line.batchNumber,
      manufacturingDate: line.manufacturingDate,
      expiryDate: line.expiryDate,
    })),
  };
}

function PurchasePrint({ purchase }: { purchase: PurchaseRecord }) {
  return (
    <article className="purchase-print-document">
      <header>
        <h1>SREE SUPER MARKET</h1>
        <p>Purchase Record</p>
      </header>
      <hr />
      <div className="purchase-print-meta">
        <div><span>Purchase No:</span><strong>{purchase.purchase_number}</strong></div>
        <div><span>Date:</span><strong>{purchase.purchase_date}</strong></div>
        <div><span>Supplier:</span><strong>{purchase.supplier_name}</strong></div>
        <div><span>Supplier GSTIN:</span><strong>{purchase.supplier_gstin || '—'}</strong></div>
        <div><span>Supplier Invoice:</span><strong>{purchase.supplier_invoice_number || '—'}</strong></div>
        <div><span>Status:</span><strong>{purchase.status}</strong></div>
      </div>
      <hr />
      <table>
        <thead><tr><th>Product</th><th>Qty</th><th>Cost</th><th>GST</th><th>Tax</th><th>Total</th></tr></thead>
        <tbody>{purchase.items.map((item) => <tr key={item.id}><td>{item.product_name_snapshot}<small>{item.product_tamil_name_snapshot}</small></td><td>{item.quantity} {item.unit}</td><td>{money(item.purchase_cost)}</td><td>{item.gst_rate}%</td><td>{money(item.tax_amount)}</td><td>{money(item.line_total)}</td></tr>)}</tbody>
      </table>
      <hr />
      <div className="purchase-print-totals">
        <div><span>Subtotal</span><span>{money(purchase.subtotal)}</span></div>
        <div><span>Discount</span><span>-{money(purchase.discount)}</span></div>
        <div><span>Taxable</span><span>{money(purchase.taxable_amount)}</span></div>
        <div><span>CGST</span><span>{money(purchase.cgst)}</span></div>
        <div><span>SGST</span><span>{money(purchase.sgst)}</span></div>
        <div><span>Other charges / round off</span><span>{money(purchase.other_charges + purchase.round_off)}</span></div>
        <div className="purchase-print-total"><strong>Grand Total</strong><strong>{money(purchase.grand_total)}</strong></div>
        <div><span>Paid</span><span>{money(purchase.paid_amount)}</span></div>
        <div><span>Balance</span><span>{money(purchase.balance)}</span></div>
      </div>
      <hr />
      <h2>Payments</h2>
      {purchase.payments.length ? purchase.payments.map((payment) => <div className="purchase-print-payment" key={payment.id}><span>{payment.payment_date} · {payment.payment_method} {payment.reference_number}</span><strong>{money(payment.amount)}</strong></div>) : <p>No payments recorded.</p>}
    </article>
  );
}

export function PurchasesPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [summary, setSummary] = useState<PurchaseSummary>({ total_purchases: 0, month_total: 0, draft_count: 0, outstanding_amount: 0 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(today());
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState('');
  const [supplierInvoiceDate, setSupplierInvoiceDate] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [discount, setDiscount] = useState('0');
  const [otherCharges, setOtherCharges] = useState('0');
  const [roundOff, setRoundOff] = useState('0');
  const [lines, setLines] = useState<PurchaseLine[]>([]);
  const [barcode, setBarcode] = useState('');
  const [barcodeNotFound, setBarcodeNotFound] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState<PurchaseProduct[]>([]);
  const [viewing, setViewing] = useState<PurchaseRecord | null>(null);
  const [confirmReceive, setConfirmReceive] = useState<PurchaseRecord | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<PurchaseRecord | null>(null);
  const [paymentPurchase, setPaymentPurchase] = useState<PurchaseRecord | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentDate, setPaymentDate] = useState(today());
  const [paymentNotes, setPaymentNotes] = useState('');
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [newSupplier, setNewSupplier] = useState<SupplierPayload>(emptySupplier);
  const [savingSupplier, setSavingSupplier] = useState(false);

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [rows, totals, supplierRows] = await Promise.all([
        supplierPurchaseService.purchases({ search, status, supplierId: supplierFilter, dateFrom, dateTo }),
        supplierPurchaseService.purchaseSummary(),
        supplierPurchaseService.suppliers('', 'ACTIVE'),
      ]);
      setPurchases(rows);
      setSummary(totals);
      setSuppliers(supplierRows);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load purchases.';
      setLoadError(message);
      toast({ title: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 180);
    return () => window.clearTimeout(timer);
  }, [search, status, supplierFilter, dateFrom, dateTo]);

  const totals = useMemo(() => {
    const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.purchaseCost, 0);
    const discountValue = Math.min(Math.max(Number(discount) || 0, 0), subtotal);
    let allocated = 0;
    const taxes = lines.map((line, index) => {
      const gross = line.quantity * line.purchaseCost;
      const lineDiscount = index === lines.length - 1 ? discountValue - allocated : subtotal ? discountValue * gross / subtotal : 0;
      allocated += lineDiscount;
      return (gross - lineDiscount) * line.product.gstPercent / 100;
    });
    const taxableValue = subtotal - discountValue;
    const tax = taxes.reduce((sum, value) => sum + value, 0);
    const cgst = tax / 2;
    const sgst = tax - cgst;
    const grandTotal = taxableValue + tax + (Number(otherCharges) || 0) + (Number(roundOff) || 0);
    return { subtotal, discount: discountValue, taxableValue, cgst, sgst, tax, grandTotal };
  }, [lines, discount, otherCharges, roundOff]);

  const resetForm = () => {
    setEditingId(null);
    setSupplierId('');
    setPurchaseDate(today());
    setSupplierInvoiceNumber('');
    setSupplierInvoiceDate('');
    setReferenceNumber('');
    setNotes('');
    setDiscount('0');
    setOtherCharges('0');
    setRoundOff('0');
    setLines([]);
    setBarcode('');
    setProductSearch('');
    setProductResults([]);
  };

  const startNew = () => { resetForm(); setFormOpen(true); };

  const addProduct = (product: PurchaseProduct) => {
    setLines((current) => {
      const existing = current.find((line) => line.product.id === product.id);
      if (existing) return current.map((line) => line.product.id === product.id ? { ...line, quantity: line.quantity + 1 } : line);
      return [...current, { product, quantity: 1, purchaseCost: product.purchasePrice, batchNumber: '', manufacturingDate: '', expiryDate: '' }];
    });
    setProductResults([]);
    setProductSearch('');
    setBarcode('');
    setBarcodeNotFound(false);
  };

  const lookupBarcode = async () => {
    if (!barcode.trim()) return;
    try { addProduct(await supplierPurchaseService.purchaseProductByBarcode(barcode.trim())); }
    catch { setBarcodeNotFound(true); }
  };

  const searchProducts = async () => {
    if (!productSearch.trim()) { setProductResults([]); return; }
    try { setProductResults(await supplierPurchaseService.purchaseProducts(productSearch.trim())); }
    catch (error) { toast({ title: error instanceof Error ? error.message : 'Unable to search products.', variant: 'destructive' }); }
  };

  const openEdit = (purchase: PurchaseRecord) => {
    setEditingId(purchase.id);
    setSupplierId(String(purchase.supplier_id));
    setPurchaseDate(purchase.purchase_date);
    setSupplierInvoiceNumber(purchase.supplier_invoice_number || '');
    setSupplierInvoiceDate(purchase.supplier_invoice_date || '');
    setReferenceNumber(purchase.reference_number || '');
    setNotes(purchase.notes || '');
    setDiscount(String(purchase.discount));
    setOtherCharges(String(purchase.other_charges));
    setRoundOff(String(purchase.round_off));
    setLines(purchase.items.map((item) => ({
      product: {
        id: item.product_id,
        nameEnglish: item.product_name_snapshot,
        nameTamil: item.product_tamil_name_snapshot,
        sku: '',
        purchasePrice: item.purchase_cost,
        sellingPrice: 0,
        mrp: 0,
        gstPercent: item.gst_rate,
        currentStock: 0,
        unitSymbol: item.unit,
      },
      quantity: item.quantity,
      purchaseCost: item.purchase_cost,
      batchNumber: item.batch_number || '',
      manufacturingDate: item.manufacturing_date || '',
      expiryDate: item.expiry_date || '',
    })));
    setFormOpen(true);
  };

  const makeCurrentPayload = () => makePayload(supplierId, purchaseDate, supplierInvoiceNumber, supplierInvoiceDate, referenceNumber, notes, discount, otherCharges, roundOff, lines);

  const saveDraft = async (receiveAfter = false) => {
    if (!supplierId || lines.length === 0) {
      toast({ title: !supplierId ? 'Select a supplier.' : 'Add at least one product.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const saved = editingId
        ? await supplierPurchaseService.updateDraft(editingId, makeCurrentPayload())
        : await supplierPurchaseService.createPurchase(makeCurrentPayload());
      if (receiveAfter) {
        await supplierPurchaseService.receivePurchase(saved.id);
        toast({ title: 'Purchase received', description: saved.purchase_number });
      } else {
        toast({ title: editingId ? 'Draft updated' : 'Draft saved', description: saved.purchase_number });
      }
      setFormOpen(false);
      await load();
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : 'Unable to save purchase.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const openPurchase = async (purchase: PurchaseRecord) => {
    try { setViewing(await supplierPurchaseService.purchase(purchase.id)); }
    catch (error) { toast({ title: error instanceof Error ? error.message : 'Unable to load purchase.', variant: 'destructive' }); }
  };

  const receive = async () => {
    if (!confirmReceive) return;
    try {
      await supplierPurchaseService.receivePurchase(confirmReceive.id);
      toast({ title: 'Purchase received', description: confirmReceive.purchase_number });
      setConfirmReceive(null);
      await load();
    } catch (error) { toast({ title: error instanceof Error ? error.message : 'Unable to receive purchase.', variant: 'destructive' }); }
  };

  const cancel = async () => {
    if (!confirmCancel) return;
    try {
      await supplierPurchaseService.cancelPurchase(confirmCancel.id);
      toast({ title: 'Draft purchase cancelled' });
      setConfirmCancel(null);
      await load();
    } catch (error) { toast({ title: error instanceof Error ? error.message : 'Unable to cancel purchase.', variant: 'destructive' }); }
  };

  const addSupplierInline = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingSupplier(true);
    try {
      const created = await supplierPurchaseService.createSupplier(newSupplier);
      setSuppliers((current) => [...current, created].sort((left, right) => left.name.localeCompare(right.name)));
      setSupplierId(String(created.id));
      setSupplierDialogOpen(false);
      setNewSupplier(emptySupplier);
      toast({ title: 'Supplier added and selected' });
    } catch (error) { toast({ title: error instanceof Error ? error.message : 'Unable to add supplier.', variant: 'destructive' }); }
    finally { setSavingSupplier(false); }
  };

  const recordPayment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!paymentPurchase) return;
    try {
      await supplierPurchaseService.addPayment(paymentPurchase.id, { amount: Number(paymentAmount), paymentMethod, referenceNumber: paymentReference, paymentDate, notes: paymentNotes });
      toast({ title: 'Payment recorded' });
      setPaymentPurchase(null);
      setPaymentAmount('');
      await load();
      if (viewing?.id === paymentPurchase.id) await openPurchase(paymentPurchase);
    } catch (error) { toast({ title: error instanceof Error ? error.message : 'Unable to record payment.', variant: 'destructive' }); }
  };

  const updateLine = (productId: number, patch: Partial<PurchaseLine>) => setLines((current) => current.map((line) => line.product.id === productId ? { ...line, ...patch } : line));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader title="Purchases" description="Create purchases, receive stock and track supplier purchases." breadcrumbs={[{ label: 'Purchases' }]} />
        <Button onClick={startNew}><Plus className="mr-2 h-4 w-4" />New Purchase</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Total Purchases', summary.total_purchases],
          ['This Month', money(summary.month_total)],
          ['Pending / Draft', summary.draft_count],
          ['Outstanding', money(summary.outstanding_amount)],
        ].map(([label, value]) => <div key={String(label)} className="flex items-center justify-between rounded-lg border bg-card p-4"><div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></div><PackagePlus className="h-5 w-5 text-muted-foreground" /></div>)}
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_160px_180px_150px_150px]">
        <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Search purchase, supplier, invoice..." value={search} onChange={(event) => setSearch(event.target.value)} /></div>
        <select aria-label="Purchase status" className="h-9 rounded-md border bg-background px-3 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}><option value="ALL">All statuses</option><option value="DRAFT">Draft</option><option value="RECEIVED">Received</option><option value="CANCELLED">Cancelled</option></select>
        <select aria-label="Filter supplier" className="h-9 rounded-md border bg-background px-3 text-sm" value={supplierFilter} onChange={(event) => setSupplierFilter(event.target.value)}><option value="">All suppliers</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select>
        <Input aria-label="Date from" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
        <Input aria-label="Date to" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[1120px] text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3">Purchase no.</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Supplier</th><th className="px-4 py-3">Supplier invoice</th><th className="px-4 py-3 text-right">Items</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3 text-right">Paid</th><th className="px-4 py-3 text-right">Balance</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Payment</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={11} className="px-4 py-8 text-center text-muted-foreground">Loading purchases...</td></tr>
              : loadError ? <tr><td colSpan={11} className="px-4 py-8 text-center"><p className="text-destructive">{loadError}</p><Button className="mt-2" variant="outline" onClick={() => void load()}>Retry</Button></td></tr>
              : purchases.length === 0 ? <tr><td colSpan={11} className="px-4 py-8 text-center text-muted-foreground">No purchases found.</td></tr>
                : purchases.map((purchase) => <tr key={purchase.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{purchase.purchase_number}</td><td className="px-4 py-3">{purchase.purchase_date}</td><td className="px-4 py-3">{purchase.supplier_name}</td><td className="px-4 py-3">{purchase.supplier_invoice_number || '—'}</td><td className="px-4 py-3 text-right">{purchase.item_count ?? purchase.items?.length ?? 0}</td><td className="px-4 py-3 text-right">{money(purchase.grand_total)}</td><td className="px-4 py-3 text-right">{money(purchase.paid_amount)}</td><td className="px-4 py-3 text-right">{money(purchase.balance)}</td><td className="px-4 py-3">{purchase.status}</td><td className="px-4 py-3">{purchase.payment_status}</td>
                  <td className="px-4 py-3"><div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => void openPurchase(purchase)} aria-label={`View ${purchase.purchase_number}`}><Eye className="h-4 w-4" /></Button>
                    {purchase.status === 'DRAFT' && <Button variant="ghost" size="sm" onClick={() => openEdit(purchase)} aria-label={`Edit ${purchase.purchase_number}`}><Pencil className="h-4 w-4" /></Button>}
                    {purchase.status === 'DRAFT' && <Button variant="outline" size="sm" onClick={() => setConfirmReceive(purchase)}>Receive</Button>}
                    {purchase.status !== 'CANCELLED' && purchase.balance > 0 && <Button variant="ghost" size="sm" onClick={() => { setPaymentPurchase(purchase); setPaymentAmount(purchase.balance.toFixed(2)); }} aria-label={`Payment ${purchase.purchase_number}`}><Wallet className="h-4 w-4" /></Button>}
                    {purchase.status === 'DRAFT' && <Button variant="ghost" size="sm" onClick={() => setConfirmCancel(purchase)} aria-label={`Cancel ${purchase.purchase_number}`}><Trash2 className="h-4 w-4" /></Button>}
                    <Button variant="ghost" size="sm" onClick={() => { void openPurchase(purchase).then(() => window.setTimeout(() => window.print(), 350)); }} aria-label={`Print ${purchase.purchase_number}`}><Printer className="h-4 w-4" /></Button>
                  </div></td>
                </tr>)}
          </tbody>
        </table>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[94vh] max-w-6xl overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? 'Edit Draft Purchase' : 'New Purchase'}</DialogTitle><DialogDescription>Purchase costs are saved to this purchase and do not change Product Master pricing.</DialogDescription></DialogHeader>
          <section className="space-y-3">
            <h3 className="font-semibold">Purchase information</h3>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-2"><Label htmlFor="purchase-supplier">Supplier *</Label><select id="purchase-supplier" className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={supplierId} onChange={(event) => setSupplierId(event.target.value)}><option value="">Select supplier</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select><Button type="button" variant="link" className="h-auto p-0" onClick={() => setSupplierDialogOpen(true)}>+ Add Supplier</Button></div>
              <div className="space-y-2"><Label htmlFor="purchase-date">Purchase date *</Label><Input id="purchase-date" type="date" value={purchaseDate} onChange={(event) => setPurchaseDate(event.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="supplier-invoice">Supplier invoice number</Label><Input id="supplier-invoice" value={supplierInvoiceNumber} onChange={(event) => setSupplierInvoiceNumber(event.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="supplier-invoice-date">Supplier invoice date</Label><Input id="supplier-invoice-date" type="date" value={supplierInvoiceDate} onChange={(event) => setSupplierInvoiceDate(event.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="purchase-reference">Reference number</Label><Input id="purchase-reference" value={referenceNumber} onChange={(event) => setReferenceNumber(event.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="purchase-notes">Notes</Label><Input id="purchase-notes" value={notes} onChange={(event) => setNotes(event.target.value)} /></div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="font-semibold">Add products</h3>
            <div className="grid gap-2 md:grid-cols-2">
              <div>
                <div className="flex gap-2"><div className="relative flex-1"><Barcode className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Scan or enter barcode" value={barcode} onChange={(event) => { setBarcode(event.target.value); setBarcodeNotFound(false); }} onKeyDown={(event) => event.key === 'Enter' && (event.preventDefault(), void lookupBarcode())} /></div><Button type="button" variant="outline" onClick={() => void lookupBarcode()}>Lookup</Button></div>
                {barcodeNotFound && <div className="mt-2 flex flex-wrap items-center gap-2 text-sm"><span className="text-destructive">Product not found.</span><Button type="button" variant="link" className="h-auto p-0" onClick={() => { setProductSearch(barcode.trim()); document.getElementById('purchase-product-search')?.focus(); }}>Search Product</Button><Button type="button" variant="outline" size="sm" onClick={() => navigate('/products')}>Go to Product Master</Button></div>}
              </div>
              <div className="flex gap-2"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="purchase-product-search" className="pl-9" placeholder="Search name, Tamil, SKU, barcode, brand" value={productSearch} onChange={(event) => setProductSearch(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && (event.preventDefault(), void searchProducts())} /></div><Button type="button" variant="outline" onClick={() => void searchProducts()}>Search</Button></div>
            </div>
            {productResults.length > 0 && <div className="max-h-48 divide-y overflow-y-auto rounded-md border">{productResults.map((product) => <button type="button" key={product.id} className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-muted" onClick={() => addProduct(product)}><span><strong>{product.nameEnglish}</strong><span className="ml-2 text-xs text-muted-foreground">{product.nameTamil} · {product.sku} · Stock {product.currentStock}</span></span><span className="text-sm">Cost {money(product.purchasePrice)}</span></button>)}</div>}
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[1200px] text-sm">
                <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground"><tr><th className="px-3 py-2">Product / Barcode</th><th className="px-3 py-2">Stock</th><th className="px-3 py-2">Qty</th><th className="px-3 py-2">Unit</th><th className="px-3 py-2">Cost</th><th className="px-3 py-2">GST</th><th className="px-3 py-2">Taxable</th><th className="px-3 py-2">Tax</th><th className="px-3 py-2">Total</th><th className="px-3 py-2">Batch / Expiry</th><th className="px-3 py-2"></th></tr></thead>
                <tbody>{lines.length ? lines.map((line) => {
                  const taxable = line.quantity * line.purchaseCost;
                  const tax = taxable * line.product.gstPercent / 100;
                  return <tr key={line.product.id} className="border-b last:border-0 align-top">
                    <td className="px-3 py-2"><strong>{line.product.nameEnglish}</strong><span className="block text-xs text-muted-foreground">{line.product.nameTamil}</span><span className="block text-xs text-muted-foreground">{line.product.identifierValue || line.product.sku}</span></td>
                    <td className="px-3 py-2">{line.product.currentStock}</td>
                    <td className="px-3 py-2"><Input aria-label={`${line.product.nameEnglish} quantity`} className="w-20" type="number" min="0.001" step="0.001" value={line.quantity} onChange={(event) => updateLine(line.product.id, { quantity: Number(event.target.value) })} /></td>
                    <td className="px-3 py-2">{line.product.unitSymbol || line.product.unitName || 'UNIT'}</td>
                    <td className="px-3 py-2"><Input aria-label={`${line.product.nameEnglish} purchase cost`} className="w-24" type="number" min="0" step="0.01" value={line.purchaseCost} onChange={(event) => updateLine(line.product.id, { purchaseCost: Number(event.target.value) })} /></td>
                    <td className="px-3 py-2">{line.product.gstPercent}%</td><td className="px-3 py-2">{money(taxable)}</td><td className="px-3 py-2">{money(tax)}</td><td className="px-3 py-2">{money(taxable + tax)}</td>
                    <td className="space-y-1 px-3 py-2"><Input aria-label={`${line.product.nameEnglish} batch`} placeholder="Batch" value={line.batchNumber} onChange={(event) => updateLine(line.product.id, { batchNumber: event.target.value })} /><Input aria-label={`${line.product.nameEnglish} manufacturing date`} type="date" value={line.manufacturingDate} onChange={(event) => updateLine(line.product.id, { manufacturingDate: event.target.value })} /><Input aria-label={`${line.product.nameEnglish} expiry date`} type="date" value={line.expiryDate} onChange={(event) => updateLine(line.product.id, { expiryDate: event.target.value })} /></td>
                    <td className="px-3 py-2"><Button type="button" variant="ghost" size="sm" onClick={() => setLines((current) => current.filter((entry) => entry.product.id !== line.product.id))} aria-label={`Remove ${line.product.nameEnglish}`}><Trash2 className="h-4 w-4" /></Button></td>
                  </tr>;
                }) : <tr><td colSpan={11} className="px-3 py-8 text-center text-muted-foreground">Scan a barcode or search for an existing product.</td></tr>}</tbody>
              </table>
            </div>
          </section>

          <section className="grid gap-5 md:grid-cols-[1fr_320px]">
            <div className="space-y-2"><Label htmlFor="purchase-notes-long">Purchase notes</Label><Textarea id="purchase-notes-long" value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} /></div>
            <div className="space-y-2 rounded-md border p-4 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{money(totals.subtotal)}</span></div>
              <div className="flex items-center justify-between gap-3"><Label htmlFor="purchase-discount">Discount</Label><Input id="purchase-discount" className="w-28 text-right" type="number" min="0" step="0.01" value={discount} onChange={(event) => setDiscount(event.target.value)} /></div>
              <div className="flex justify-between"><span>Taxable value</span><span>{money(totals.taxableValue)}</span></div>
              <div className="flex justify-between"><span>CGST</span><span>{money(totals.cgst)}</span></div><div className="flex justify-between"><span>SGST</span><span>{money(totals.sgst)}</span></div>
              <div className="flex items-center justify-between gap-3"><Label htmlFor="purchase-charges">Other charges</Label><Input id="purchase-charges" className="w-28 text-right" type="number" min="0" step="0.01" value={otherCharges} onChange={(event) => setOtherCharges(event.target.value)} /></div>
              <div className="flex items-center justify-between gap-3"><Label htmlFor="purchase-roundoff">Round off</Label><Input id="purchase-roundoff" className="w-28 text-right" type="number" step="0.01" value={roundOff} onChange={(event) => setRoundOff(event.target.value)} /></div>
              <div className="flex justify-between border-t pt-2 text-base font-bold"><span>Grand Total</span><span>{money(totals.grandTotal)}</span></div>
            </div>
          </section>
          <DialogFooter className="flex-wrap gap-2 sm:justify-between">
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Close</Button>
            <div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" disabled={saving} onClick={() => void saveDraft(false)}>{saving ? 'Saving...' : 'Save Draft'}</Button><Button type="button" disabled={saving} onClick={() => void saveDraft(true)}>{saving ? 'Saving...' : 'Save & Receive Purchase'}</Button></div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={supplierDialogOpen} onOpenChange={setSupplierDialogOpen}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>Add Supplier</DialogTitle><DialogDescription>Supplier will be saved and selected for this purchase.</DialogDescription></DialogHeader>
          <form className="space-y-3" onSubmit={(event) => void addSupplierInline(event)}><div className="space-y-2"><Label htmlFor="inline-supplier-name">Supplier name *</Label><Input id="inline-supplier-name" required value={newSupplier.name} onChange={(event) => setNewSupplier((current) => ({ ...current, name: event.target.value }))} /></div><div className="space-y-2"><Label htmlFor="inline-supplier-phone">Phone *</Label><Input id="inline-supplier-phone" required value={newSupplier.phone} onChange={(event) => setNewSupplier((current) => ({ ...current, phone: event.target.value }))} /></div><DialogFooter><Button type="button" variant="outline" onClick={() => setSupplierDialogOpen(false)}>Cancel</Button><Button type="submit" disabled={savingSupplier}>{savingSupplier ? 'Saving...' : 'Create Supplier'}</Button></DialogFooter></form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(confirmReceive)} onOpenChange={(open) => !open && setConfirmReceive(null)}><DialogContent><DialogHeader><DialogTitle>Receive Purchase?</DialogTitle><DialogDescription>This will add the purchased quantities to inventory and create stock movements.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setConfirmReceive(null)}>Cancel</Button><Button onClick={() => void receive()}>Confirm Receive</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={Boolean(confirmCancel)} onOpenChange={(open) => !open && setConfirmCancel(null)}><DialogContent><DialogHeader><DialogTitle>Cancel Draft Purchase?</DialogTitle><DialogDescription>Only draft purchases can be cancelled. Stock has not been changed.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setConfirmCancel(null)}>Keep Draft</Button><Button variant="destructive" onClick={() => void cancel()}>Cancel Purchase</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={Boolean(paymentPurchase)} onOpenChange={(open) => !open && setPaymentPurchase(null)}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>Record Supplier Payment</DialogTitle><DialogDescription>{paymentPurchase?.purchase_number} · Balance {money(paymentPurchase?.balance || 0)}</DialogDescription></DialogHeader>
        <form className="space-y-3" onSubmit={(event) => void recordPayment(event)}><div className="space-y-2"><Label htmlFor="payment-amount">Amount</Label><Input id="payment-amount" type="number" min="0.01" max={paymentPurchase?.balance} step="0.01" required value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} /></div><div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label htmlFor="payment-method">Method</Label><select id="payment-method" className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}><option>CASH</option><option>UPI</option><option>BANK</option><option>OTHER</option></select></div><div className="space-y-2"><Label htmlFor="payment-date">Payment date</Label><Input id="payment-date" type="date" required value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} /></div></div><div className="space-y-2"><Label htmlFor="payment-reference">Reference</Label><Input id="payment-reference" value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="payment-notes">Notes</Label><Input id="payment-notes" value={paymentNotes} onChange={(event) => setPaymentNotes(event.target.value)} /></div><DialogFooter><Button type="button" variant="outline" onClick={() => setPaymentPurchase(null)}>Cancel</Button><Button type="submit">Save Payment</Button></DialogFooter></form>
      </DialogContent></Dialog>

      <Dialog open={Boolean(viewing)} onOpenChange={(open) => !open && setViewing(null)}><DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto"><DialogHeader><DialogTitle>{viewing?.purchase_number}</DialogTitle><DialogDescription>{viewing?.supplier_name} · {viewing?.purchase_date} · {viewing?.status} · {viewing?.payment_status}</DialogDescription></DialogHeader>
        {viewing && <div className="space-y-5">
          {viewing.status === 'RECEIVED' && <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">Received purchases cannot be cancelled directly because inventory has already been updated.</p>}
          <div className="grid gap-3 rounded-md border p-3 sm:grid-cols-3"><div><span className="text-xs text-muted-foreground">Supplier GSTIN</span><p>{viewing.supplier_gstin || '—'}</p></div><div><span className="text-xs text-muted-foreground">Supplier invoice</span><p>{viewing.supplier_invoice_number || '—'}</p></div><div><span className="text-xs text-muted-foreground">Received</span><p>{viewing.received_at || 'Not received'}</p></div></div>
          <div className="overflow-x-auto rounded-md border"><table className="w-full min-w-[640px] text-sm"><thead className="border-b bg-muted/40 text-left"><tr><th className="px-3 py-2">Product at purchase</th><th className="px-3 py-2">Qty</th><th className="px-3 py-2">Cost</th><th className="px-3 py-2">GST</th><th className="px-3 py-2">Tax</th><th className="px-3 py-2 text-right">Total</th></tr></thead><tbody>{viewing.items.map((item) => <tr key={item.id} className="border-b last:border-0"><td className="px-3 py-2">{item.product_name_snapshot}<span className="block text-xs text-muted-foreground">{item.product_tamil_name_snapshot}</span></td><td className="px-3 py-2">{item.quantity} {item.unit}</td><td className="px-3 py-2">{money(item.purchase_cost)}</td><td className="px-3 py-2">{item.gst_rate}%</td><td className="px-3 py-2">{money(item.tax_amount)}</td><td className="px-3 py-2 text-right">{money(item.line_total)}</td></tr>)}</tbody></table></div>
          <div className="grid gap-4 md:grid-cols-2"><div className="rounded-md border p-3 text-sm"><h3 className="mb-2 font-semibold">Payments</h3>{viewing.payments.length ? viewing.payments.map((payment) => <div key={payment.id} className="flex justify-between border-b py-2 last:border-0"><span>{payment.payment_date} · {payment.payment_method} {payment.reference_number}</span><strong>{money(payment.amount)}</strong></div>) : <p className="text-muted-foreground">No payments recorded.</p>}<div className="mt-2 flex justify-between border-t pt-2"><span>Balance due</span><strong>{money(viewing.balance)}</strong></div></div><div className="rounded-md border p-3 text-sm"><div className="flex justify-between"><span>Subtotal</span><span>{money(viewing.subtotal)}</span></div><div className="flex justify-between"><span>Discount</span><span>-{money(viewing.discount)}</span></div><div className="flex justify-between"><span>Taxable</span><span>{money(viewing.taxable_amount)}</span></div><div className="flex justify-between"><span>CGST</span><span>{money(viewing.cgst)}</span></div><div className="flex justify-between"><span>SGST</span><span>{money(viewing.sgst)}</span></div><div className="flex justify-between"><span>Other / round off</span><span>{money(viewing.other_charges + viewing.round_off)}</span></div><div className="mt-2 flex justify-between border-t pt-2 font-bold"><span>Grand Total</span><span>{money(viewing.grand_total)}</span></div></div></div>
          {viewing.status === 'DRAFT' && <div className="flex justify-end"><Button onClick={() => { setViewing(null); setConfirmReceive(viewing); }}>Receive Purchase</Button></div>}
        </div>}
      </DialogContent></Dialog>
      {viewing && <div className="purchase-print-root"><PurchasePrint purchase={viewing} /></div>}
    </div>
  );
}
