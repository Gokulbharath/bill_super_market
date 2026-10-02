import { useEffect, useState } from 'react';
import { Eye, Play, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { adminService, type HeldBillRecord } from '@/services/adminService';
import type { PosProduct } from '@/services/productService';

type HeldLine = PosProduct & { quantity: number };

function heldTotal(held: HeldBillRecord) {
  const subtotal = (held.items as HeldLine[]).reduce((sum, item) => sum + item.sellingPrice * item.quantity, 0);
  const discount = Math.min(Math.max(Number(held.discount || 0), 0), subtotal);
  const taxableFactor = subtotal > 0 ? (subtotal - discount) / subtotal : 0;
  const tax = (held.items as HeldLine[]).reduce((sum, item) => {
    const gross = item.sellingPrice * item.quantity * taxableFactor;
    return sum + gross - gross / (1 + item.gstPercent / 100);
  }, 0);
  return Math.round((subtotal - discount + tax + Number.EPSILON) * 100) / 100;
}

function money(amount: number) {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function HeldBillsPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [heldBills, setHeldBills] = useState<HeldBillRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewing, setViewing] = useState<HeldBillRecord | null>(null);
  const [deleting, setDeleting] = useState<HeldBillRecord | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try { setHeldBills(await adminService.heldBills()); }
    catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Unable to load held bills.';
      setError(message);
      toast({ title: message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const resume = async (held: HeldBillRecord) => {
    try {
      const current = await adminService.heldBill(held.id);
      navigate('/pos', { state: { heldBill: current } });
    } catch (reason) {
      toast({ title: reason instanceof Error ? reason.message : 'Unable to resume held bill.', variant: 'destructive' });
    }
  };

  const remove = async () => {
    if (!deleting) return;
    try {
      await adminService.deleteHeldBill(deleting.id);
      toast({ title: 'Held bill deleted', description: deleting.hold_number });
      setDeleting(null);
      await load();
    } catch (reason) {
      toast({ title: reason instanceof Error ? reason.message : 'Unable to delete held bill.', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Held Bills" description="Resume saved carts without affecting stock or sales." breadcrumbs={[{ label: 'POS Billing', href: '/pos' }, { label: 'Held Bills' }]} />
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3">Hold ID</th><th className="px-4 py-3">Date / Time</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3 text-right">Items</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3">Cashier</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Loading held bills...</td></tr>
              : error ? <tr><td colSpan={7} className="px-4 py-8 text-center"><p className="text-destructive">{error}</p><Button className="mt-2" variant="outline" onClick={() => void load()}>Retry</Button></td></tr>
                : heldBills.length === 0 ? <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No held bills found.</td></tr>
                  : heldBills.map((held) => <tr key={held.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{held.hold_number}</td><td className="px-4 py-3">{new Date(held.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</td><td className="px-4 py-3">{held.customer?.name || 'Walk-in Customer'}</td><td className="px-4 py-3 text-right">{held.item_count}</td><td className="px-4 py-3 text-right">{money(heldTotal(held))}</td><td className="px-4 py-3">{held.cashierName || held.cashier_id}</td>
                    <td className="px-4 py-3"><div className="flex justify-end gap-1"><Button variant="ghost" size="sm" onClick={() => setViewing(held)} aria-label={`View ${held.hold_number}`}><Eye className="h-4 w-4" /></Button><Button size="sm" onClick={() => void resume(held)}><Play className="mr-2 h-4 w-4" />Resume</Button><Button variant="ghost" size="sm" onClick={() => setDeleting(held)} aria-label={`Delete ${held.hold_number}`}><Trash2 className="h-4 w-4" /></Button></div></td>
                  </tr>)}
          </tbody>
        </table>
      </div>

      <Dialog open={Boolean(viewing)} onOpenChange={(open) => !open && setViewing(null)}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>{viewing?.hold_number}</DialogTitle><DialogDescription>{viewing?.customer?.name || 'Walk-in Customer'} · {viewing?.created_at}</DialogDescription></DialogHeader>
        <div className="space-y-2">{(viewing?.items as HeldLine[] | undefined)?.map((item) => <div key={item.id} className="flex justify-between gap-3 border-b py-2 text-sm"><span>{item.nameEnglish} × {item.quantity}</span><span>{money(item.sellingPrice * item.quantity)}</span></div>)}<div className="flex justify-between border-t pt-2 font-semibold"><span>Held Total</span><span>{viewing ? money(heldTotal(viewing)) : '—'}</span></div>{viewing?.notes && <p className="text-sm text-muted-foreground">{viewing.notes}</p>}</div>
        <DialogFooter><Button variant="outline" onClick={() => setViewing(null)}>Close</Button>{viewing && <Button onClick={() => void resume(viewing)}><Play className="mr-2 h-4 w-4" />Resume Bill</Button>}</DialogFooter>
      </DialogContent></Dialog>

      <Dialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}><DialogContent><DialogHeader><DialogTitle>Delete Held Bill?</DialogTitle><DialogDescription>This only deletes the saved cart. Stock, sales, and payments are not changed.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setDeleting(null)}>Keep Bill</Button><Button variant="destructive" onClick={() => void remove()}>Delete Held Bill</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}