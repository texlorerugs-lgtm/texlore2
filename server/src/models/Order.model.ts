/**
 * Order — created ONLY after payment signature verification.
 * Every field is a snapshot at order time so pricing, product names, and
 * addresses stay stable even if the source data later changes.
 */
import { Schema, model, type InferSchemaType, type Model } from 'mongoose';

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

export const ORDER_STATUSES: OrderStatus[] = [
  'pending',
  'confirmed',
  'preparing',
  'packed',
  'shipped',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'returned',
  'refunded',
];

const orderItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    sizeVariationId: { type: Schema.Types.ObjectId, required: true },
    productName: { type: String, required: true },
    productSlug: { type: String, required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category' },
    primaryImage: { type: String, default: '' },
    size: { type: String, required: true },
    unitPrice: { type: Number, required: true, min: 0 },
    discountPercent: { type: Number, default: 0, min: 0 },
    netUnitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const addressSnapshotSchema = new Schema(
  {
    label: String,
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    countryCode: String,
    line1: { type: String, required: true },
    line2: String,
    landmark: String,
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, required: true },
    zip: { type: String, required: true },
  },
  { _id: false },
);

const timelineSchema = new Schema(
  {
    at: { type: Date, default: Date.now },
    status: { type: String },
    note: { type: String, default: '' },
    actorType: { type: String, enum: ['system', 'user', 'admin'], default: 'system' },
    actorId: { type: Schema.Types.ObjectId },
  },
  { _id: false },
);

const orderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    userEmail: { type: String, required: true },
    userName: { type: String, required: true },

    items: { type: [orderItemSchema], required: true },
    address: { type: addressSnapshotSchema, required: true },

    subtotal: { type: Number, required: true, min: 0 },
    shipping: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    grandTotal: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: ['INR', 'USD'], default: 'INR' },

    coupon: {
      code: { type: String, default: null },
      type: { type: String, default: null },
      discountApplied: { type: Number, default: 0 },
      freeShipping: { type: Boolean, default: false },
      couponId: { type: Schema.Types.ObjectId, ref: 'Coupon', default: null },
    },

    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', required: true, index: true },
    gatewayPaymentId: { type: String, required: true, index: true },
    gatewayOrderId: { type: String, required: true, index: true },
    paymentStatus: { type: String, default: 'verified' },

    orderStatus: {
      type: String,
      enum: ORDER_STATUSES,
      default: 'confirmed',
      index: true,
    },
    trackingNumber: { type: String, default: '' },
    courier: { type: String, default: '' },
    expectedDelivery: { type: Date },
    timeline: { type: [timelineSchema], default: [] },

    invoiceNumber: { type: String, required: true, unique: true, index: true },

    /** Filled if the user cancels or admin refunds. */
    cancelledAt: { type: Date, default: null },
    cancelledReason: { type: String, default: '' },
    /** Set true once stock has been restored (cancellation before shipping). */
    stockRestored: { type: Boolean, default: false },
  },
  { timestamps: true },
);

orderSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret: Record<string, unknown>) => {
    delete ret._id;
    return ret;
  },
});

export type OrderDoc = InferSchemaType<typeof orderSchema> & {
  _id: Schema.Types.ObjectId;
};
export const Order: Model<OrderDoc> = model<OrderDoc>('Order', orderSchema);
