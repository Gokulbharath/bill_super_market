export const storeConfig = {
  name: 'SREE SUPER MARKET',
  shortName: 'Sree Super Market',
  address: {
    line1: 'Siruvani Main Road',
    line2: 'Alandurai',
    city: 'Coimbatore',
    pincode: '641101',
    state: 'Tamil Nadu',
    country: 'India',
  },
  phone: '',
  gstin: '',
  currency: {
    symbol: '₹',
    code: 'INR',
    locale: 'en-IN',
  },
  timezone: 'Asia/Kolkata',
  logo: {
    text: 'S',
    label: 'SREE SUPER MARKET',
  },
  receipt: {
    copies: 2,
    copy1Label: 'CASHIER COPY',
    copy2Label: 'DELIVERY COPY',
    counter: 'Counter 01',
    footerNote: 'Thank you for shopping with us!',
  },
} as const;

export type StoreConfig = typeof storeConfig;

export const fullStoreAddress = [
  storeConfig.address.line1,
  storeConfig.address.line2,
  `${storeConfig.address.city} - ${storeConfig.address.pincode}`,
  `${storeConfig.address.state}, ${storeConfig.address.country}`,
].join(', ');
