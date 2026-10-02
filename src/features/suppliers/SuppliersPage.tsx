import { useEffect, useState } from 'react';
import { Eye, Pencil, Plus, Search, UserRound, Users, Wallet } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supplierPurchaseService, type PurchaseRecord, type SupplierPayload, type SupplierRecord, type SupplierSummary } from '@/services/supplierPurchaseService';

const blankSupplier: SupplierPayload = {
  name: '', contactPerson: '', phone: '', alternatePhone: '', email: '', gstin: '',
  addressLine1: '', addressLine2: '', city: '', state: '', pincode: '', notes: '', status: 'ACTIVE',
};

const money = (value: number) => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fields: Array<{ key: Exclude<keyof SupplierPayload, 'status' | 'notes'>; label: string; required?: boolean }> = [
  { key: 'name', label: 'Supplier name', required: true },
  { key: 'contactPerson', label: 'Contact person' },
  { key: 'phone', label: 'Phone number', required: true },
  { key: 'alternatePhone', label: 'Alternate phone' },
  { key: 'email', label: 'Email' },
  { key: 'gstin', label: 'GSTIN' },
  { key: 'addressLine1', label: 'Address line 1' },
  { key: 'addressLine2', label: 'Address line 2' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'pincode', label: 'Pincode' },
];

