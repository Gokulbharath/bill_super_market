import { request } from './apiClient';
import type { PosProduct } from './productService';

export interface DashboardSummary {
  todaySales: number;
  todayBills: number;
  currentStock: number;
  lowStockItems: number;
  todayExpenses: number;
  todayProfit: number | null;
}

export interface DashboardBill {
  id: number;
  bill_number: string;
  grand_total: number;
  item_count: number;
  created_at: string;
  customer_name: string;
  status: string;
}

export interface ReportSummary {
  totalSales: number;
  totalBills: number;
  totalItemsSold: number;
  totalPurchaseCost: number;
  totalExpenses: number;
  grossProfit: number | null;
  netProfit: number | null;
  gstCollected: number;
  unknownCostItems: number;
  costOfGoodsSold: number | null;
}

export interface ExpenseCategory {
  id: number;
  name: string;
  status: string;
}

export interface ExpenseRecord {
  id: number;
  expense_number: string;
  expense_date: string;
  category_id: number;
  category_name: string;
  category_name_snapshot: string;
  description: string;
  amount: number;
  payment_method: 'CASH' | 'UPI' | 'BANK' | 'CARD' | 'OTHER';
  reference: string;
  notes: string;
  created_by: string;
  status: 'PAID' | 'PENDING';
}

export interface ExpensePayload {
  expenseDate: string;
  categoryId: number;
  description: string;
  amount: number;
  paymentMethod: string;
  reference?: string;
  notes?: string;
  status?: string;
}

export interface HeldBillRecord {
  id: number;
  hold_number: string;
  cashier_id: string;
  created_at: string;
  cashierName: string;
  item_count: number;
  customer: { id: number | null; name: string; phone: string; customerCode?: string };
  items: Array<PosProduct & { quantity: number }>;
  discount: number;
  notes: string;
}

export interface StoreSettings {
  name: string;
  shortName: string;
  address: { line1: string; line2: string; area: string; city: string; district: string; state: string; pincode: string; country: string };
  phone: string;
  alternatePhone: string;
  email: string;
  gstin: string;
  receipt: {
    footerNote: string;
    showGST: boolean;
    showCustomerDetails: boolean;
    showCashier: boolean;
    showCounter: boolean;
    showBarcode: boolean;
    showQR: boolean;
    printTamilProductName: boolean;
    printEnglishProductName: boolean;
    copies: number;
    copy1Label: string;
    copy2Label: string;
    counter: string;
    paperSize: '58mm' | '80mm' | 'A4';
    receiptPrinter: string;
    labelPrinter: string;
    upiId: string;
  };
  tax: { cgst: number; sgst: number };
}

export interface ProfileRecord {
  userId: string;
  name: string;
  email: string;
  phone: string;
  avatarUrl: string;
  role: string;
  updatedAt: string;
}

function query(filters: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
  return params.size ? `?${params}` : '';
}

const json = (method: string, payload: unknown): RequestInit => ({ method, body: JSON.stringify(payload) });

export const adminService = {
  dashboardSummary: () => request<DashboardSummary>('/dashboard/summary'),
  dashboardRecentBills: () => request<DashboardBill[]>('/dashboard/recent-bills'),
  reportSummary: (filters: { from?: string; to?: string }) => request<ReportSummary>(`/reports/summary${query(filters)}`),
  salesReport: (filters: { from?: string; to?: string; search?: string; paymentMethod?: string }) => request<Array<Record<string, unknown>>>(`/reports/sales${query(filters)}`),
  productReport: (filters: { from?: string; to?: string; search?: string; categoryId?: string; brandId?: string }) => request<Array<Record<string, unknown>>>(`/reports/products${query(filters)}`),
  purchaseReport: (filters: { from?: string; to?: string; supplierId?: string; status?: string }) => request<Array<Record<string, unknown>>>(`/reports/purchases${query(filters)}`),
  expenseReport: (filters: { from?: string; to?: string; categoryId?: string }) => request<ExpenseRecord[]>(`/reports/expenses${query(filters)}`),
  gstReport: (filters: { from?: string; to?: string }) => request<{ taxableSales: number; cgst: number; sgst: number; totalGst: number; grandTotal: number; products: Array<Record<string, unknown>> }>(`/reports/gst${query(filters)}`),
  profitReport: (filters: { from?: string; to?: string }) => request<Record<string, number | null>>(`/reports/profit${query(filters)}`),
  expenses: (filters: { search?: string; categoryId?: string; status?: string; dateFrom?: string; dateTo?: string } = {}) => request<ExpenseRecord[]>(`/expenses${query(filters)}`),
  expense: (id: number) => request<ExpenseRecord>(`/expenses/${id}`),
  expenseSummary: () => request<{ today_total: number; month_total: number; pending_total: number; total_expenses: number }>('/expenses/summary'),
  expenseCategories: () => request<ExpenseCategory[]>('/expenses/categories'),
  createExpenseCategory: (name: string) => request<ExpenseCategory>('/expenses/categories', json('POST', { name })),
  createExpense: (payload: ExpensePayload) => request<ExpenseRecord>('/expenses', json('POST', payload)),
  updateExpense: (id: number, payload: ExpensePayload) => request<ExpenseRecord>(`/expenses/${id}`, json('PUT', payload)),
  deleteExpense: (id: number) => request<{ deleted: boolean }>(`/expenses/${id}`, { method: 'DELETE' }),
  heldBills: () => request<HeldBillRecord[]>('/held-bills'),
  heldBill: (id: number) => request<HeldBillRecord>(`/held-bills/${id}`),
  createHeldBill: (payload: { cashierId: string; cashierName: string; customer: Record<string, unknown>; items: Array<Record<string, unknown>>; discount: number; notes?: string }) => request<HeldBillRecord>('/held-bills', json('POST', payload)),
  deleteHeldBill: (id: number) => request<{ deleted: boolean }>(`/held-bills/${id}`, { method: 'DELETE' }),
  storeSettings: () => request<StoreSettings>('/settings'),
  saveStoreSettings: (settings: StoreSettings) => request<StoreSettings>('/settings', json('PUT', settings)),
  profile: () => request<ProfileRecord>('/profile'),
  saveProfile: (profile: Pick<ProfileRecord, 'name' | 'email' | 'phone' | 'avatarUrl'>) => request<ProfileRecord>('/profile', json('PUT', profile)),
};