export interface InvoiceItem {
  id: number;
  nameEnglish: string;
  nameTamil: string;
  barcode: string;
  quantity: number;
  unit: string;
  sellingPrice: number;
  gstPercent: number;
  lineTotal: number;
}

export interface InvoiceStoreDetails {
  name: string;
  addressLines: string[];
  phone?: string;
  gstin?: string;
  footerNote?: string;
  showGST: boolean;
  showCustomerDetails: boolean;
  showCashier: boolean;
  showCounter: boolean;
  showBarcode: boolean;
  showQR: boolean;
  qrCodeDataUrl?: string;
  printTamilProductName: boolean;
  printEnglishProductName: boolean;
  copy1Label: string;
  copy2Label: string;
  copies: number;
}

export interface InvoiceReceiptData {
  invoiceNumber: string;
  date: string;
  time: string;
  cashier: string;
  counter: string;
  customer: string;
  customerPhone?: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  grandTotal: number;
  paymentMethod: string;
  storeDetails: InvoiceStoreDetails;
}

const currency = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const amount = (value: number) => currency.format(Number.isFinite(value) ? value : 0);

export function InvoiceReceipt({ invoice, copyType, copyLabel: copyLabelOverride }: { invoice: InvoiceReceiptData; copyType: 'CASHIER' | 'DELIVERY'; copyLabel?: string }) {
  const copyLabel = copyLabelOverride || (copyType === 'CASHIER' ? invoice.storeDetails.copy1Label : invoice.storeDetails.copy2Label);
  const store = invoice.storeDetails;

  return (
    <article className="invoice-receipt receipt">
      <p className="invoice-copy-label">{copyLabel}</p>
      <header className="invoice-header receipt-header">
        <div className="receipt-logo-container">
          <img src="/assets/logo.png" alt="Sree Super Market" className="receipt-logo" />
        </div>
        <h1>{store.name}</h1>
        {store.addressLines.map((line) => <p key={line}>{line}</p>)}
        {store.phone && <p>Phone: {store.phone}</p>}
        {store.gstin && <p>GSTIN: {store.gstin}</p>}
      </header>

      <div className="invoice-divider" />
      <section className="invoice-details receipt-meta">
        <div className="invoice-meta-row"><span className="invoice-meta-label">Bill No:</span><strong>{invoice.invoiceNumber}</strong></div>
        <div className="invoice-meta-row"><span className="invoice-meta-label">Date:</span><strong>{invoice.date}</strong></div>
        <div className="invoice-meta-row"><span className="invoice-meta-label">Time:</span><strong>{invoice.time}</strong></div>
        {store.showCashier && <div className="invoice-meta-row"><span className="invoice-meta-label">Cashier:</span><strong>{invoice.cashier}</strong></div>}
        {store.showCounter && <div className="invoice-meta-row"><span className="invoice-meta-label">Counter:</span><strong>{invoice.counter}</strong></div>}
        {store.showCustomerDetails && <div className="invoice-meta-row"><span className="invoice-meta-label">Customer:</span><strong>{invoice.customer || 'Walk-in Customer'}</strong></div>}
        {store.showCustomerDetails && invoice.customerPhone && <div className="invoice-meta-row"><span className="invoice-meta-label">Phone:</span><strong>{invoice.customerPhone}</strong></div>}
      </section>

      <div className="invoice-divider" />
      <div className="invoice-items-heading receipt-items-heading" aria-hidden="true">
        <span>Item</span><span>Qty</span><span>Rate</span><span>Amount</span>
      </div>
      <div className="invoice-items receipt-items">
        {invoice.items.map((item) => {
          const names = store.printTamilProductName && store.printEnglishProductName
            ? [item.nameTamil, item.nameEnglish]
            : store.printTamilProductName ? [item.nameTamil] : [item.nameEnglish];
          const productNames = names.filter(Boolean);
          if (!productNames.length) productNames.push(item.nameEnglish || item.nameTamil);
          return (
            <div className="invoice-item" key={item.id}>
              <div className="invoice-item-name">
                {productNames.map((name, index) => <span key={`${item.id}-${index}`} lang={name === item.nameTamil ? 'ta' : 'en'} className={index === 0 ? 'font-bold' : undefined}>{name}</span>)}
                {store.showBarcode && item.barcode && <small>Barcode {item.barcode}</small>}
              </div>
              <span className="invoice-number">{item.quantity}</span>
              <span className="invoice-number">{amount(item.sellingPrice)}</span>
              <span className="invoice-number">{amount(item.lineTotal)}</span>
            </div>
          );
        })}
      </div>

      <div className="invoice-divider" />
      <section className="invoice-totals receipt-totals">
        <div><span>Subtotal</span><span>₹{amount(invoice.subtotal)}</span></div>
        <div><span>Discount</span><span>-₹{amount(invoice.discount)}</span></div>
        <div className="invoice-grand-total"><strong>Grand Total</strong><strong>₹{amount(invoice.grandTotal)}</strong></div>
      </section>

      <div className="invoice-divider" />
      <section className="invoice-payment receipt-payment">
        <div><span>Paid - {invoice.paymentMethod}</span><span>₹{amount(invoice.grandTotal)}</span></div>
      </section>

      <footer className="invoice-footer receipt-footer">
        {store.showQR && store.qrCodeDataUrl && <img className="invoice-qr-code" src={store.qrCodeDataUrl} alt="UPI payment QR code" />}
        <strong>Thank You</strong>
        <span>{store.footerNote || 'Thank you for shopping with us.'}</span>
        <span>Visit Again!</span>
      </footer>
    </article>
  );
}