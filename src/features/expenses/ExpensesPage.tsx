import { useEffect, useState } from 'react';
import { Pencil, Plus, Receipt, Search, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { adminService, type ExpenseCategory, type ExpensePayload, type ExpenseRecord } from '@/services/adminService';

const today = () => new Date().toISOString().slice(0, 10);
const money = (amount: number) => `₹${Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const newForm = (): ExpensePayload => ({ expenseDate: today(), categoryId: 0, description: '', amount: 0, paymentMethod: 'CASH', reference: '', notes: '', status: 'PAID' });

export function ExpensesPage() {
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [summary, setSummary] = useState({ today_total: 0, month_total: 0, pending_total: 0, total_expenses: 0 });
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ExpensePayload>(newForm());
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<ExpenseRecord | null>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categoryName, setCategoryName] = useState('');

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [rows, totals, categoryRows] = await Promise.all([
        adminService.expenses({ search, categoryId, status, dateFrom, dateTo }),
        adminService.expenseSummary(),
        adminService.expenseCategories(),
      ]);
      setExpenses(rows);
      setSummary(totals);
      setCategories(categoryRows.filter((category) => category.status === 'ACTIVE'));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load expenses.';
      setLoadError(message);
      toast({ title: message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 150);
    return () => window.clearTimeout(timer);
  }, [search, categoryId, status, dateFrom, dateTo]);

  const startCreate = () => { setEditingId(null); setForm({ ...newForm(), categoryId: categories[0]?.id || 0 }); setFormOpen(true); };

  const startEdit = (expense: ExpenseRecord) => {
    setEditingId(expense.id);
    setForm({ expenseDate: expense.expense_date, categoryId: expense.category_id, description: expense.description, amount: expense.amount, paymentMethod: expense.payment_method, reference: expense.reference, notes: expense.notes, status: expense.status });
    setFormOpen(true);
  };

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.description.trim() || !form.categoryId || !Number.isFinite(Number(form.amount)) || Number(form.amount) <= 0 || !form.expenseDate) {
      toast({ title: 'Complete the required expense fields.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      if (editingId) await adminService.updateExpense(editingId, form);
      else await adminService.createExpense(form);
      setFormOpen(false);
      toast({ title: editingId ? 'Expense updated' : 'Expense recorded' });
      await load();
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : 'Unable to save expense.', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const remove = async () => {
    if (!deleting) return;
    try {
      await adminService.deleteExpense(deleting.id);
      setDeleting(null);
      toast({ title: 'Expense deleted' });
      await load();
    } catch (error) { toast({ title: error instanceof Error ? error.message : 'Unable to delete expense.', variant: 'destructive' }); }
  };

  const addCategory = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const category = await adminService.createExpenseCategory(categoryName);
      setCategories((current) => [...current.filter((item) => item.id !== category.id), category].sort((left, right) => left.name.localeCompare(right.name)));
      setForm((current) => ({ ...current, categoryId: category.id }));
      setCategoryName('');
      setCategoryOpen(false);
      toast({ title: 'Expense category added' });
    } catch (error) { toast({ title: error instanceof Error ? error.message : 'Unable to add category.', variant: 'destructive' }); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3"><PageHeader title="Expenses" description="Record and review store operating expenses." breadcrumbs={[{ label: 'Expenses' }]} /><Button onClick={startCreate}><Plus className="mr-2 h-4 w-4" />Add Expense</Button></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Today', summary.today_total], ['This Month', summary.month_total], ['Pending', summary.pending_total], ['Total Expenses', summary.total_expenses],
        ].map(([label, value]) => <div key={String(label)} className="flex items-center justify-between rounded-lg border bg-card p-4"><div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold">{money(Number(value))}</p></div><Receipt className="h-5 w-5 text-muted-foreground" /></div>)}
      </div>
      <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_180px_140px_150px_150px]">
        <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Search expense no., description, reference..." value={search} onChange={(event) => setSearch(event.target.value)} /></div>
        <select aria-label="Expense category filter" className="h-9 rounded-md border bg-background px-3 text-sm" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="">All categories</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
        <select aria-label="Expense status filter" className="h-9 rounded-md border bg-background px-3 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}><option value="ALL">All statuses</option><option value="PAID">Paid</option><option value="PENDING">Pending</option></select>
        <Input aria-label="Expense date from" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
        <Input aria-label="Expense date to" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
      </div>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[940px] text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3">Expense No.</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Description</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3">Payment</th><th className="px-4 py-3">Reference</th><th className="px-4 py-3">Created By</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
          <tbody>{loading ? <tr><td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">Loading expenses...</td></tr>
            : loadError ? <tr><td colSpan={10} className="px-4 py-8 text-center"><p className="text-destructive">{loadError}</p><Button className="mt-2" variant="outline" onClick={() => void load()}>Retry</Button></td></tr>
              : expenses.length === 0 ? <tr><td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">No expenses found.</td></tr>
                : expenses.map((expense) => <tr key={expense.id} className="border-b last:border-0"><td className="px-4 py-3 font-medium">{expense.expense_number}</td><td className="px-4 py-3">{expense.expense_date}</td><td className="px-4 py-3">{expense.category_name_snapshot}</td><td className="px-4 py-3">{expense.description}</td><td className="px-4 py-3 text-right">{money(expense.amount)}</td><td className="px-4 py-3">{expense.payment_method}</td><td className="px-4 py-3">{expense.reference || '—'}</td><td className="px-4 py-3">{expense.created_by}</td><td className="px-4 py-3">{expense.status}</td><td className="px-4 py-3"><div className="flex justify-end gap-1"><Button variant="ghost" size="sm" onClick={() => startEdit(expense)} aria-label={`Edit ${expense.expense_number}`}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="sm" onClick={() => setDeleting(expense)} aria-label={`Delete ${expense.expense_number}`}><Trash2 className="h-4 w-4" /></Button></div></td></tr>)}</tbody>
        </table>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}><DialogContent className="max-w-xl"><DialogHeader><DialogTitle>{editingId ? 'Edit Expense' : 'Add Expense'}</DialogTitle><DialogDescription>Expenses are included in profit and expense reports.</DialogDescription></DialogHeader>
        <form className="space-y-4" onSubmit={(event) => void save(event)}><div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="expense-date">Expense date *</Label><Input id="expense-date" type="date" required value={form.expenseDate} onChange={(event) => setForm((current) => ({ ...current, expenseDate: event.target.value }))} /></div>
          <div className="space-y-2"><Label htmlFor="expense-category">Category *</Label><select id="expense-category" className="h-9 w-full rounded-md border bg-background px-3 text-sm" required value={form.categoryId || ''} onChange={(event) => setForm((current) => ({ ...current, categoryId: Number(event.target.value) }))}><option value="">Select category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select><Button type="button" variant="link" className="h-auto p-0" onClick={() => setCategoryOpen(true)}>+ Add custom category</Button></div>
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="expense-description">Description *</Label><Input id="expense-description" required value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></div>
          <div className="space-y-2"><Label htmlFor="expense-amount">Amount *</Label><Input id="expense-amount" type="number" min="0.01" step="0.01" required value={form.amount || ''} onChange={(event) => setForm((current) => ({ ...current, amount: Number(event.target.value) }))} /></div>
          <div className="space-y-2"><Label htmlFor="expense-payment">Payment method</Label><select id="expense-payment" className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={form.paymentMethod} onChange={(event) => setForm((current) => ({ ...current, paymentMethod: event.target.value }))}><option value="CASH">Cash</option><option value="UPI">UPI</option><option value="BANK">Bank</option><option value="CARD">Card</option><option value="OTHER">Other</option></select></div>
          <div className="space-y-2"><Label htmlFor="expense-reference">Reference / notes</Label><Input id="expense-reference" value={form.reference} onChange={(event) => setForm((current) => ({ ...current, reference: event.target.value }))} /></div>
          <div className="space-y-2"><Label htmlFor="expense-status">Status</Label><select id="expense-status" className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}><option value="PAID">Paid</option><option value="PENDING">Pending</option></select></div>
        </div><DialogFooter><Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving...' : editingId ? 'Save Changes' : 'Save Expense'}</Button></DialogFooter></form>
      </DialogContent></Dialog>

      <Dialog open={categoryOpen} onOpenChange={setCategoryOpen}><DialogContent className="max-w-sm"><DialogHeader><DialogTitle>Add Expense Category</DialogTitle></DialogHeader><form className="space-y-3" onSubmit={(event) => void addCategory(event)}><div className="space-y-2"><Label htmlFor="new-expense-category">Category name</Label><Input id="new-expense-category" required value={categoryName} onChange={(event) => setCategoryName(event.target.value)} /></div><DialogFooter><Button type="button" variant="outline" onClick={() => setCategoryOpen(false)}>Cancel</Button><Button type="submit">Add Category</Button></DialogFooter></form></DialogContent></Dialog>

      <Dialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}><DialogContent><DialogHeader><DialogTitle>Delete Expense?</DialogTitle><DialogDescription>{deleting?.expense_number} · {money(deleting?.amount || 0)}. This record will be removed from reports.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setDeleting(null)}>Keep Expense</Button><Button variant="destructive" onClick={() => void remove()}>Delete Expense</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}