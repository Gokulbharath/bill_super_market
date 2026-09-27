import { useEffect, useMemo, useRef, useState } from 'react';
import { Barcode, CheckCircle2, Minus, Plus, Printer, Search, ShoppingCart, Trash2, X } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { productService, type BillRecord, type PosProduct } from '@/services/productService';

type CartLine = PosProduct & { quantity: number };

function lineTax(line: CartLine) { const total = line.sellingPrice * line.quantity; return (total / (1 + line.gstPercent / 100)) * line.gstPercent / 100; }

export function PosPage() {
  const { toast } = useToast();
  const barcodeRef = useRef<HTMLInputElement | null>(null);
  const [barcode, setBarcode] = useState('');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<PosProduct[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discount, setDiscount] = useState('0');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [receipt, setReceipt] = useState<BillRecord | null>(null);
  const [processing, setProcessing] = useState(false);

  const addProduct = (product: PosProduct) => {
    const existing = cart.find((line) => line.id === product.id);
    const nextQuantity = (existing?.quantity || 0) + 1;
    if (product.currentStock < nextQuantity) { toast({ title: 'Insufficient stock.', description: `Available: ${product.currentStock}`, variant: 'destructive' }); return; }
    setCart((current) => existing ? current.map((line) => line.id === product.id ? { ...line, quantity: nextQuantity } : line) : [...current, { ...product, quantity: 1 }]);
    setBarcode(''); barcodeRef.current?.focus();
  };

  const lookupBarcode = async () => {
    const value = barcode.trim(); if (!value) return;
    try { const product = await productService.posLookup(value); addProduct(product); }
    catch { toast({ title: 'Product not found', description: `Barcode: ${value}`, variant: 'destructive' }); setBarcode(''); barcodeRef.current?.focus(); }
  };

  const updateQuantity = (id: number, quantity: number) => {
    const line = cart.find((item) => item.id === id); if (!line) return;
    if (quantity <= 0) { setCart((current) => current.filter((item) => item.id !== id)); return; }
    if (quantity > line.currentStock) { toast({ title: 'Insufficient stock.', description: `Available: ${line.currentStock}`, variant: 'destructive' }); return; }
    setCart((current) => current.map((item) => item.id === id ? { ...item, quantity } : item));
  };

  const totals = useMemo(() => {
    const subtotal = cart.reduce((sum, line) => sum + line.sellingPrice * line.quantity, 0);
    const discountValue = Math.min(Math.max(Number(discount) || 0, 0), subtotal);
    const taxable = subtotal - discountValue;
    const tax = cart.reduce((sum, line) => sum + lineTax(line), 0) * (taxable / Math.max(subtotal, 1));
    const cgst = tax / 2;
    return { subtotal, discount: discountValue, taxable, cgst, sgst: tax - cgst, grandTotal: taxable + tax, itemCount: cart.reduce((sum, line) => sum + line.quantity, 0) };
  }, [cart, discount]);

  const searchProducts = async () => { if (!search.trim()) { setResults([]); return; } try { setResults(await productService.posSearch(search.trim())); } catch { toast({ title: 'Product search unavailable.', variant: 'destructive' }); } };
  const finalize = async () => {
    setProcessing(true);
    try { const completed = await productService.finalizeBill({ items: cart.map((line) => ({ productId: line.id, quantity: line.quantity })), discount: totals.discount }); setReceipt(completed); setCart([]); setDiscount('0'); setConfirmOpen(false); toast({ title: 'Bill completed', description: completed.bill_number }); }
    catch (error) { toast({ title: error instanceof Error ? error.message : 'Unable to finalize bill.', variant: 'destructive' }); }
    finally { setProcessing(false); }
  };

  useEffect(() => { barcodeRef.current?.focus(); const handler = (event: KeyboardEvent) => { if (event.key === 'F2') { event.preventDefault(); barcodeRef.current?.focus(); } if (event.key === 'F8' && cart.length) { event.preventDefault(); setConfirmOpen(true); } }; window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler); }, [cart.length]);

  return <div className="space-y-6">
    <PageHeader title="POS Billing" description="Fast barcode billing for Sree Super Market." breadcrumbs={[{ label: 'POS Billing' }]} />
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
  <div className="space-y-4"><div className="rounded-lg border bg-card p-4"><Label htmlFor="posBarcode">Scan or enter barcode</Label><div className="mt-2 flex gap-2"><div className="relative flex-1"><Barcode className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input ref={barcodeRef} id="posBarcode" className="pl-9 text-lg" placeholder="Scan or enter barcode" value={barcode} onChange={(event) => setBarcode(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void lookupBarcode(); } }} /></div><Button onClick={() => void lookupBarcode()}>Add</Button></div></div><div className="rounded-lg border bg-card p-4"><div className="flex gap-2"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Search product, name, Tamil, SKU..." value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void searchProducts(); }} /></div><Button variant="outline" onClick={() => void searchProducts()}>Search</Button></div>{results.length > 0 && <div className="mt-3 divide-y rounded-md border">{results.map((product) => <button key={product.id} className="flex w-full items-center justify-between p-3 text-left hover:bg-muted" onClick={() => { addProduct(product); setResults([]); }}><span><span className="block font-medium">{product.nameEnglish}</span><span className="text-xs text-muted-foreground">{product.nameTamil || product.sku}</span></span><span>₹{product.sellingPrice.toFixed(2)}</span></button>)}</div>}</div><div className="overflow-x-auto rounded-lg border bg-card"><table className="w-full text-sm"><thead className="border-b bg-muted/50"><tr>{['Product', 'Qty', 'Unit', 'Rate', 'GST', 'Amount', ''].map((heading) => <th key={heading} className="px-3 py-3 text-left font-medium">{heading}</th>)}</tr></thead><tbody>{cart.length === 0 ? <tr><td colSpan={7} className="p-16 text-center text-muted-foreground"><ShoppingCart className="mx-auto mb-3 h-10 w-10" /><p className="font-medium">START BILLING</p><p>Scan a barcode or search for a product.</p></td></tr> : cart.map((line) => <tr key={line.id} className="border-b"><td className="px-3 py-3"><div className="font-medium">{line.nameEnglish}</div>{line.nameTamil && <div className="text-xs text-muted-foreground">{line.nameTamil}</div>}</td><td className="px-3 py-3"><div className="flex items-center gap-1"><Button size="icon" variant="outline" onClick={() => updateQuantity(line.id, line.quantity - 1)}><Minus className="h-3 w-3" /></Button><Input className="w-16 text-center" type="number" min="1" step={line.unitSymbol === 'KG' || line.unitSymbol === 'L' ? '0.01' : '1'} value={line.quantity} onChange={(event) => updateQuantity(line.id, Number(event.target.value))} /><Button size="icon" variant="outline" onClick={() => updateQuantity(line.id, line.quantity + 1)}><Plus className="h-3 w-3" /></Button></div></td><td className="px-3 py-3">{line.unitSymbol || line.unitName || 'UNIT'}</td><td className="px-3 py-3">₹{line.sellingPrice.toFixed(2)}</td><td className="px-3 py-3">{line.gstPercent}%</td><td className="px-3 py-3">₹{(line.sellingPrice * line.quantity).toFixed(2)}</td><td className="px-3 py-3"><Button size="icon" variant="ghost" onClick={() => updateQuantity(line.id, 0)}><Trash2 className="h-4 w-4" /></Button></td></tr>)}</tbody></table></div></div>
  <aside className="h-fit rounded-lg border bg-card p-5 xl:sticky xl:top-4"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Current Bill</h2><span className="text-sm text-muted-foreground">CASH</span></div><div className="mt-5 space-y-3 text-sm"><div className="flex justify-between"><span>Items</span><span>{totals.itemCount}</span></div><div className="flex justify-between"><span>Subtotal</span><span>₹{totals.subtotal.toFixed(2)}</span></div><div className="flex items-center justify-between"><Label htmlFor="billDiscount">Discount</Label><Input id="billDiscount" className="w-28 text-right" type="number" min="0" step="0.01" value={discount} onChange={(event) => setDiscount(event.target.value)} /></div><div className="flex justify-between"><span>Taxable</span><span>₹{totals.taxable.toFixed(2)}</span></div><div className="flex justify-between"><span>CGST</span><span>₹{totals.cgst.toFixed(2)}</span></div><div className="flex justify-between"><span>SGST</span><span>₹{totals.sgst.toFixed(2)}</span></div><div className="border-t pt-4 text-lg font-bold"><div className="flex justify-between"><span>Grand Total</span><span>₹{totals.grandTotal.toFixed(2)}</span></div></div></div><div className="mt-6 grid gap-2"><Button variant="outline" onClick={() => setCart([])} disabled={!cart.length}>Clear Cart</Button><Button size="lg" onClick={() => setConfirmOpen(true)} disabled={!cart.length || processing}>Finalize & Print</Button></div></aside>
    </div>
    <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}><DialogContent><DialogHeader><DialogTitle>Finalize Bill?</DialogTitle><DialogDescription>Items: {totals.itemCount} · Grand Total: ₹{totals.grandTotal.toFixed(2)} · Payment: CASH</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button><Button onClick={() => void finalize()} disabled={processing}>{processing ? 'Processing...' : 'Finalize & Print'}</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={Boolean(receipt)} onOpenChange={(open) => !open && setReceipt(null)}><DialogContent className="max-w-md"><DialogHeader><DialogTitle><CheckCircle2 className="mr-2 inline h-5 w-5 text-emerald-600" /> Bill Completed</DialogTitle><DialogDescription>{receipt?.bill_number} · ₹{Number(receipt?.grand_total || 0).toFixed(2)} · Two copies</DialogDescription></DialogHeader><div className="receipt-preview print-receipt space-y-3 text-center text-sm"><p className="font-bold tracking-wide">SREE SUPER MARKET</p><p>Siruvani Main Road<br />Alandurai, Coimbatore - 641101<br />Tamil Nadu, India</p><p className="border-y py-2">Bill: {receipt?.bill_number}<br />Payment: CASH</p>{receipt?.items?.map((item) => <div key={String(item.id)} className="flex justify-between text-left"><span>{String(item.product_name_snapshot)} × {String(item.quantity)}</span><span>₹{Number(item.line_total).toFixed(2)}</span></div>)}<p className="border-t pt-2 text-lg font-bold">Grand Total ₹{Number(receipt?.grand_total || 0).toFixed(2)}</p><p className="copy-label">CASHIER COPY / DELIVERY COPY</p></div><Button onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Print 2 Copies</Button></DialogContent></Dialog>
    {receipt && <div className="receipt-print-copies">{['CASHIER COPY', 'DELIVERY COPY'].map((label) => <div key={label} className="receipt-print-copy"><p className="font-bold tracking-wide">SREE SUPER MARKET</p><p>Siruvani Main Road<br />Alandurai, Coimbatore - 641101<br />Tamil Nadu, India</p><p className="border-y py-2">Bill: {receipt.bill_number}<br />Payment: CASH</p>{receipt.items?.map((item) => <div key={String(item.id)} className="flex justify-between text-left"><span>{String(item.product_name_snapshot)} × {String(item.quantity)}</span><span>₹{Number(item.line_total).toFixed(2)}</span></div>)}<p className="border-t pt-2 text-lg font-bold">Grand Total ₹{Number(receipt.grand_total).toFixed(2)}</p><p>{label}</p></div>)}</div>}
  </div>;
}
