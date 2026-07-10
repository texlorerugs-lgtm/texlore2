export interface CartLine {
  itemId: string;
  productId: string;
  productName: string;
  productSlug: string;
  categoryId: string;
  primaryImage: string;
  sizeVariationId: string;
  size: string;
  unitPrice: number;
  discountPercent: number;
  netUnitPrice: number;
  quantity: number;
  lineTotal: number;
  availableStock: number;
  status: 'ok' | 'stock_reduced' | 'unavailable';
}

export interface CartCoupon {
  code: string | null;
  type: 'percent' | 'fixed' | 'free_shipping' | null;
  discountApplied: number;
  freeShipping: boolean;
  message?: string;
}

export interface CartSnapshot {
  userId: string;
  items: CartLine[];
  itemCount: number;
  subtotal: number;
  shipping: number;
  discount: number;
  tax: number;
  grandTotal: number;
  coupon: CartCoupon;
  currency: 'INR';
  autoCleaned: boolean;
}

export interface Address {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  countryCode: string;
  line1: string;
  line2?: string;
  landmark?: string;
  city: string;
  state: string;
  country: string;
  zip: string;
  isDefault: boolean;
}

export type AddressInput = Omit<Address, 'id' | 'isDefault'> & { isDefault?: boolean };
