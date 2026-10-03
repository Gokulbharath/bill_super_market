import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Printer } from 'lucide-react';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { adminService, type StoreSettings } from '@/services/adminService';
import type { BillRecord } from '@/services/productService';
import { InvoiceReceipt, type InvoiceReceiptData } from './InvoiceReceipt';

type PaperSize = '80mm' | '58mm' | 'A4';

function dateTimeParts(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return { date: value, time: '' };
  return {
    date: new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(parsed),
    time: new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }).format(parsed).toLowerCase(),
  };
}

function createInvoiceData(bill: BillRecord, settings: StoreSettings, qrCodeDataUrl: string): InvoiceReceiptData {
  const timestamp = bill.created_at || bill.bill_date;
  const formatted = dateTimeParts(timestamp);
  const grandTotal = Number(bill.grand_total || 0);
  return {
    invoiceNumber: bill.bill_number,
    date: formatted.date,
    time: formatted.time,
    cashier: bill.cashier_name_snapshot || bill.cashier_id || 'Cashier',
    counter: bill.counter_snapshot || settings.receipt.counter,
    customer: bill.customer_name_snapshot || bill.customer_name || 'Walk-in Customer',
    customerPhone: bill.customer_phone_snapshot || bill.customer_phone || '',
    items: (bill.items || []).map((item) => ({
      id: Number(item.id),
      nameEnglish: String(item.product_name_snapshot || ''),
      nameTamil: String(item.product_tamil_name_snapshot || ''),
      barcode: String(item.barcode_snapshot || ''),
      quantity: Number(item.quantity || 0),
      unit: String(item.unit || ''),
      sellingPrice: Number(item.selling_price || 0),
      gstPercent: Number(item.gst_percent || 0),
      lineTotal: Number(item.line_total || 0),
    })),
    subtotal: Number(bill.subtotal || 0),
    discount: Number(bill.discount || 0),
    grandTotal,
    paymentMethod: bill.payment_method || 'CASH',
    storeDetails: {
      name: settings.name,
      addressLines: [
        settings.address.line1,
        [settings.address.line2, settings.address.area, settings.address.city, settings.address.pincode].filter(Boolean).join(', '),
        [settings.address.district, settings.address.state, settings.address.country].filter(Boolean).join(', '),
      ].filter(Boolean),
      phone: settings.phone,
      gstin: settings.gstin,
      footerNote: settings.receipt.footerNote,
      showGST: settings.receipt.showGST,
      showCustomerDetails: settings.receipt.showCustomerDetails,
      showCashier: settings.receipt.showCashier,
      showCounter: settings.receipt.showCounter,
      showBarcode: settings.receipt.showBarcode,
      showQR: settings.receipt.showQR,
      qrCodeDataUrl,
      printTamilProductName: settings.receipt.printTamilProductName,
      printEnglishProductName: settings.receipt.printEnglishProductName,
      copy1Label: settings.receipt.copy1Label,
      copy2Label: settings.receipt.copy2Label,
      copies: settings.receipt.copies,
    },
  };
}

function printInvoice(size: PaperSize) {
  document.body.dataset.invoicePaper = size;
  window.addEventListener('afterprint', () => delete document.body.dataset.invoicePaper, { once: true });
  window.print();
}

