import { useEffect, useState } from 'react';
import { Eye, Search, UserRound } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { productService, type CustomerRecord } from '@/services/productService';

export function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<CustomerRecord | null>(null);
  const [customerBills, setCustomerBills] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(false);

  const fetchCustomers = async (query = '') => {
    setLoading(true);
    try {
      const data = await productService.customers(query);
      setCustomers(data);
    } finally {
      setLoading(false);
    }
  };

  const openCustomer = async (customer: CustomerRecord) => {
    const bills = await productService.customerBills(customer.id);
    setSelected(customer);
    setCustomerBills(bills);
  };

  useEffect(() => {
    void fetchCustomers();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Customers" description="Manage customer records and billing history." breadcrumbs={[{ label: 'Customers' }]} />
      <div className="rounded-lg border bg-card p-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by name, mobile, or ID"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void fetchCustomers(search.trim());
              }}
            />
          </div>
          <Button onClick={() => void fetchCustomers(search.trim())}>Search</Button>
        </div>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="grid grid-cols-6 border-b bg-muted/40 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <span>Customer ID</span>
          <span>Name</span>
          <span>Mobile</span>
          <span>Status</span>
          <span>Created</span>
          <span className="text-right">Actions</span>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading customer records...</div>
        ) : customers.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">No customers found.</div>
        ) : (
          customers.map((customer) => (
            <div key={customer.id} className="grid grid-cols-6 items-center gap-2 border-b px-4 py-3 text-sm last:border-b-0">
              <span className="font-medium">{customer.customer_code}</span>
              <span>{customer.name}</span>
              <span>{customer.phone}</span>
              <span>{customer.status}</span>
              <span>{new Date(customer.created_at).toLocaleDateString('en-IN')}</span>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => void openCustomer(customer)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserRound className="h-5 w-5" /> {selected?.name}
            </DialogTitle>
            <DialogDescription>
              {selected?.customer_code} · {selected?.phone}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3 rounded-md border p-3">
              <div>
                <span className="text-muted-foreground">Customer ID</span>
                <div className="font-medium">{selected?.customer_code}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Status</span>
                <div className="font-medium">{selected?.status}</div>
              </div>
            </div>
            <div className="rounded-md border p-3">
              <div className="mb-2 font-medium">Recent bills</div>
              {customerBills.length === 0 ? (
                <div className="text-muted-foreground">No bills recorded yet.</div>
              ) : (
                <div className="space-y-2">
                  {customerBills.map((bill) => (
                    <div key={String(bill.id)} className="flex items-center justify-between border-b pb-2 last:border-b-0 last:pb-0">
                      <div>
                        <div className="font-medium">{String(bill.bill_number || '')}</div>
                        <div className="text-xs text-muted-foreground">{String(bill.bill_date || '')}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">₹{Number(bill.grand_total || 0).toFixed(2)}</div>
                        <div className="text-xs text-muted-foreground">{String(bill.status || '')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