export function SuppliersPage() {
  const { toast } = useToast();
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [summary, setSummary] = useState<SupplierSummary>({ total_suppliers: 0, active_suppliers: 0, total_purchases: 0, outstanding_amount: 0 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<SupplierPayload>(blankSupplier);
  const [saving, setSaving] = useState(false);
  const [viewing, setViewing] = useState<SupplierRecord | null>(null);
  const [supplierPurchases, setSupplierPurchases] = useState<PurchaseRecord[]>([]);

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [rows, totals] = await Promise.all([
        supplierPurchaseService.suppliers(search, status),
        supplierPurchaseService.supplierSummary(),
      ]);
      setSuppliers(rows);
      setSummary(totals);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load suppliers.';
      setLoadError(message);
      toast({ title: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 180);
    return () => window.clearTimeout(timer);
  }, [search, status]);

  const startCreate = () => {
    setEditingId(null);
    setForm(blankSupplier);
    setFormOpen(true);
  };

  const startEdit = (supplier: SupplierRecord) => {
    setEditingId(supplier.id);
    setForm({
      name: supplier.name,
      contactPerson: supplier.contact_person || '',
      phone: supplier.phone || '',
      alternatePhone: supplier.alternate_phone || '',
      email: supplier.email || '',
      gstin: supplier.gstin || '',
      addressLine1: supplier.address_line1 || '',
      addressLine2: supplier.address_line2 || '',
      city: supplier.city || '',
      state: supplier.state || '',
      pincode: supplier.pincode || '',
      notes: supplier.notes || '',
      status: supplier.status,
    });
    setFormOpen(true);
  };

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (editingId) await supplierPurchaseService.updateSupplier(editingId, form);
      else await supplierPurchaseService.createSupplier(form);
      setFormOpen(false);
      toast({ title: editingId ? 'Supplier updated' : 'Supplier created' });
      await load();
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : 'Unable to save supplier.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (supplier: SupplierRecord) => {
    const nextStatus = supplier.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await supplierPurchaseService.setSupplierStatus(supplier.id, nextStatus);
      toast({ title: nextStatus === 'ACTIVE' ? 'Supplier activated' : 'Supplier deactivated' });
      await load();
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : 'Unable to update supplier.', variant: 'destructive' });
    }
  };

  const viewSupplier = async (supplier: SupplierRecord) => {
    try {
      const [profile, purchases] = await Promise.all([
        supplierPurchaseService.supplier(supplier.id),
        supplierPurchaseService.supplierPurchases(supplier.id),
      ]);
      setViewing(profile);
      setSupplierPurchases(purchases);
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : 'Unable to load supplier details.', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader title="Suppliers" description="Manage suppliers and purchase relationships." breadcrumbs={[{ label: 'Suppliers' }]} />
        <Button onClick={startCreate}><Plus className="mr-2 h-4 w-4" />Add Supplier</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Total Suppliers', value: summary.total_suppliers, icon: Users },
          { label: 'Active Suppliers', value: summary.active_suppliers, icon: UserRound },
          { label: 'Total Purchases', value: summary.total_purchases, icon: Search },
          { label: 'Outstanding Amount', value: money(summary.outstanding_amount), icon: Wallet },
        ].map((card) => (
          <div key={card.label} className="flex items-center justify-between rounded-lg border bg-card p-4">
            <div><p className="text-sm text-muted-foreground">{card.label}</p><p className="mt-1 text-xl font-semibold">{card.value}</p></div>
            <card.icon className="h-5 w-5 text-muted-foreground" />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search supplier name, contact, phone, GSTIN..." value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
        <div className="flex gap-1 rounded-md border bg-card p-1" aria-label="Supplier status filter">
          {['ALL', 'ACTIVE', 'INACTIVE'].map((value) => (
            <Button key={value} size="sm" variant={status === value ? 'secondary' : 'ghost'} onClick={() => setStatus(value)}>{value === 'ALL' ? 'All' : value === 'ACTIVE' ? 'Active' : 'Inactive'}</Button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[950px] text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
            <tr><th className="px-4 py-3">Supplier</th><th className="px-4 py-3">Contact person</th><th className="px-4 py-3">Phone</th><th className="px-4 py-3">GSTIN</th><th className="px-4 py-3 text-right">Purchases</th><th className="px-4 py-3 text-right">Outstanding</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Loading suppliers...</td></tr>
              : loadError ? <tr><td colSpan={8} className="px-4 py-8 text-center"><p className="text-destructive">{loadError}</p><Button className="mt-2" variant="outline" onClick={() => void load()}>Retry</Button></td></tr>
              : suppliers.length === 0 ? <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No suppliers found.</td></tr>
                : suppliers.map((supplier) => (
                  <tr key={supplier.id} className="border-b last:border-0">
                    <td className="px-4 py-3"><span className="font-medium">{supplier.name}</span><span className="block text-xs text-muted-foreground">{supplier.supplier_code}</span></td>
                    <td className="px-4 py-3">{supplier.contact_person || '—'}</td>
                    <td className="px-4 py-3">{supplier.phone || '—'}</td>
                    <td className="px-4 py-3">{supplier.gstin || '—'}</td>
                    <td className="px-4 py-3 text-right">{supplier.total_purchases}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{money(supplier.outstanding)}</td>
                    <td className="px-4 py-3"><span className={`rounded-sm px-2 py-1 text-xs ${supplier.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>{supplier.status}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => void viewSupplier(supplier)} aria-label={`View ${supplier.name}`}><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => startEdit(supplier)} aria-label={`Edit ${supplier.name}`}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="outline" size="sm" onClick={() => void changeStatus(supplier)}>{supplier.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</Button>
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle>
            <DialogDescription>Supplier code is assigned automatically.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={(event) => void save(event)}>
            <div className="grid gap-4 sm:grid-cols-2">
              {fields.map((field) => (
                <div className="space-y-2" key={field.key}>
                  <Label htmlFor={`supplier-${field.key}`}>{field.label}{field.required ? ' *' : ''}</Label>
                  <Input id={`supplier-${field.key}`} required={field.required} type={field.key === 'email' ? 'email' : 'text'} value={form[field.key]} onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))} />
                </div>
              ))}
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="supplier-notes">Notes</Label>
                <Textarea id="supplier-notes" rows={3} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplier-status">Status</Label>
                <select id="supplier-status" className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as SupplierPayload['status'] }))}>
                  <option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Supplier'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(viewing)} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader><DialogTitle>{viewing?.name}</DialogTitle><DialogDescription>{viewing?.supplier_code} · {viewing?.status}</DialogDescription></DialogHeader>
          {viewing && <div className="space-y-5">
            <div className="grid gap-3 rounded-md border p-4 sm:grid-cols-2">
              <div><span className="text-xs text-muted-foreground">Contact</span><p>{viewing.contact_person || '—'}</p></div>
              <div><span className="text-xs text-muted-foreground">Phone</span><p>{viewing.phone || '—'}</p></div>
              <div><span className="text-xs text-muted-foreground">Email</span><p>{viewing.email || '—'}</p></div>
              <div><span className="text-xs text-muted-foreground">GSTIN</span><p>{viewing.gstin || '—'}</p></div>
              <div className="sm:col-span-2"><span className="text-xs text-muted-foreground">Address</span><p>{[viewing.address_line1, viewing.address_line2, viewing.city, viewing.state, viewing.pincode].filter(Boolean).join(', ') || '—'}</p></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {[['Purchases', viewing.total_purchases], ['Purchase value', money(viewing.total_purchase_value)], ['Paid', money(viewing.amount_paid)], ['Outstanding', money(viewing.outstanding)], ['Last purchase', viewing.last_purchase_date || '—']].map(([label, value]) => <div key={String(label)} className="rounded-md border p-3"><span className="text-xs text-muted-foreground">{label}</span><p className="mt-1 font-semibold">{value}</p></div>)}
            </div>
            <section>
              <h3 className="mb-2 font-semibold">Purchase history</h3>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full min-w-[520px] text-sm">
                  <thead className="border-b bg-muted/40 text-left"><tr><th className="px-3 py-2">Purchase</th><th className="px-3 py-2">Date</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Payment</th><th className="px-3 py-2 text-right">Total</th></tr></thead>
                  <tbody>{supplierPurchases.length ? supplierPurchases.map((purchase) => <tr key={purchase.id} className="border-b last:border-0"><td className="px-3 py-2 font-medium">{purchase.purchase_number}</td><td className="px-3 py-2">{purchase.purchase_date}</td><td className="px-3 py-2">{purchase.status}</td><td className="px-3 py-2">{purchase.payment_status}</td><td className="px-3 py-2 text-right">{money(purchase.grand_total)}</td></tr>) : <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">No purchases recorded.</td></tr>}</tbody>
                </table>
              </div>
            </section>
          </div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}