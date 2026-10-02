import { useEffect, useState } from 'react';
import { Eye, Printer, Search } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { productService, type BillRecord } from '@/services/productService';
import { InvoicePreviewDialog } from './InvoicePreviewDialog';

function billDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' });
}

export function RecentBillsPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [bills, setBills] = useState<BillRecord[]>([]);
  const [selectedBill, setSelectedBill] = useState<BillRecord | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [autoPrint, setAutoPrint] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadBills = async (query = '') => {
    setLoading(true);
    try {
      setBills(await productService.bills(query));
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : 'Unable to load recent bills.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const openBill = async (id: number, reprint = false) => {
    try {
      const bill = await productService.bill(id);
      setSelectedBill(bill);
      setAutoPrint(reprint);
      setPreviewOpen(true);
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : 'Unable to load invoice.', variant: 'destructive' });
    }
  };

  useEffect(() => {
    void loadBills();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Recent Bills" description="View and reprint completed invoices." breadcrumbs={[{ label: 'POS Billing', href: '/pos' }, { label: 'Recent Bills' }]} />
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" value={search} placeholder="Search invoice number" onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && void loadBills(search.trim())} />
        </div>
        <Button variant="outline" onClick={() => void loadBills(search.trim())}>Search</Button>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
            <tr><th className="px-4 py-3">Invoice</th><th className="px-4 py-3">Date / Time</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Cashier</th><th className="px-4 py-3">Payment</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3 text-right">Actions</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Loading bills...</td></tr>
            ) : bills.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No completed bills found.</td></tr>
            ) : bills.map((bill) => (
              <tr key={bill.id} className="border-b last:border-0">
                <td className="px-4 py-3 font-medium">{bill.bill_number}</td>
                <td className="px-4 py-3">{billDate(bill.created_at || bill.bill_date)}</td>
                <td className="px-4 py-3">{bill.customer_name_snapshot || bill.customer_name || 'Walk-in Customer'}</td>
                <td className="px-4 py-3">{bill.cashier_name_snapshot || bill.cashier_id}</td>
                <td className="px-4 py-3">{bill.payment_method}</td>
                <td className="px-4 py-3 text-right tabular-nums">₹{Number(bill.grand_total).toFixed(2)}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => void openBill(bill.id)}><Eye className="mr-2 h-4 w-4" />View</Button>
                    <Button variant="ghost" size="sm" onClick={() => void openBill(bill.id, true)} aria-label={`Reprint ${bill.bill_number}`}><Printer className="h-4 w-4" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <InvoicePreviewDialog
        open={previewOpen}
        onOpenChange={(open) => {
          setPreviewOpen(open);
          if (!open) setAutoPrint(false);
        }}
        bill={selectedBill}
        autoPrint={autoPrint}
      />
    </div>
  );
}