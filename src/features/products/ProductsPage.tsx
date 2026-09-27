import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle, CheckCircle2, Edit3, Loader2, Package, Plus, ScanBarcode, Search, ShieldOff, Sparkles, X } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SearchableMasterSelect } from '@/components/common/SearchableMasterSelect';
import { useToast } from '@/hooks/use-toast';
import { productService, type Product, type ProductPayload } from '@/services/productService';

type LookupItem = {
  id: number;
  name: string;
  symbol?: string;
};

type BarcodeStatus = 'IDLE' | 'READY_TO_SCAN' | 'SCANNING' | 'VERIFYING' | 'AVAILABLE' | 'EXISTS' | 'ERROR';

const productSchema = z.object({
  nameEnglish: z.string().min(1, 'English name is required'),
  nameTamil: z.string().default(''),
  sku: z.string().min(1, 'SKU is required'),
  productType: z.enum(['MANUFACTURER_PRODUCT', 'SHOP_PACKED_PRODUCT']),
  brandId: z.number().nullable(),
  categoryId: z.number().nullable(),
  subcategoryId: z.number().nullable(),
  unitId: z.number().nullable(),
  purchasePrice: z.coerce.number().min(0),
  mrp: z.coerce.number().min(0),
  sellingPrice: z.coerce.number().min(0),
  gstPercent: z.coerce.number().min(0).max(100),
  packSize: z.coerce.number().min(0).nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'DISCONTINUED', 'DRAFT']),
  identifierType: z.string().default('EAN13'),
  identifierValue: z.string().default(''),
  description: z.string().default(''),
});

type FormValues = z.infer<typeof productSchema>;

const emptyValues: FormValues = {
  nameEnglish: '',
  nameTamil: '',
  sku: '',
  productType: 'MANUFACTURER_PRODUCT',
  brandId: null,
  categoryId: null,
  subcategoryId: null,
  unitId: null,
  purchasePrice: 0,
  mrp: 0,
  sellingPrice: 0,
  gstPercent: 0,
  packSize: null,
  status: 'ACTIVE',
  identifierType: 'EAN13',
  identifierValue: '',
  description: '',
};