export function InvoicePreviewDialog({
  open,
  onOpenChange,
  bill,
  completed = false,
  autoPrint = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bill: BillRecord | null;
  completed?: boolean;
  autoPrint?: boolean;
}) {
  const { toast } = useToast();
  const [paperSize, setPaperSize] = useState<PaperSize>('80mm');
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [settingsError, setSettingsError] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [qrReady, setQrReady] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const autoPrinted = useRef(false);
  const invoice = bill && settings ? createInvoiceData(bill, settings, qrCodeDataUrl) : null;

  useEffect(() => {
    if (!open) return;
    let active = true;
    setSettingsError('');
    adminService.storeSettings().then((value) => {
      if (!active) return;
      setSettings(value);
      setPaperSize(value.receipt.paperSize);
    }).catch((error) => {
      if (!active) return;
      const message = error instanceof Error ? error.message : 'Unable to load receipt settings.';
      setSettingsError(message);
      toast({ title: message, variant: 'destructive' });
    });
    return () => { active = false; };
  }, [open, toast]);

  useEffect(() => {
    if (!open || !bill || !settings) return;
    const upiId = settings.receipt.upiId.trim();
    if (!settings.receipt.showQR || !upiId) {
      setQrCodeDataUrl('');
      setQrReady(true);
      return;
    }
    let active = true;
    setQrReady(false);
    const uri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(settings.name)}&am=${Number(bill.grand_total || 0).toFixed(2)}&cu=INR&tn=${encodeURIComponent(bill.bill_number)}`;
    QRCode.toDataURL(uri, { width: 144, margin: 1, errorCorrectionLevel: 'M' }).then((dataUrl) => {
      if (!active) return;
      setQrCodeDataUrl(dataUrl);
      setQrReady(true);
    }).catch((error: unknown) => {
      if (!active) return;
      setQrCodeDataUrl('');
      setQrReady(true);
      toast({ title: error instanceof Error ? error.message : 'Unable to generate payment QR.', variant: 'destructive' });
    });
    return () => { active = false; };
  }, [bill, open, settings, toast]);

  useEffect(() => {
    if (!open || !autoPrint || !bill || !invoice || !qrReady || autoPrinted.current) return;
    autoPrinted.current = true;
    const frame = window.requestAnimationFrame(() => printInvoice(paperSize));
    return () => window.cancelAnimationFrame(frame);
  }, [autoPrint, bill, invoice, open, paperSize, qrReady]);

  useEffect(() => {
    if (!open) autoPrinted.current = false;
  }, [open]);

  if (!bill) return null;
  const copies = settings?.receipt.copies || 2;
  const copyLabel = (index: number) => index === 0 ? settings?.receipt.copy1Label || 'CASHIER COPY' : settings?.receipt.copy2Label || 'DELIVERY COPY';

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={completed ? 'max-w-md' : 'max-w-2xl'}>
          {completed ? (
            <>
              <DialogHeader>
                <DialogTitle><CheckCircle2 className="mr-2 inline h-5 w-5 text-emerald-600" /> Bill Completed</DialogTitle>
                <DialogDescription>{bill.bill_number}{invoice ? ` · ₹${invoice.grandTotal.toFixed(2)}` : ''}</DialogDescription>
              </DialogHeader>
              {invoice ? <div className="grid grid-cols-2 gap-3 border-y py-3 text-sm"><span className="text-muted-foreground">Payment</span><strong>{invoice.paymentMethod}</strong><span className="text-muted-foreground">Customer</span><strong>{invoice.customer}</strong></div> : <p className="py-4 text-sm text-muted-foreground">{settingsError || 'Loading store settings...'}</p>}
              <DialogFooter className="flex-col sm:flex-row">
                <Button variant="outline" onClick={() => setViewOpen(true)} disabled={!invoice}>View Invoice</Button>
                <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader><DialogTitle>Invoice Preview</DialogTitle><DialogDescription>{bill.bill_number}</DialogDescription></DialogHeader>
              <div className="flex items-center justify-between gap-3"><span className="text-sm text-muted-foreground">Paper size</span><Select value={paperSize} onValueChange={(value) => setPaperSize(value as PaperSize)}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="80mm">80mm</SelectItem><SelectItem value="58mm">58mm</SelectItem><SelectItem value="A4">A4</SelectItem></SelectContent></Select></div>
              {invoice ? <div className="invoice-preview-scroll"><div className={`invoice-preview-paper invoice-preview-${paperSize.replace('mm', '')}`}><InvoiceReceipt invoice={invoice} copyType="CASHIER" copyLabel={copyLabel(0)} /></div></div> : <p className="py-6 text-center text-sm text-muted-foreground">{settingsError || 'Loading store settings...'}</p>}
              <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button><Button onClick={() => printInvoice(paperSize)} disabled={!invoice}><Printer className="mr-2 h-4 w-4" /> Print {copies} Copies</Button></DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {completed && invoice && <Dialog open={viewOpen} onOpenChange={setViewOpen}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Invoice Preview</DialogTitle><DialogDescription>{bill.bill_number}</DialogDescription></DialogHeader><div className="flex items-center justify-between gap-3"><span className="text-sm text-muted-foreground">Paper size</span><Select value={paperSize} onValueChange={(value) => setPaperSize(value as PaperSize)}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="80mm">80mm</SelectItem><SelectItem value="58mm">58mm</SelectItem><SelectItem value="A4">A4</SelectItem></SelectContent></Select></div><div className="invoice-preview-scroll"><div className={`invoice-preview-paper invoice-preview-${paperSize.replace('mm', '')}`}><InvoiceReceipt invoice={invoice} copyType="CASHIER" copyLabel={copyLabel(0)} /></div></div><DialogFooter><Button variant="outline" onClick={() => setViewOpen(false)}>Close</Button><Button onClick={() => printInvoice(paperSize)}><Printer className="mr-2 h-4 w-4" /> Print {copies} Copies</Button></DialogFooter></DialogContent></Dialog>}

      {invoice && <div className="invoice-print-root" data-paper-size={paperSize} aria-hidden="true">{Array.from({ length: copies }, (_, index) => <div key={index} className={`invoice-print-copy${index === copies - 1 ? ' invoice-print-copy-last' : ''}`}><InvoiceReceipt invoice={invoice} copyType={index === 0 ? 'CASHIER' : 'DELIVERY'} copyLabel={copyLabel(index)} /></div>)}</div>}
    </>
  );
}