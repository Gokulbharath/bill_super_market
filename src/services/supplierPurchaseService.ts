import { request } from './apiClient';

export interface SupplierRecord {
  id: number;
  supplier_code: string;
  name: string;
  contact_person: string;
  phone: string;
  alternate_phone: string;
  email: string;
  gstin: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  pincode: string;
  notes: string;
  status: 'ACTIVE' | 'INACTIVE';
  total_purchases: number;
  total_purchase_value: number;
  amount_paid: number;
  outstanding: number;
  last_purchase_date?: string | null;
}

export interface SupplierSummary {
  total_suppliers: number;
  active_suppliers: number;
  total_purchases: number;
  outstanding_amount: number;
}

export interface SupplierPayload {
  name: string;
  contactPerson: string;
  phone: string;
  alternatePhone: string;
  email: string;
  gstin: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  notes: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface PurchaseProduct {
  id: number;
  nameEnglish: string;
  nameTamil: string;
  sku: string;
  purchasePrice: number;
  sellingPrice: number;
  mrp: number;
  gstPercent: number;
  currentStock: number;
  unitSymbol?: string;
  unitName?: string;
  brandName?: string;
  identifierValue?: string;
}

export interface PurchaseItemInput {
  productId: number;
  quantity: number;
  purchaseCost: number;
  batchNumber?: string;
  manufacturingDate?: string;
  expiryDate?: string;
}

export interface PurchasePayload {
  supplierId: number;
  purchaseDate: string;
  supplierInvoiceNumber?: string;
  supplierInvoiceDate?: string;
  referenceNumber?: string;
  discount: number;
  otherCharges: number;
  roundOff: number;
  notes?: string;
  items: PurchaseItemInput[];
}

export interface PurchaseRecord {
  id: number;
  purchase_number: string;
  supplier_id: number;
  supplier_code: string;
  supplier_name: string;
  supplier_phone?: string;
  supplier_gstin?: string;
  item_count?: number;
  purchase_date: string;
  supplier_invoice_number: string;
  supplier_invoice_date: string;
  reference_number: string;
  subtotal: number;
  discount: number;
  taxable_amount: number;
  cgst: number;
  sgst: number;
  other_charges: number;
  round_off: number;
  grand_total: number;
  status: 'DRAFT' | 'RECEIVED' | 'CANCELLED';
  notes: string;
  received_at?: string;
  paid_amount: number;
  balance: number;
  payment_status: 'UNPAID' | 'PARTIAL' | 'PAID';
  items: Array<{
    id: number;
    product_id: number;
    product_name_snapshot: string;
    product_tamil_name_snapshot: string;
    barcode_snapshot: string;
    quantity: number;
    unit: string;
    purchase_cost: number;
    gst_rate: number;
    taxable_amount: number;
    cgst: number;
    sgst: number;
    tax_amount: number;
    line_total: number;
    batch_number: string;
    manufacturing_date: string | null;
    expiry_date: string | null;
  }>;
  payments: PurchasePayment[];
}

export interface PurchasePayment {
  id: number;
  purchase_id: number;
  amount: number;
  payment_method: 'CASH' | 'UPI' | 'BANK' | 'OTHER';
  reference_number: string;
  payment_date: string;
  notes: string;
}

export interface PurchaseSummary {
  total_purchases: number;
  month_total: number;
  draft_count: number;
  outstanding_amount: number;
}

const json = (method: string, payload: unknown): RequestInit => ({ method, body: JSON.stringify(payload) });

export const supplierPurchaseService = {
  supplierSummary: () => request<SupplierSummary>('/suppliers/summary'),
  suppliers: (search = '', status = 'ALL') => request<SupplierRecord[]>(`/suppliers?search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}`),
  supplier: (id: number) => request<SupplierRecord>(`/suppliers/${id}`),
  supplierPurchases: (id: number) => request<PurchaseRecord[]>(`/suppliers/${id}/purchases`),
  createSupplier: (payload: SupplierPayload) => request<SupplierRecord>('/suppliers', json('POST', payload)),
  updateSupplier: (id: number, payload: SupplierPayload) => request<SupplierRecord>(`/suppliers/${id}`, json('PUT', payload)),
  setSupplierStatus: (id: number, status: 'ACTIVE' | 'INACTIVE') => request<SupplierRecord>(`/suppliers/${id}/status`, json('PATCH', { status })),
  purchaseProducts: (query: string) => request<PurchaseProduct[]>(`/purchase-products/search?q=${encodeURIComponent(query)}`),
  purchaseProductByBarcode: (barcode: string) => request<PurchaseProduct>(`/purchase-products/lookup/${encodeURIComponent(barcode)}`),
  purchaseSummary: () => request<PurchaseSummary>('/purchases/summary'),
  purchases: (filters: { search?: string; status?: string; supplierId?: string; dateFrom?: string; dateTo?: string } = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
    return request<PurchaseRecord[]>(`/purchases${params.size ? `?${params}` : ''}`);
  },
  purchase: (id: number) => request<PurchaseRecord>(`/purchases/${id}`),
  createPurchase: (payload: PurchasePayload) => request<PurchaseRecord>('/purchases', json('POST', payload)),
  updateDraft: (id: number, payload: PurchasePayload) => request<PurchaseRecord>(`/purchases/${id}`, json('PUT', payload)),
  receivePurchase: (id: number) => request<PurchaseRecord>(`/purchases/${id}/receive`, json('POST', {})),
  addPayment: (id: number, payload: { amount: number; paymentMethod: string; referenceNumber?: string; paymentDate: string; notes?: string }) => request<PurchasePayment>(`/purchases/${id}/payments`, json('POST', payload)),
  payments: (id: number) => request<PurchasePayment[]>(`/purchases/${id}/payments`),
  cancelPurchase: (id: number) => request<PurchaseRecord>(`/purchases/${id}/cancel`, json('POST', {})),
};