const identifierOptions = ['EAN13', 'EAN8', 'UPC', 'CODE128', 'CODE39', 'INTERNAL_BARCODE', 'QR', 'OTHER'];

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lookupLoading, setLookupLoading] = useState(true);
  const [brands, setBrands] = useState<LookupItem[]>([]);
  const [categories, setCategories] = useState<LookupItem[]>([]);
  const [units, setUnits] = useState<LookupItem[]>([]);
  const [subcategories, setSubcategories] = useState<Array<LookupItem & { category_id: number }>>([]);
  const [brandDialogOpen, setBrandDialogOpen] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [newBrandDescription, setNewBrandDescription] = useState('');
  const [newBrandStatus, setNewBrandStatus] = useState('ACTIVE');
  const [brandSaving, setBrandSaving] = useState(false);
  const [shopBarcode, setShopBarcode] = useState('');
  const [shopBarcodeLoading, setShopBarcodeLoading] = useState(false);
  const [barcodeStatus, setBarcodeStatus] = useState<BarcodeStatus>('IDLE');
  const [barcodeResult, setBarcodeResult] = useState<{ exists: boolean; product?: { id: number; productCode: string; nameEnglish: string; nameTamil: string; sku: string; brand?: string; category?: string; mrp: number; sellingPrice: number } } | null>(null);
  const [quickScan, setQuickScan] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { toast } = useToast();

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: emptyValues,
  });

  const productType = watch('productType');
  const currentStatus = watch('status');

  const loadLookupData = async () => {
    try {
      setLookupLoading(true);
      const [brandList, categoryList, unitList, subcategoryList] = await Promise.all([
        productService.lookup('brands'),
        productService.lookup('categories'),
        productService.lookup('units'),
        productService.listSubcategories(),
      ]);
      setBrands(brandList);
      setCategories(categoryList);
      setUnits(unitList);
      setSubcategories(subcategoryList);
    } catch (error) {
      toast({
        title: 'Lookups unavailable',
        description: error instanceof Error ? error.message : 'Could not load product metadata.',
        variant: 'destructive',
      });
    } finally {
      setLookupLoading(false);
    }
  };

  const loadProducts = async (term = search) => {
    setLoading(true);
    try {
      setProducts(await productService.list(term));
    } catch (error) {
      toast({
        title: 'Products unavailable',
        description: error instanceof Error ? error.message : 'Start the local API server and try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLookupData();
    void loadProducts('');
  }, []);

  const openCreate = (initialBarcode = '') => {
    setEditing(null);
    reset(emptyValues);
    if (initialBarcode) setValue('identifierValue', initialBarcode);
    setBarcodeStatus('IDLE');
    setBarcodeResult(null);
    setShopBarcode('');
    setShowForm(true);
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setBarcodeStatus('IDLE');
    setBarcodeResult(null);
    setShopBarcode(product.productType === 'SHOP_PACKED_PRODUCT' ? product.identifierValue || '' : '');
    reset({
      ...emptyValues,
      nameEnglish: product.nameEnglish,
      nameTamil: product.nameTamil || '',
      sku: product.sku,
      productType: product.productType,
      brandId: product.brandName ? brands.find((brand) => brand.name === product.brandName)?.id ?? null : null,
      categoryId: product.categoryName ? categories.find((category) => category.name === product.categoryName)?.id ?? null : null,
      subcategoryId: product.subcategoryId ?? null,
      unitId: product.unitName ? units.find((unit) => unit.name === product.unitName)?.id ?? null : null,
      purchasePrice: product.purchasePrice,
      mrp: product.mrp,
      sellingPrice: product.sellingPrice,
      gstPercent: product.gstPercent,
      packSize: product.packSize ?? null,
      status: product.status,
      identifierType: product.identifierType || 'EAN13',
      identifierValue: product.identifierValue || '',
      description: '',
    });
    setShowForm(true);
  };

  const openBrandDialog = () => {
    setNewBrandName('');
    setNewBrandDescription('');
    setNewBrandStatus('ACTIVE');
    setBrandDialogOpen(true);
  };

  const saveBrand = async () => {
    const name = newBrandName.trim();
    if (!name) {
      toast({ title: 'Brand name is required.', variant: 'destructive' });
      return;
    }
    setBrandSaving(true);
    try {
      const created = await productService.createBrand({ name, description: newBrandDescription, status: newBrandStatus });
      const refreshed = await productService.lookup('brands');
      setBrands(refreshed);
      setValue('brandId', created.id, { shouldDirty: true, shouldValidate: true });
      setBrandDialogOpen(false);
      toast({ title: `${created.name} added to the brand master.` });
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : 'Unable to create brand. Please try again.', variant: 'destructive' });
    } finally {
      setBrandSaving(false);
    }
  };

  const verifyBarcode = async (rawValue: string, source: 'form' | 'search' = 'form') => {
    const value = rawValue.trim();
    if (!value) {
      setBarcodeStatus('ERROR');
      setBarcodeResult(null);
      toast({ title: 'Enter or scan a barcode.', variant: 'destructive' });
      return;
    }

    if (source === 'form') {
      const identifierType = watch('identifierType');
      const formatIsValid = identifierType === 'EAN13' ? /^\d{13}$/.test(value)
        : identifierType === 'EAN8' ? /^\d{8}$/.test(value)
          : identifierType === 'UPC' ? /^\d{12}$/.test(value)
            : identifierType === 'INTERNAL_BARCODE' ? /^[A-Za-z0-9_-]+$/.test(value)
              : value.length > 0;
      if (!formatIsValid) {
        setBarcodeStatus('ERROR');
        setBarcodeResult(null);
        toast({ title: 'Barcode format is not valid for the selected identifier type.', variant: 'destructive' });
        return;
      }
    }

    setBarcodeStatus('VERIFYING');
    try {
      const result = await productService.lookupBarcode(value);
      setBarcodeResult(result);
      if (source === 'search') {
        if (result.exists && result.product) {
          const fullProduct = await productService.get(result.product.id);
          setQuickScan(false);
          openEdit(fullProduct);
        } else {
          setBarcodeStatus('ERROR');
          toast({ title: 'No product found for this barcode.', description: 'Add a new product with this barcode.' });
        }
        return;
      }

      if (result.exists && result.product && result.product.id !== editing?.id) {
        setBarcodeStatus('EXISTS');
        toast({ title: 'Barcode already assigned', description: 'This barcode is already assigned to another product.', variant: 'destructive' });
      } else {
        setBarcodeStatus('AVAILABLE');
        toast({ title: 'Barcode available' });
      }
    } catch {
      setBarcodeStatus('ERROR');
      setBarcodeResult(null);
      toast({ title: 'Unable to verify barcode. Check that the local POS server is running.', variant: 'destructive' });
    }
  };

  const beginFormScan = () => {
    if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
    setBarcodeResult(null);
    setBarcodeStatus('READY_TO_SCAN');
    setValue('identifierValue', '');
    window.setTimeout(() => barcodeInputRef.current?.focus(), 0);
    scanTimeoutRef.current = setTimeout(() => setBarcodeStatus((current) => current === 'READY_TO_SCAN' || current === 'SCANNING' ? 'IDLE' : current), 15000);
  };

  const beginQuickScan = () => {
    setQuickScan(true);
    setSearch('');
    window.setTimeout(() => searchInputRef.current?.focus(), 0);
  };

  const generateShopBarcode = async () => {
    setShopBarcodeLoading(true);
    try {
      const next = await productService.nextShopBarcode();
      setShopBarcode(next.barcode);
    } catch {
      toast({ title: 'Unable to preview the next shop barcode.', description: 'Check that the local POS server is running.', variant: 'destructive' });
    } finally {
      setShopBarcodeLoading(false);
    }
  };

  useEffect(() => () => {
    if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
  }, []);

  const submit = async (values: FormValues) => {
    const payload: ProductPayload = {
      sku: values.sku,
      nameEnglish: values.nameEnglish,
      nameTamil: values.nameTamil,
      shortName: values.nameEnglish,
      description: values.description,
      productType: values.productType,
      brandId: values.brandId,
      categoryId: values.categoryId,
      subcategoryId: values.subcategoryId,
      unitId: values.unitId,
      packSize: values.packSize,
      purchasePrice: values.purchasePrice,
      mrp: values.mrp,
      sellingPrice: values.sellingPrice,
      gstPercent: values.gstPercent,
      hsnCode: '',
      openingStock: 0,
      minimumStock: 0,
      maximumStock: 0,
      hasExpiry: false,
      status: values.status,
      identifier: values.productType === 'MANUFACTURER_PRODUCT' && values.identifierValue.trim()
        ? {
            identifierType: values.identifierType,
            identifierValue: values.identifierValue.trim(),
            isPrimary: true,
          }
        : undefined,
    };

    try {
      if (editing) {
        const updated = await productService.update(editing.id, payload);
        toast({ title: 'Product updated successfully.', description: updated.identifierValue ? `Barcode: ${updated.identifierValue}` : undefined });
      } else {
        const created = await productService.create(payload);
        toast({ title: 'Product created successfully.', description: created.identifierValue ? `Barcode: ${created.identifierValue}` : undefined });
      }
      setShowForm(false);
      await loadProducts();
    } catch (error) {
      if (error instanceof Error && error.message.includes('barcode')) {
        setBarcodeStatus('EXISTS');
        if (values.identifierValue.trim()) {
          void productService.lookupBarcode(values.identifierValue.trim()).then(setBarcodeResult).catch(() => undefined);
        }
      }
      toast({
        title: 'Could not save product',
        description: error instanceof Error ? error.message : 'Please check the form and try again.',
        variant: 'destructive',
      });
    }
  };

  const deactivate = async (product: Product) => {
    if (!window.confirm(`Deactivate ${product.nameEnglish}?`)) {
      return;
    }

    try {
      await productService.deactivate(product.id);
      toast({ title: 'Product deactivated successfully.' });
      await loadProducts();
    } catch (error) {
      toast({
        title: 'Could not deactivate product',
        description: error instanceof Error ? error.message : 'Try again.',
        variant: 'destructive',
      });
    }
  };

  const totalInventoryValue = useMemo(() => products.reduce((sum, product) => sum + product.mrp, 0), [products]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description="Manage the product master catalog, pricing, and barcode metadata."
        breadcrumbs={[{ label: 'Products' }]}
        actions={
          <Button onClick={() => openCreate()}>
            <Plus className="mr-2 h-4 w-4" /> Add Product
          </Button>
        }
      />

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total products</p>
          <p className="mt-2 text-2xl font-semibold">{products.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Active listings</p>
          <p className="mt-2 text-2xl font-semibold">{products.filter((item) => item.status === 'ACTIVE').length}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Catalog value</p>
          <p className="mt-2 text-2xl font-semibold">₹{totalInventoryValue.toFixed(2)}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            value={search}
            onChange={(event) => { setSearch(event.target.value); if (quickScan) setBarcodeStatus('SCANNING'); }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                if (quickScan) void verifyBarcode(search, 'search'); else void loadProducts();
              }
            }}
            placeholder="Search by product, SKU, barcode, or brand"
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void loadProducts()}>Search</Button>
          <Button variant="outline" onClick={beginQuickScan} title="Scan a product barcode">
            <ScanBarcode className="mr-2 h-4 w-4" /> Scan
          </Button>
        </div>
      </div>

      {quickScan && <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span>Ready to scan a product barcode. Press Enter after the scanner finishes.</span>
        {barcodeStatus === 'ERROR' && barcodeResult && !barcodeResult.exists && <Button type="button" size="sm" variant="outline" onClick={() => openCreate(search)}>Add Product with this barcode</Button>}
      </div>}

      {showForm && (
        <form onSubmit={handleSubmit(submit)} className="space-y-5 rounded-lg border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">{editing ? 'Edit Product' : 'Add Product'}</h2>
              <p className="text-sm text-muted-foreground">
                {editing ? 'Update product details and pricing.' : 'Create a new master product entry.'}
              </p>
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={() => setShowForm(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/20 p-3 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4" />
                Live catalog sync is enabled with the SQLite backend.
              </div>
            </div>

            <div>
              <Label htmlFor="nameEnglish">English name</Label>
              <Input id="nameEnglish" {...register('nameEnglish')} />
              {errors.nameEnglish && <p className="mt-1 text-xs text-destructive">{errors.nameEnglish.message}</p>}
            </div>

            <div>
              <Label htmlFor="nameTamil">Tamil name</Label>
              <Input id="nameTamil" {...register('nameTamil')} />
            </div>

            <div>
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" {...register('sku')} />
              {errors.sku && <p className="mt-1 text-xs text-destructive">{errors.sku.message}</p>}
            </div>

            <div>
              <Label htmlFor="productType">Product type</Label>
              <Select value={productType} onValueChange={(value) => setValue('productType', value as FormValues['productType'])}>
                <SelectTrigger id="productType">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANUFACTURER_PRODUCT">Manufacturer product</SelectItem>
                  <SelectItem value="SHOP_PACKED_PRODUCT">Shop packed product</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Brand</Label>
              <SearchableMasterSelect
                items={brands}
                value={watch('brandId')}
                onChange={(value) => setValue('brandId', value, { shouldDirty: true, shouldValidate: true })}
                placeholder={lookupLoading ? 'Loading brands...' : 'Search brand...'}
                searchPlaceholder="Search brand..."
                emptyMessage="No brand found."
                loading={lookupLoading}
                loadingMessage="Loading brands..."
                allowNone
                addAction={openBrandDialog}
                disabled={lookupLoading}
              />
            </div>

            <div>
              <Label>Category</Label>
              <SearchableMasterSelect
                items={categories}
                value={watch('categoryId')}
                onChange={(value) => { setValue('categoryId', value, { shouldDirty: true, shouldValidate: true }); setValue('subcategoryId', null, { shouldDirty: true, shouldValidate: true }); }}
                placeholder={lookupLoading ? 'Loading categories...' : 'Search category...'}
                searchPlaceholder="Search category..."
                emptyMessage="No category found."
                loading={lookupLoading}
                loadingMessage="Loading categories..."
                disabled={lookupLoading}
              />
            </div>

            <div>
              <Label>Subcategory</Label>
              <SearchableMasterSelect
                items={subcategories.filter((subcategory) => subcategory.category_id === watch('categoryId'))}
                value={watch('subcategoryId')}
                onChange={(value) => setValue('subcategoryId', value, { shouldDirty: true, shouldValidate: true })}
                placeholder={watch('categoryId') ? 'Search subcategory...' : 'Select category first'}
                searchPlaceholder="Search subcategory..."
                emptyMessage={watch('categoryId') ? 'No subcategory found.' : 'Select category first.'}
                disabled={!watch('categoryId') || lookupLoading}
              />
            </div>

            <div>
              <Label>Unit</Label>
              <SearchableMasterSelect
                items={units}
                value={watch('unitId')}
                onChange={(value) => setValue('unitId', value, { shouldDirty: true, shouldValidate: true })}
                placeholder={lookupLoading ? 'Loading units...' : 'Search unit...'}
                searchPlaceholder="Search unit..."
                emptyMessage="No unit found."
                loading={lookupLoading}
                loadingMessage="Loading units..."
                disabled={lookupLoading}
              />
            </div>

            <div>
              <Label htmlFor="packSize">Pack size</Label>
              <Input id="packSize" type="number" min="0" step="0.01" {...register('packSize')} />
            </div>

            <div>
              <Label htmlFor="purchasePrice">Purchase price</Label>
              <Input id="purchasePrice" type="number" min="0" step="0.01" {...register('purchasePrice')} />
            </div>

            <div>
              <Label htmlFor="mrp">MRP</Label>
              <Input id="mrp" type="number" min="0" step="0.01" {...register('mrp')} />
            </div>

            <div>
              <Label htmlFor="sellingPrice">Selling price</Label>
              <Input id="sellingPrice" type="number" min="0" step="0.01" {...register('sellingPrice')} />
            </div>

            <div>
              <Label htmlFor="gstPercent">GST %</Label>
              <Input id="gstPercent" type="number" min="0" max="100" step="0.01" {...register('gstPercent')} />
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={currentStatus} onValueChange={(value) => setValue('status', value as FormValues['status'])}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                  <SelectItem value="DISCONTINUED">Discontinued</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2 rounded-lg border bg-muted/10 p-4">
              <div className="mb-3">
                <h3 className="font-medium">{productType === 'SHOP_PACKED_PRODUCT' ? 'Shop Barcode' : 'Manufacturer Barcode / Identifier'}</h3>
                <p className="text-xs text-muted-foreground">{productType === 'SHOP_PACKED_PRODUCT' ? 'The server assigns a permanent offline CODE-128 barcode.' : 'Use a USB barcode scanner or enter the barcode manually.'}</p>
              </div>
              {productType === 'SHOP_PACKED_PRODUCT' ? (
                <div className="flex flex-wrap items-center gap-3">
                  <div className="rounded-md border bg-background px-4 py-2 font-mono text-lg tracking-widest">{shopBarcode || 'Generated on save'}</div>
                  <Button type="button" variant="outline" onClick={() => void generateShopBarcode()} disabled={shopBarcodeLoading || Boolean(editing?.identifierValue)}>
                    {shopBarcodeLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Generate Shop Barcode
                  </Button>
                  <Badge variant="secondary">CODE-128</Badge>
                  {editing?.identifierValue && <p className="w-full text-xs text-muted-foreground">Assigned barcodes are permanent and cannot be regenerated.</p>}
                </div>
              ) : <div className="grid gap-4 md:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
                <div>
                  <Label htmlFor="identifierType">Identifier type</Label>
                  <Select value={watch('identifierType')} onValueChange={(value) => setValue('identifierType', value)}>
                    <SelectTrigger id="identifierType"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {identifierOptions.filter((type) => type !== 'OTHER').map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="identifierValue">Barcode</Label>
                  <div className="flex gap-2">
                    <Input
                      id="identifierValue"
                      placeholder="Scan or enter barcode"
                      {...register('identifierValue')}
                      ref={(element) => { register('identifierValue').ref(element); barcodeInputRef.current = element; }}
                      onChange={(event) => { setValue('identifierValue', event.target.value, { shouldDirty: true }); if (event.target.value) setBarcodeStatus('SCANNING'); }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          void verifyBarcode(event.currentTarget.value);
                        }
                      }}
                    />
                    <Button type="button" variant="outline" onClick={beginFormScan} title="Focus the USB barcode scanner input">
                      <ScanBarcode className="mr-2 h-4 w-4" /> Scan Barcode
                    </Button>
                    <Button type="button" variant="outline" onClick={() => void verifyBarcode(watch('identifierValue'))} disabled={barcodeStatus === 'VERIFYING'}>
                      {barcodeStatus === 'VERIFYING' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Verify
                    </Button>
                  </div>
                </div>
              </div>}
              {(barcodeStatus === 'READY_TO_SCAN' || barcodeStatus === 'SCANNING') && <p className="mt-3 text-sm text-primary">{barcodeStatus === 'READY_TO_SCAN' ? 'Ready to scan...' : 'Scanning...'}</p>}
              {barcodeStatus === 'VERIFYING' && <p className="mt-3 text-sm text-muted-foreground">Checking barcode...</p>}
              {barcodeStatus === 'AVAILABLE' && <p className="mt-3 flex items-center gap-2 text-sm text-emerald-600"><CheckCircle2 className="h-4 w-4" /> Barcode available</p>}
              {barcodeStatus === 'EXISTS' && barcodeResult?.product && <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
                <p className="flex items-center gap-2 font-medium"><AlertTriangle className="h-4 w-4" /> Barcode already assigned</p>
                <p className="mt-2 font-semibold">{barcodeResult.product.nameEnglish}</p>
                <p>{barcodeResult.product.nameTamil || '—'}</p>
                <p className="mt-1">Brand: {barcodeResult.product.brand || '—'} · Category: {barcodeResult.product.category || '—'}</p>
                <p>SKU: {barcodeResult.product.sku} · MRP: ₹{barcodeResult.product.mrp.toFixed(2)} · Selling: ₹{barcodeResult.product.sellingPrice.toFixed(2)}</p>
                <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => { if (barcodeResult.product) void productService.get(barcodeResult.product.id).then(openEdit); }}>View Product</Button>
              </div>}
              {barcodeStatus === 'ERROR' && !barcodeResult && <p className="mt-3 text-sm text-destructive">Unable to verify barcode.</p>}
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" rows={3} {...register('description')} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Product
            </Button>
          </div>
        </form>
      )}

      <Dialog open={brandDialogOpen} onOpenChange={setBrandDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Brand</DialogTitle>
            <DialogDescription>Create a master brand in the local SQLite database.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="newBrandName">Brand Name *</Label>
              <Input id="newBrandName" value={newBrandName} onChange={(event) => setNewBrandName(event.target.value)} autoFocus />
            </div>
            <div>
              <Label htmlFor="newBrandDescription">Description</Label>
              <Textarea id="newBrandDescription" value={newBrandDescription} onChange={(event) => setNewBrandDescription(event.target.value)} rows={3} />
            </div>
            <div>
              <Label htmlFor="newBrandStatus">Status</Label>
              <Select value={newBrandStatus} onValueChange={setNewBrandStatus}>
                <SelectTrigger id="newBrandStatus"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="ACTIVE">Active</SelectItem><SelectItem value="INACTIVE">Inactive</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setBrandDialogOpen(false)}>Cancel</Button>
            <Button type="button" onClick={() => void saveBrand()} disabled={brandSaving}>{brandSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Brand</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              {['Product', 'SKU', 'Barcode', 'Brand', 'Category', 'MRP', 'Selling', 'GST', 'Status', 'Actions'].map((heading) => (
                <th key={heading} className="whitespace-nowrap px-4 py-3 text-left font-medium">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} className="p-8 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-8 text-center text-muted-foreground">
                  <Package className="mx-auto mb-2 h-8 w-8" />
                  No products found.
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium">{product.nameEnglish}</div>
                    <div className="text-xs text-muted-foreground">{product.nameTamil || '—'}</div>
                    <div className="text-xs text-muted-foreground">{product.productCode}</div>
                  </td>
                  <td className="px-4 py-3">{product.sku}</td>
                  <td className="px-4 py-3">{product.identifierValue || '—'}</td>
                  <td className="px-4 py-3">{product.brandName || '—'}</td>
                  <td className="px-4 py-3">{product.categoryName || '—'}</td>
                  <td className="px-4 py-3">₹{product.mrp.toFixed(2)}</td>
                  <td className="px-4 py-3">₹{product.sellingPrice.toFixed(2)}</td>
                  <td className="px-4 py-3">{product.gstPercent}%</td>
                  <td className="px-4 py-3">
                    <Badge variant={product.status === 'ACTIVE' ? 'default' : product.status === 'INACTIVE' ? 'secondary' : 'outline'}>
                      {product.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" title="Edit product" onClick={() => openEdit(product)}>
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      {product.status === 'ACTIVE' && (
                        <Button variant="ghost" size="icon" title="Deactivate product" onClick={() => void deactivate(product)}>
                          <ShieldOff className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
