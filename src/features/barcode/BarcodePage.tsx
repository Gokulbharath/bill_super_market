import { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import { Clock3, DollarSign, Eye, Loader2, Plus, Printer, RotateCcw, Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { productService, type PriceHistoryEntry, type Product } from '@/services/productService';

const labelConfig = { width: '58mm', barcodeHeight: 58, barcodeWidth: 1.6 };

function BarcodeGraphic({ value }: { value: string }) {
  const ref = useRef<SVGSVGElement | null>(null);
  useEffect(() => {
    if (ref.current && value) JsBarcode(ref.current, value, { format: 'CODE128', displayValue: false, height: labelConfig.barcodeHeight, width: labelConfig.barcodeWidth, margin: 0 });
  }, [value]);
  return <svg ref={ref} className="thermal-barcode" aria-label={`CODE-128 barcode ${value}`} />;
}

export function BarcodePage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Product | null>(null);
  const [copies, setCopies] = useState(1);
  const [priceProduct, setPriceProduct] = useState<Product | null>(null);
  const [priceForm, setPriceForm] = useState({ purchasePrice: '', mrp: '', sellingPrice: '', reason: '' });
  const [priceSaving, setPriceSaving] = useState(false);
  const [priceUpdatedProduct, setPriceUpdatedProduct] = useState<Product | null>(null);
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [history, setHistory] = useState<PriceHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const load = async (term = search) => {
    setLoading(true);
    try { setProducts(await productService.listShopProducts(term)); }
    catch { toast({ title: 'Unable to load shop products.', description: 'Check that the local POS server is running.', variant: 'destructive' }); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(''); }, []);

  const openLabel = async (product: Product) => {
    try { setSelected(await productService.get(product.id)); }
    catch { toast({ title: 'Unable to load the current product price.', variant: 'destructive' }); }
  };

  const openPrice = (product: Product) => {
    setPriceProduct(product);
    setPriceForm({ purchasePrice: String(product.purchasePrice), mrp: String(product.mrp), sellingPrice: String(product.sellingPrice), reason: '' });
  };

  const savePrice = async () => {
    if (!priceProduct) return;
    const purchasePrice = Number(priceForm.purchasePrice);
    const mrp = Number(priceForm.mrp);
    const sellingPrice = Number(priceForm.sellingPrice);
    if (![purchasePrice, mrp, sellingPrice].every((value) => Number.isFinite(value) && value >= 0)) { toast({ title: 'Prices must be zero or greater.', variant: 'destructive' }); return; }
    if (sellingPrice > mrp) { toast({ title: 'Selling price cannot be greater than MRP.', variant: 'destructive' }); return; }
    setPriceSaving(true);
    try {
      const updated = await productService.updatePrice(priceProduct.id, { purchasePrice, mrp, sellingPrice, reason: priceForm.reason });
      setProducts((current) => current.map((item) => item.id === updated.id ? updated : item));
      setPriceProduct(null);
      setPriceUpdatedProduct(updated);
      toast({ title: 'Price updated successfully', description: `${updated.nameEnglish} · ${updated.identifierValue} · ₹${updated.sellingPrice.toFixed(2)}` });
    } catch (error) { toast({ title: error instanceof Error ? error.message : 'Unable to update product price.', variant: 'destructive' }); }
    finally { setPriceSaving(false); }
  };

  const openHistory = async (product: Product) => {
    setHistoryProduct(product); setHistoryLoading(true);
    try { setHistory(await productService.priceHistory(product.id)); }
    catch { toast({ title: 'Unable to load price history.', variant: 'destructive' }); }
    finally { setHistoryLoading(false); }
  };

  return <div className="space-y-6">
    <PageHeader title="Barcode Management" description="Create, print and reprint labels for Sree Super Market shop products." breadcrumbs={[{ label: 'Barcode' }]} actions={<Button onClick={() => navigate('/products')}><Plus className="mr-2 h-4 w-4" /> Create Shop Product</Button>} />
    <div className="flex flex-col gap-3 sm:flex-row"><div className="relative max-w-md flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Search product, barcode, SKU..." value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void load(); }} /></div><Button variant="outline" onClick={() => void load()}>Search</Button></div>
    <div className="overflow-x-auto rounded-lg border bg-card"><table className="w-full text-sm"><thead className="border-b bg-muted/50"><tr>{['Product', 'Barcode', 'Category', 'Unit', 'Price', 'Label status', 'Actions'].map((heading) => <th key={heading} className="whitespace-nowrap px-4 py-3 text-left font-medium">{heading}</th>)}</tr></thead><tbody>{loading ? <tr><td colSpan={7} className="p-8 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr> : products.length === 0 ? <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No shop products found.</td></tr> : products.map((product) => <tr key={product.id} className="border-b last:border-0"><td className="px-4 py-3"><div className="font-medium">{product.nameEnglish}</div>{product.nameTamil && <div className="text-xs text-muted-foreground">{product.nameTamil}</div>}</td><td className="px-4 py-3 font-mono">{product.identifierValue}</td><td className="px-4 py-3">{product.categoryName || '—'}</td><td className="px-4 py-3">{product.unitName || '—'}</td><td className="px-4 py-3">₹{product.sellingPrice.toFixed(2)}</td><td className="px-4 py-3"><Badge variant="secondary">Assigned</Badge></td><td className="px-4 py-3"><div className="flex gap-1"><Button size="icon" variant="ghost" title="View label" onClick={() => void openLabel(product)}><Eye className="h-4 w-4" /></Button><Button size="icon" variant="ghost" title="Edit price" onClick={() => openPrice(product)}><DollarSign className="h-4 w-4" /></Button><Button size="icon" variant="ghost" title="Print label" onClick={() => void openLabel(product)}><Printer className="h-4 w-4" /></Button><Button size="icon" variant="ghost" title="Reprint same barcode" onClick={() => void openLabel(product)}><RotateCcw className="h-4 w-4" /></Button><Button size="icon" variant="ghost" title="Price history" onClick={() => void openHistory(product)}><Clock3 className="h-4 w-4" /></Button></div></td></tr>)}</tbody></table></div>

    {selected && <Dialog open onOpenChange={(open) => !open && setSelected(null)}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>Label Preview</DialogTitle><DialogDescription>CODE-128 · {selected.identifierValue}</DialogDescription></DialogHeader><div className="thermal-label print-label" style={{ width: labelConfig.width }}><p className="thermal-store">SREE SUPER MARKET</p><p className="thermal-product">{selected.nameEnglish}</p>{selected.nameTamil && <p className="thermal-tamil">{selected.nameTamil}</p>}<p className="thermal-price">₹{selected.sellingPrice.toFixed(2)} / {selected.unitSymbol || selected.unitName || 'UNIT'}</p>{Array.from({ length: Math.max(1, Math.min(copies, 50)) }).map((_, index) => <div key={index} className="barcode-copy"><div className="thermal-barcode-wrap"><BarcodeGraphic value={selected.identifierValue || ''} /></div><p className="thermal-value">{selected.identifierValue}</p></div>)}</div><div className="flex items-end gap-3"><div className="w-24"><Label htmlFor="copies">Copies</Label><Input id="copies" type="number" min={1} max={50} value={copies} onChange={(event) => setCopies(Math.max(1, Number(event.target.value) || 1))} /></div><Button className="flex-1" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Print</Button></div></DialogContent></Dialog>}

    <Dialog open={Boolean(priceUpdatedProduct)} onOpenChange={(open) => !open && setPriceUpdatedProduct(null)}><DialogContent><DialogHeader><DialogTitle>Price updated successfully</DialogTitle><DialogDescription>{priceUpdatedProduct?.nameEnglish} · Barcode {priceUpdatedProduct?.identifierValue} · New Selling Price ₹{priceUpdatedProduct?.sellingPrice.toFixed(2)}</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setPriceUpdatedProduct(null)}>Close</Button><Button onClick={() => { if (priceUpdatedProduct) { setSelected(priceUpdatedProduct); setPriceUpdatedProduct(null); } }}><Printer className="mr-2 h-4 w-4" /> Print Updated Label</Button></DialogFooter></DialogContent></Dialog>

    <Dialog open={Boolean(priceProduct)} onOpenChange={(open) => !open && setPriceProduct(null)}><DialogContent><DialogHeader><DialogTitle>Edit Product Price</DialogTitle><DialogDescription>{priceProduct?.nameEnglish} · Barcode {priceProduct?.identifierValue}</DialogDescription></DialogHeader><div className="grid gap-4 sm:grid-cols-3"><div><Label htmlFor="pricePurchase">Purchase Price</Label><Input id="pricePurchase" type="number" min="0" step="0.01" value={priceForm.purchasePrice} onChange={(event) => setPriceForm({ ...priceForm, purchasePrice: event.target.value })} /></div><div><Label htmlFor="priceMrp">MRP</Label><Input id="priceMrp" type="number" min="0" step="0.01" value={priceForm.mrp} onChange={(event) => setPriceForm({ ...priceForm, mrp: event.target.value })} /></div><div><Label htmlFor="priceSelling">Selling Price</Label><Input id="priceSelling" type="number" min="0" step="0.01" value={priceForm.sellingPrice} onChange={(event) => setPriceForm({ ...priceForm, sellingPrice: event.target.value })} /></div></div><div><Label htmlFor="priceReason">Reason</Label><Textarea id="priceReason" placeholder="Optional" value={priceForm.reason} onChange={(event) => setPriceForm({ ...priceForm, reason: event.target.value })} /></div><DialogFooter><Button variant="outline" onClick={() => setPriceProduct(null)}>Cancel</Button><Button onClick={() => void savePrice()} disabled={priceSaving}>{priceSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Update Price</Button></DialogFooter></DialogContent></Dialog>

    <Dialog open={Boolean(historyProduct)} onOpenChange={(open) => !open && setHistoryProduct(null)}><DialogContent><DialogHeader><DialogTitle>Price History</DialogTitle><DialogDescription>{historyProduct?.nameEnglish} · {historyProduct?.identifierValue}</DialogDescription></DialogHeader>{historyLoading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : history.length === 0 ? <p className="text-sm text-muted-foreground">No price changes recorded.</p> : <div className="max-h-80 space-y-3 overflow-y-auto">{history.map((entry) => <div key={entry.id} className="rounded-md border p-3 text-sm"><div className="flex justify-between"><span>{new Date(entry.changedAt).toLocaleString()}</span><span>{entry.changedBy}</span></div><p className="mt-1">₹{entry.oldSellingPrice.toFixed(2)} → ₹{entry.newSellingPrice.toFixed(2)} <span className="text-muted-foreground">(MRP ₹{entry.oldMrp.toFixed(2)} → ₹{entry.newMrp.toFixed(2)})</span></p>{entry.reason && <p className="mt-1 text-muted-foreground">{entry.reason}</p>}</div>)}</div>}<DialogFooter><Button variant="outline" onClick={() => setHistoryProduct(null)}>Close</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
