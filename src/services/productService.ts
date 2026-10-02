import { request } from './apiClient';

export interface Product {
  id: number;
  productCode: string;
  sku: string;
  nameEnglish: string;
  nameTamil: string;
  productType: 'MANUFACTURER_PRODUCT' | 'SHOP_PACKED_PRODUCT';
  purchasePrice: number;
  mrp: number;
  sellingPrice: number;
  gstPercent: number;
  status: 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED' | 'DRAFT';
  brandName?: string;
  categoryName?: string;
  subcategoryId?: number;
  subcategoryName?: string;
  unitName?: string;
  unitSymbol?: string;
  packSize?: number;
  identifierType?: string;
  identifierValue?: string;
  barcodeSource?: string;
  hasExpiry: number;
  minimumStock?: number;
}

export interface ProductPayload {
  productCode?: string;
  sku: string;
  nameEnglish: string;
  nameTamil: string;
  shortName: string;
  description: string;
  productType: Product['productType'];
  brandId: number | null;
  categoryId: number | null;
  subcategoryId: number | null;
  unitId: number | null;
  packSize: number | null;
  purchasePrice: number;
  mrp: number;
  sellingPrice: number;
  gstPercent: number;
  hsnCode: string;
  openingStock: number;
  minimumStock: number;
  maximumStock: number;
  hasExpiry: boolean;
  status: Product['status'];
  identifier?: { identifierType: string; identifierValue: string; isPrimary: boolean };
}

export interface BarcodeLookupProduct {
  id: number;
  productCode: string;
  nameEnglish: string;
  nameTamil: string;
  sku: string;
  brand?: string;
  category?: string;
  mrp: number;
  sellingPrice: number;
}

export interface BarcodeLookupResult {
  exists: boolean;
  product?: BarcodeLookupProduct;
}

export interface PriceHistoryEntry {
  id: number;
  productId: number;
  oldPurchasePrice: number;
  newPurchasePrice: number;
  oldMrp: number;
  newMrp: number;
  oldSellingPrice: number;
  newSellingPrice: number;
  changedBy: string;
  changedAt: string;
  reason: string;
}

export interface InventoryRow extends Product {
  currentStock: number;
  minimumStock: number;
  stockValue: number;
  unit: string;
  nearestExpiry?: string;
}

export interface InventoryMovement {
  id: number;
  product_id: number;
  productName: string;
  identifierValue?: string;
  movement_type: string;
  quantity: number;
  before_quantity: number;
  after_quantity: number;
  unit: string;
  reason?: string;
  notes?: string;
  created_by: string;
  created_at: string;
}

export interface PosProduct {
  id: number;
  nameEnglish: string;
  nameTamil: string;
  sku: string;
  sellingPrice: number;
  mrp: number;
  gstPercent: number;
  currentStock: number;
  unitSymbol?: string;
  unitName?: string;
  identifierValue?: string;
}

