export type ProductType = 'MANUFACTURER_PRODUCT' | 'SHOP_PACKED_PRODUCT';
export type ProductStatus = 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED' | 'DRAFT';
export type IdentifierType = 'EAN13' | 'EAN8' | 'UPC' | 'CODE128' | 'CODE39' | 'INTERNAL_BARCODE' | 'QR' | 'OTHER';

export interface ProductInput {
  productCode?: string;
  sku: string;
  nameEnglish: string;
  nameTamil?: string;
  shortName?: string;
  description?: string;
  brandId?: number | null;
  categoryId?: number | null;
  subcategoryId?: number | null;
  unitId?: number | null;
  packSize?: number | null;
  productType: ProductType;
  purchasePrice: number;
  mrp: number;
  sellingPrice: number;
  gstPercent: number;
  hsnCode?: string;
  openingStock: number;
  minimumStock: number;
  maximumStock: number;
  hasExpiry: boolean;
  status?: ProductStatus;
  imagePath?: string;
  changedBy?: string;
  identifier?: { identifierType: IdentifierType; identifierValue: string; isPrimary: boolean };
}

export interface ProductPriceUpdate {
  purchasePrice: number;
  mrp: number;
  sellingPrice: number;
  reason?: string;
  changedBy?: string;
}
