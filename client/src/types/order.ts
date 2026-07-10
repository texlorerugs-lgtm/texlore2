export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'packed'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'returned'
  | 'refunded';

export interface OrderItem {
  productId: string;
  sizeVariationId: string;
  productName: string;
  productSlug: string;
  categoryId?: string;
  primaryImage: string;
  size: string;
  unitPrice: number;
  discountPercent: number;
  netUnitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface OrderAddress {
  label?: string;
  fullName: string;
  phone: string;
  countryCode?: string;
  line1: string;
  line2?: string;
  landmark?: string;
  city: string;
  state: string;
  country: string;
  zip: string;
}

export interface OrderTimelineEntry {
  at: string;
  status: string;
  note?: string;
  actorType: 'system' | 'user' | 'admin';
}

export interface Order {
  id: string;
  orderNumber: string;
  invoiceNumber: string;
  userEmail: string;
  userName: string;
  items: OrderItem[];
  address: OrderAddress;
  subtotal: number;
  shipping: number;
  discount: number;
  tax: number;
  grandTotal: number;
  currency: 'INR' | 'USD';
  coupon: {
    code: string | null;
    type: string | null;
    discountApplied: number;
    freeShipping: boolean;
  };
  paymentId: string;
  gatewayPaymentId: string;
  gatewayOrderId: string;
  paymentStatus: string;
  orderStatus: OrderStatus;
  trackingNumber?: string;
  courier?: string;
  expectedDelivery?: string;
  invoiceUrl?: string;
  timeline: OrderTimelineEntry[];
  createdAt: string;
  updatedAt: string;
}
