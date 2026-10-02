import { useEffect, useMemo, useRef, useState } from 'react';
import { Barcode, Minus, Plus, Search, Trash2, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/authStore';
import { productService, type BillRecord, type PosProduct } from '@/services/productService';
import { adminService, type HeldBillRecord } from '@/services/adminService';
import { InvoicePreviewDialog } from './InvoicePreviewDialog';

type CartLine = PosProduct & { quantity: number };
type CustomerSelection = { id: number | null; name: string; phone: string; customerCode?: string };

function normalizePhone(value: string) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  return digits;
}

const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function PosPage() {
  const { toast } = useToast();
  const cashierName = useAuthStore((state) => state.user?.name || 'Cashier');
  const cashierId = useAuthStore((state) => state.user?.id || state.user?.role || 'CASHIER');
  const location = useLocation();
  const navigate = useNavigate();
  const barcodeRef = useRef<HTMLInputElement | null>(null);
  const resumedHoldRef = useRef<number | null>(null);
  const [barcode, setBarcode] = useState('');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<PosProduct[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discount, setDiscount] = useState('0');
  const [cashReceived, setCashReceived] = useState('0');
  const [counter, setCounter] = useState('Counter 01');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [receipt, setReceipt] = useState<BillRecord | null>(null);
  const [processing, setProcessing] = useState(false);
  const [customer, setCustomer] = useState<CustomerSelection>({ id: null, name: 'Walk-in Customer', phone: '' });
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerLookupOpen, setCustomerLookupOpen] = useState(true);
  const [customerLookupLoading, setCustomerLookupLoading] = useState(false);
  const [customerLookupMatch, setCustomerLookupMatch] = useState<CustomerSelection | null>(null);
  const [customerLookupNotFound, setCustomerLookupNotFound] = useState(false);
  const [customerLookupMessage, setCustomerLookupMessage] = useState('Enter customer mobile number to find an existing customer.');
  const [customerForm, setCustomerForm] = useState({ name: '', phone: '' });

  useEffect(() => {
    void adminService.storeSettings().then((settings) => setCounter(settings.receipt.counter)).catch(() => undefined);
  }, []);

  const addProduct = (product: PosProduct) => {
    const existing = cart.find((line) => line.id === product.id);
    const nextQuantity = (existing?.quantity || 0) + 1;
    if (product.currentStock < nextQuantity) {
      toast({ title: 'Insufficient stock.', description: `Available: ${product.currentStock}`, variant: 'destructive' });
      return;
    }

    setCart((current) => existing
      ? current.map((line) => line.id === product.id ? { ...line, quantity: nextQuantity } : line)
      : [...current, { ...product, quantity: 1 }]);
    setBarcode('');
    barcodeRef.current?.focus();
  };

  const lookupBarcode = async () => {
    const value = barcode.trim();
    if (!value) return;

    try {
      const product = await productService.posLookup(value);
      addProduct(product);
    } catch {
      toast({ title: 'Product not found', description: `Barcode: ${value}`, variant: 'destructive' });
      setBarcode('');
      barcodeRef.current?.focus();
    }
  };

  const updateQuantity = (id: number, quantity: number) => {
    const line = cart.find((item) => item.id === id);
    if (!line) return;
    if (quantity <= 0) {
      setCart((current) => current.filter((item) => item.id !== id));
      return;
    }
    if (quantity > line.currentStock) {
      toast({ title: 'Insufficient stock.', description: `Available: ${line.currentStock}`, variant: 'destructive' });
      return;
    }
    setCart((current) => current.map((item) => item.id === id ? { ...item, quantity } : item));
  };

  const totals = useMemo(() => {
    const subtotal = money(cart.reduce((sum, line) => sum + line.sellingPrice * line.quantity, 0));
    const discountValue = money(Math.min(Math.max(Number(discount) || 0, 0), subtotal));
    const taxable = money(subtotal - discountValue);
    const taxMultiplier = subtotal > 0 ? taxable / subtotal : 0;
    const tax = money(cart.reduce((sum, line) => {
      const lineTotal = line.sellingPrice * line.quantity;
      return sum + (lineTotal / (1 + line.gstPercent / 100)) * line.gstPercent / 100 * taxMultiplier;
    }, 0));
    const cgst = money(tax / 2);
    const sgst = money(tax - cgst);
    const grandTotal = money(taxable + tax);
    const roundOff = money(grandTotal - taxable - cgst - sgst);

    return {
      subtotal,
      discount: discountValue,
      taxable,
      cgst,
      sgst,
      roundOff,
      grandTotal,
      itemCount: cart.reduce((sum, line) => sum + line.quantity, 0),
    };
  }, [cart, discount]);

  const searchProducts = async () => {
    if (!search.trim()) {
      setResults([]);
      return;
    }

    try {
      setResults(await productService.posSearch(search.trim()));
    } catch {
      toast({ title: 'Product search unavailable.', variant: 'destructive' });
    }
  };

  const searchCustomer = async () => {
    const phone = normalizePhone(customerPhone);
    if (!phone) {
      setCustomerLookupMessage('Enter customer mobile number to find an existing customer.');
      setCustomerLookupNotFound(false);
      setCustomerLookupMatch(null);
      return;
    }

    setCustomerLookupLoading(true);
    try {
      const found = await productService.searchCustomer(phone);
      const nextCustomer = {
        id: found.id,
        name: found.name,
        phone: found.phone,
        customerCode: found.customer_code,
      };
      setCustomerLookupMatch(nextCustomer);
      setCustomerLookupNotFound(false);
      setCustomerLookupMessage('Customer found.');
    } catch {
      setCustomerLookupMatch(null);
      setCustomerLookupNotFound(true);
      setCustomerLookupMessage('Customer not found.');
      setCustomerForm({ name: '', phone });
    } finally {
      setCustomerLookupLoading(false);
    }
  };

  const saveCustomer = async () => {
    const name = customerForm.name.trim();
    const phone = normalizePhone(customerForm.phone || customerPhone);
    if (!name || !phone) {
      toast({ title: 'Customer details required.', description: 'Name and mobile number are required.', variant: 'destructive' });
      return;
    }

    try {
      const created = await productService.createCustomer({ name, phone });
      const nextCustomer = { id: created.id, name: created.name, phone: created.phone, customerCode: created.customer_code };
      setCustomer(nextCustomer);
      setCustomerPhone(created.phone);
      setCustomerLookupOpen(false);
      setCustomerLookupMatch(null);
      setCustomerLookupNotFound(false);
      setCustomerLookupMessage('');
      setCustomerForm({ name: '', phone: created.phone });
      toast({ title: 'Customer saved', description: `${created.name} has been attached to this bill.` });
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : 'Unable to save customer.', variant: 'destructive' });
    }
  };

  const useSelectedCustomer = (nextCustomer: CustomerSelection) => {
    setCustomer(nextCustomer);
    setCustomerPhone(nextCustomer.phone);
    setCustomerLookupOpen(false);
    setCustomerLookupMatch(null);
    setCustomerLookupNotFound(false);
    setCustomerLookupMessage('');
  };

  const finalize = async () => {
    setProcessing(true);
    try {
      const completed = await productService.finalizeBill({
        items: cart.map((line) => ({ productId: line.id, quantity: line.quantity })),
        discount: totals.discount,
        cashReceived: Number(cashReceived),
        cashierName,
        counter,
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
      });
      setReceipt(completed);
      setCart([]);
      setDiscount('0');
      setCashReceived('0');
      setCustomer({ id: null, name: 'Walk-in Customer', phone: '' });
      setCustomerPhone('');
      setCustomerLookupOpen(true);
      setConfirmOpen(false);
      toast({ title: 'Bill completed', description: completed.bill_number });
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : 'Unable to finalize bill.', variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    barcodeRef.current?.focus();

    const handler = (event: KeyboardEvent) => {
      if (event.key === 'F2') {
        event.preventDefault();
        barcodeRef.current?.focus();
      }
      if (event.key === 'F8' && cart.length) {
        event.preventDefault();
        setCashReceived(totals.grandTotal.toFixed(2));
        setConfirmOpen(true);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cart.length, totals.grandTotal]);

  const openConfirmation = () => {
    setCashReceived(totals.grandTotal.toFixed(2));
    setConfirmOpen(true);
  };

  const holdCurrentBill = async () => {
    if (!cart.length) return;
    try {
      const held = await adminService.createHeldBill({
        cashierId,
        cashierName,
        customer,
        items: cart.map((line) => ({ ...line })),
        discount: totals.discount,
      });
      setCart([]);
      setDiscount('0');
      setCashReceived('0');
      setCustomer({ id: null, name: 'Walk-in Customer', phone: '' });
      setCustomerPhone('');
      setCustomerLookupOpen(true);
      toast({ title: 'Bill held', description: held.hold_number });
      navigate('/pos/held');
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : 'Unable to hold bill.', variant: 'destructive' });
    }
  };

  useEffect(() => {
    const held = (location.state as { heldBill?: HeldBillRecord } | null)?.heldBill;
    if (!held || resumedHoldRef.current === held.id) return;
    resumedHoldRef.current = held.id;
    setCart(held.items.map((item) => ({ ...(item as PosProduct), quantity: Number(item.quantity) })));
    setDiscount(String(held.discount || 0));
    setCustomer(held.customer || { id: null, name: 'Walk-in Customer', phone: '' });
    setCustomerPhone(held.customer?.phone || '');
    setCustomerLookupOpen(false);
    void adminService.deleteHeldBill(held.id).then(() => {
      toast({ title: 'Held bill resumed', description: held.hold_number });
    }).catch((error) => {
      toast({ title: error instanceof Error ? error.message : 'Bill restored, but the held record could not be removed.', variant: 'destructive' });
    });
    navigate('/pos', { replace: true, state: null });
  }, [location.state, navigate, toast]);

  return (
    <div className="space-y-6">
      <PageHeader title="POS Billing" description="Fast barcode billing for Sree Super Market." breadcrumbs={[{ label: 'POS Billing' }]} />

      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
              <User className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Customer</p>
              <p className="text-lg font-semibold">{customer.name}</p>
              {customer.phone ? (
                <p className="text-sm text-muted-foreground">{customer.phone}</p>
              ) : (
                <p className="text-sm text-muted-foreground">Walk-in transaction</p>
              )}
            </div>
          </div>
          <Button variant="outline" onClick={() => setCustomerLookupOpen(true)}>
            {customer.id ? 'Change' : 'Add Customer'}
          </Button>
        </div>

        {customerLookupOpen && (
          <div className="mt-4 rounded-lg border bg-muted/20 p-4">
            <h3 className="text-base font-semibold">Customer Details</h3>
            <p className="mt-1 text-sm text-muted-foreground">Enter customer mobile number to find an existing customer.</p>
            <div className="mt-3 flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">+91</span>
                <Input
                  className="pl-12"
                  placeholder="9843012345"
                  value={customerPhone}
                  onChange={(event) => setCustomerPhone(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      void searchCustomer();
                    }
                  }}
                />
              </div>
              <Button onClick={() => void searchCustomer()} disabled={customerLookupLoading}>
                {customerLookupLoading ? 'Searching...' : 'Search'}
              </Button>
            </div>

            <p className="mt-3 text-sm text-muted-foreground">{customerLookupMessage}</p>

            {customerLookupMatch && (
              <div className="mt-4 rounded-md border bg-background p-3">
                <p className="text-sm font-semibold text-emerald-600">Customer found</p>
                <div className="mt-2 space-y-1 text-sm">
                  <div><span className="text-muted-foreground">Name:</span> {customerLookupMatch.name}</div>
                  <div><span className="text-muted-foreground">Mobile:</span> {customerLookupMatch.phone}</div>
                  <div><span className="text-muted-foreground">Customer ID:</span> {customerLookupMatch.customerCode}</div>
                </div>
                <Button className="mt-3" onClick={() => useSelectedCustomer(customerLookupMatch)}>Continue Billing</Button>
              </div>
            )}

            {customerLookupNotFound && (
              <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <p className="font-medium">Customer not found.</p>
                <div className="mt-3 space-y-3">
                  <div>
                    <Label htmlFor="new-customer-name">Name</Label>
                    <Input
                      id="new-customer-name"
                      value={customerForm.name}
                      onChange={(event) => setCustomerForm((current) => ({ ...current, name: event.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="new-customer-mobile">Mobile</Label>
                    <Input
                      id="new-customer-mobile"
                      value={customerForm.phone}
                      onChange={(event) => setCustomerForm((current) => ({ ...current, phone: event.target.value }))}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => void saveCustomer()}>Save Customer &amp; Continue</Button>
                    <Button variant="outline" onClick={() => useSelectedCustomer({ id: null, name: 'Walk-in Customer', phone: '' })}>Continue as Walk-in</Button>
                  </div>
                </div>
              </div>
            )}

            {!customerLookupMatch && !customerLookupNotFound && (
              <div className="mt-4 flex justify-end">
                <Button variant="outline" onClick={() => useSelectedCustomer({ id: null, name: 'Walk-in Customer', phone: '' })}>Skip / Walk-in</Button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-4">
            <Label htmlFor="posBarcode">Scan or enter barcode</Label>
            <div className="mt-2 flex gap-2">
              <div className="relative flex-1">
                <Barcode className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={barcodeRef}
                  id="posBarcode"
                  className="pl-9 text-lg"
                  placeholder="Scan or enter barcode"
                  value={barcode}
                  onChange={(event) => setBarcode(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      void lookupBarcode();
                    }
                  }}
                />
              </div>
              <Button onClick={() => void lookupBarcode()}>Add</Button>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search product, name, Tamil, SKU..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void searchProducts();
                  }}
                />
              </div>
              <Button variant="outline" onClick={() => void searchProducts()}>Search</Button>
            </div>

            {results.length > 0 && (
              <div className="mt-3 divide-y rounded-md border">
                {results.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    className="flex w-full items-center justify-between p-3 text-left hover:bg-muted"
                    onClick={() => {
                      addProduct(product);
                      setResults([]);
                    }}
                  >
                    <span>
                      <span className="block font-medium">{product.nameEnglish}</span>
                      <span className="text-xs text-muted-foreground">{product.nameTamil || product.sku}</span>
                    </span>
                    <span>₹{product.sellingPrice.toFixed(2)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  {['Product', 'Qty', 'Unit', 'Rate', 'GST', 'Amount', ''].map((heading) => (
                    <th key={heading} className="px-3 py-3 text-left font-medium">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cart.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">No items in cart.</td>
                  </tr>
                ) : (
                  cart.map((line) => (
                    <tr key={line.id} className="border-b last:border-b-0">
                      <td className="px-3 py-3">
                        <div className="font-medium">{line.nameEnglish}</div>
                        <div className="text-xs text-muted-foreground">{line.nameTamil || line.sku}</div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="rounded-md border p-1"
                            onClick={() => updateQuantity(line.id, line.quantity - 1)}
                            aria-label={`Decrease ${line.nameEnglish}`}
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <input
                            className="w-12 rounded-md border px-2 py-1 text-center"
                            value={line.quantity}
                            onChange={(event) => updateQuantity(line.id, Number(event.target.value) || 0)}
                          />
                          <button
                            type="button"
                            className="rounded-md border p-1"
                            onClick={() => updateQuantity(line.id, line.quantity + 1)}
                            aria-label={`Increase ${line.nameEnglish}`}
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-3">{line.unitName || line.unitSymbol || 'PCS'}</td>
                      <td className="px-3 py-3">₹{line.sellingPrice.toFixed(2)}</td>
                      <td className="px-3 py-3">{line.gstPercent}%</td>
                      <td className="px-3 py-3">₹{(line.sellingPrice * line.quantity).toFixed(2)}</td>
                      <td className="px-3 py-3 text-right">
                        <button
                          type="button"
                          className="rounded-md border p-1 text-destructive"
                          onClick={() => setCart((current) => current.filter((item) => item.id !== line.id))}
                          aria-label={`Remove ${line.nameEnglish}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="h-fit rounded-lg border bg-card p-5 xl:sticky xl:top-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Current Bill</h2>
            <span className="text-sm text-muted-foreground">CASH</span>
          </div>

          <div className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between"><span>Items</span><span>{totals.itemCount}</span></div>
            <div className="flex justify-between"><span>Subtotal</span><span>₹{totals.subtotal.toFixed(2)}</span></div>
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="billDiscount">Discount</Label>
              <Input id="billDiscount" className="w-28 text-right" type="number" min="0" step="0.01" value={discount} onChange={(event) => setDiscount(event.target.value)} />
            </div>
            <div className="flex justify-between"><span>Taxable</span><span>₹{totals.taxable.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>CGST</span><span>₹{totals.cgst.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>SGST</span><span>₹{totals.sgst.toFixed(2)}</span></div>
            <div className="border-t pt-4 text-lg font-bold">
              <div className="flex justify-between"><span>Grand Total</span><span>₹{totals.grandTotal.toFixed(2)}</span></div>
            </div>
          </div>

          <div className="mt-6 grid gap-2">
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => setCart([])} disabled={!cart.length}>Clear Cart</Button>
              <Button variant="secondary" onClick={() => void holdCurrentBill()} disabled={!cart.length || processing}>Hold Bill</Button>
            </div>
            <Button size="lg" onClick={openConfirmation} disabled={!cart.length || processing}>Finalize &amp; Print</Button>
          </div>
        </aside>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalize Bill?</DialogTitle>
            <DialogDescription>Items: {totals.itemCount} · Grand Total: ₹{totals.grandTotal.toFixed(2)} · Payment: CASH</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="cashReceived">Cash received</Label>
            <Input id="cashReceived" type="number" min={totals.grandTotal} step="0.01" value={cashReceived} onChange={(event) => setCashReceived(event.target.value)} />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Change</span>
              <span>₹{Math.max(0, Number(cashReceived || 0) - totals.grandTotal).toFixed(2)}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button onClick={() => void finalize()} disabled={processing || Number(cashReceived) < totals.grandTotal}>{processing ? 'Processing...' : 'Complete Payment / Print'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InvoicePreviewDialog open={Boolean(receipt)} onOpenChange={(open) => !open && setReceipt(null)} bill={receipt} completed autoPrint />
    </div>
  );
}