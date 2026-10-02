import { useEffect, useState } from 'react';
import { Check, Save, Settings } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { adminService, type StoreSettings } from '@/services/adminService';

const receiptFlags: Array<[keyof StoreSettings['receipt'], string]> = [
  ['showGST', 'Show GST details'],
  ['showCustomerDetails', 'Show customer details'],
  ['showCashier', 'Show cashier'],
  ['showCounter', 'Show counter'],
  ['showBarcode', 'Show product barcodes'],
  ['showQR', 'Show payment QR when configured'],
  ['printTamilProductName', 'Print Tamil product name'],
  ['printEnglishProductName', 'Print English product name'],
];

export function SettingsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try { setSettings(await adminService.storeSettings()); }
    catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Unable to load store settings.';
      setError(message);
      toast({ title: message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const updateStore = (field: keyof StoreSettings, value: string) => {
    setSettings((current) => current ? { ...current, [field]: value } : current);
    setSaved(false);
  };

  const updateAddress = (field: keyof StoreSettings['address'], value: string) => {
    setSettings((current) => current ? { ...current, address: { ...current.address, [field]: value } } : current);
    setSaved(false);
  };

  const updateReceipt = (field: keyof StoreSettings['receipt'], value: string | boolean | number) => {
    setSettings((current) => current ? { ...current, receipt: { ...current.receipt, [field]: value } } : current);
    setSaved(false);
  };

  const updateTax = (field: keyof StoreSettings['tax'], value: number) => {
    setSettings((current) => current ? { ...current, tax: { ...current.tax, [field]: value } } : current);
    setSaved(false);
  };

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      setSettings(await adminService.saveStoreSettings(settings));
      setSaved(true);
      toast({ title: 'Store settings saved' });
    } catch (reason) {
      toast({ title: reason instanceof Error ? reason.message : 'Unable to save store settings.', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  if (loading) return <div className="space-y-6"><PageHeader title="Settings" description="Store configuration and receipt preferences." /><p className="text-sm text-muted-foreground">Loading settings...</p></div>;
  if (error || !settings) return <div className="space-y-6"><PageHeader title="Settings" description="Store configuration and receipt preferences." /><div className="rounded-md border border-destructive/40 p-4 text-sm"><p className="text-destructive">{error || 'Settings unavailable.'}</p><Button className="mt-3" variant="outline" onClick={() => void load()}>Retry</Button></div></div>;

  const storeFields: Array<[keyof Omit<StoreSettings, 'address' | 'receipt' | 'tax'>, string]> = [
    ['name', 'Store name'], ['shortName', 'Short name'], ['phone', 'Phone'], ['alternatePhone', 'Alternate phone'], ['email', 'Email'], ['gstin', 'GSTIN'],
  ];
  const addressFields: Array<[keyof StoreSettings['address'], string]> = [
    ['line1', 'Address line 1'], ['line2', 'Address line 2'], ['area', 'Area'], ['city', 'City'], ['district', 'District'], ['state', 'State'], ['pincode', 'PIN code'], ['country', 'Country'],
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3"><PageHeader title="Settings" description="Store configuration and receipt preferences saved in SQLite." breadcrumbs={[{ label: 'Settings' }]} /><Button onClick={() => void save()} disabled={saving}><Save className="mr-2 h-4 w-4" />{saving ? 'Saving...' : 'Save Settings'}</Button></div>
      <div className="grid gap-5 xl:grid-cols-2">
        <section className="space-y-4 rounded-lg border bg-card p-5">
          <div className="flex items-center gap-2"><Settings className="h-5 w-5 text-muted-foreground" /><h2 className="font-semibold">Store information</h2></div>
          <div className="grid gap-3 sm:grid-cols-2">{storeFields.map(([field, label]) => <div className="space-y-2" key={field}><Label htmlFor={`setting-${field}`}>{label}</Label><Input id={`setting-${field}`} type={field === 'email' ? 'email' : 'text'} value={settings[field]} onChange={(event) => updateStore(field, event.target.value)} /></div>)}</div>
          <div className="grid gap-3 sm:grid-cols-2">{addressFields.map(([field, label]) => <div className="space-y-2" key={field}><Label htmlFor={`address-${field}`}>{label}</Label><Input id={`address-${field}`} value={settings.address[field]} onChange={(event) => updateAddress(field, event.target.value)} /></div>)}</div>
        </section>

        <section className="space-y-4 rounded-lg border bg-card p-5">
          <h2 className="font-semibold">Receipt settings</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="receipt-footer">Receipt footer</Label><Input id="receipt-footer" value={settings.receipt.footerNote} onChange={(event) => updateReceipt('footerNote', event.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="receipt-copies">Number of copies</Label><select id="receipt-copies" className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={settings.receipt.copies} onChange={(event) => updateReceipt('copies', Number(event.target.value))}><option value={1}>1 copy</option><option value={2}>2 copies</option><option value={3}>3 copies</option></select></div>
            <div className="space-y-2"><Label htmlFor="receipt-paper">Receipt paper</Label><select id="receipt-paper" className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={settings.receipt.paperSize} onChange={(event) => updateReceipt('paperSize', event.target.value)}><option value="58mm">58mm</option><option value="80mm">80mm</option><option value="A4">A4</option></select></div>
            <div className="space-y-2"><Label htmlFor="receipt-copy-one">Copy 1 label</Label><Input id="receipt-copy-one" value={settings.receipt.copy1Label} onChange={(event) => updateReceipt('copy1Label', event.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="receipt-copy-two">Copy 2 label</Label><Input id="receipt-copy-two" value={settings.receipt.copy2Label} onChange={(event) => updateReceipt('copy2Label', event.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="receipt-counter">Counter</Label><Input id="receipt-counter" value={settings.receipt.counter} onChange={(event) => updateReceipt('counter', event.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="upi-id">UPI ID (optional QR source)</Label><Input id="upi-id" value={settings.receipt.upiId} onChange={(event) => updateReceipt('upiId', event.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="receipt-printer">Receipt printer name</Label><Input id="receipt-printer" placeholder="Browser/system print" value={settings.receipt.receiptPrinter} onChange={(event) => updateReceipt('receiptPrinter', event.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="label-printer">Barcode label printer name</Label><Input id="label-printer" placeholder="Browser/system print" value={settings.receipt.labelPrinter} onChange={(event) => updateReceipt('labelPrinter', event.target.value)} /></div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">{receiptFlags.map(([field, label]) => <label key={field} className="flex items-center gap-3 text-sm"><Checkbox checked={Boolean(settings.receipt[field])} onCheckedChange={(checked) => updateReceipt(field, checked === true)} />{label}</label>)}</div>
          <p className="text-xs text-muted-foreground">Printer names are saved for reference. Printing uses the browser/system print dialog; product GST remains controlled by Product Master.</p>
        </section>
      </div>

      <section className="max-w-xl space-y-4 rounded-lg border bg-card p-5">
        <h2 className="font-semibold">Tax defaults</h2>
        <p className="text-sm text-muted-foreground">Product-level GST remains authoritative for sales and purchases. These values are store defaults only.</p>
        <div className="grid gap-3 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="default-cgst">Default CGST %</Label><Input id="default-cgst" type="number" min="0" max="100" step="0.01" value={settings.tax.cgst} onChange={(event) => updateTax('cgst', Number(event.target.value))} /></div><div className="space-y-2"><Label htmlFor="default-sgst">Default SGST %</Label><Input id="default-sgst" type="number" min="0" max="100" step="0.01" value={settings.tax.sgst} onChange={(event) => updateTax('sgst', Number(event.target.value))} /></div></div>
        {saved && <p className="inline-flex items-center gap-1 text-sm text-emerald-700"><Check className="h-4 w-4" />Saved to database</p>}
      </section>
    </div>
  );
}