export interface CustomerRecord {
  id: number;
  customer_code: string;
  name: string;
  phone: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface BillRecord {
  id: number;
  bill_number: string;
  cashier_id: string;
  cashier_name_snapshot?: string;
  counter_snapshot?: string;
  bill_date: string;
  created_at: string;
  customer_id?: number | null;
  customer_name_snapshot?: string;
  customer_phone_snapshot?: string;
  customer_name?: string;
  customer_phone?: string;
  subtotal: number;
  discount: number;
  taxable_amount: number;
  cgst: number;
  sgst: number;
  round_off?: number;
  grand_total: number;
  payment_method: string;
  cash_received?: number;
  change_amount?: number;
  status: string;
  items: Array<{
    id: number;
    product_name_snapshot: string;
    product_tamil_name_snapshot?: string;
    quantity: number;
    unit: string;
    selling_price: number;
    gst_percent: number;
    tax_amount: number;
    line_total: number;
    discount_amount?: number;
    barcode_snapshot?: string;
  }>;
}

export const productService = {
  list: (search = '') => request<Product[]>(`/products${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  listShopProducts: (search = '') => request<Product[]>(`/products?productType=SHOP_PACKED_PRODUCT${search ? `&search=${encodeURIComponent(search)}` : ''}`),
  get: (id: number) => request<Product>(`/products/${id}`),
  create: (payload: ProductPayload) => request<Product>('/products', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id: number, payload: ProductPayload) => request<Product>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  updatePrice: (id: number, payload: { purchasePrice: number; mrp: number; sellingPrice: number; reason?: string }) => request<Product>(`/products/${id}/price`, { method: 'PATCH', body: JSON.stringify(payload) }),
  priceHistory: (id: number) => request<PriceHistoryEntry[]>(`/products/${id}/price-history`),
  deactivate: (id: number) => request<{ message: string }>(`/products/${id}`, { method: 'DELETE' }),
  lookup: (resource: 'categories' | 'brands' | 'units') => request<Array<{ id: number; name: string; symbol?: string }>>(`/${resource}`),
  listSubcategories: () => request<Array<{ id: number; name: string; category_id: number }>>('/subcategories'),
  createBrand: (payload: { name: string; description: string; status: string }) => request<{ id: number; name: string; description?: string; status?: string }>('/brands', { method: 'POST', body: JSON.stringify(payload) }),
  lookupBarcode: (identifier: string) => request<BarcodeLookupResult>(`/products/lookup/${encodeURIComponent(identifier)}`),
  nextShopBarcode: () => request<{ barcode: string; identifierType: string }>('/products/next-shop-barcode'),
  inventory: (query = '') => request<InventoryRow[]>(`/inventory${query ? `?${query}` : ''}`),
  inventorySummary: () => request<{ totalProducts: number; totalStockUnits: number; totalStockValue: number; lowStock: number; outOfStock: number; expiringSoon: number; expired: number; adjustmentsToday: number }>('/inventory/summary'),
  inventoryMovements: () => request<InventoryMovement[]>('/inventory/movements'),
  stockIn: (payload: { productId: number; quantity: number; batchNumber?: string; manufacturingDate?: string; expiryDate?: string; notes?: string; movementType?: string }) => request<{ currentStock: number }>('/inventory/stock-in', { method: 'POST', body: JSON.stringify(payload) }),
  stockOut: (payload: { productId: number; quantity: number; reason: string; notes?: string }) => request<{ currentStock: number }>('/inventory/stock-out', { method: 'POST', body: JSON.stringify(payload) }),
  adjustStock: (payload: { productId: number; physicalCount: number; reason: string; notes?: string }) => request<{ currentStock: number }>('/inventory/adjust', { method: 'POST', body: JSON.stringify(payload) }),
  updateMinimum: (id: number, minimumQuantity: number) => request<InventoryRow>(`/inventory/products/${id}/minimum`, { method: 'PATCH', body: JSON.stringify({ minimumQuantity }) }),
  posLookup: (value: string) => request<PosProduct>(`/pos/products/lookup/${encodeURIComponent(value)}`),
  posSearch: (query: string) => request<PosProduct[]>(`/pos/products/search?q=${encodeURIComponent(query)}`),
  customers: (search = '') => request<CustomerRecord[]>(`/customers${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  customer: (id: number) => request<CustomerRecord>(`/customers/${id}`),
  searchCustomer: (phone: string) => request<CustomerRecord>(`/customers/search?phone=${encodeURIComponent(phone)}`),
  createCustomer: (payload: { name: string; phone: string; status?: string }) => request<CustomerRecord>('/customers', { method: 'POST', body: JSON.stringify(payload) }),
  updateCustomer: (id: number, payload: { name?: string; phone?: string; status?: string }) => request<CustomerRecord>(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  customerBills: (id: number) => request<Array<Record<string, unknown>>>(`/customers/${id}/bills`),
  finalizeBill: (payload: { items: Array<{ productId: number; quantity: number }>; discount: number; cashReceived?: number; cashierName?: string; counter?: string; customerId?: number | null; customerName?: string; customerPhone?: string }) => request<BillRecord>('/bills', { method: 'POST', body: JSON.stringify(payload) }),
  bills: (search = '') => request<BillRecord[]>(`/bills${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  bill: (id: number) => request<BillRecord>(`/bills/${id}`),
};
