/**
 * Payment records — one per Razorpay attempt. Written on gateway-order
 * creation and updated on verify / webhook / failure.
 *
 * A verified payment is what unlocks order creation (M5 pipeline).
 */
import { Schema, model, type InferSchemaType, type Model } from 'mongoose';

export type PaymentStatus =
  | 'created'      // gateway order created, awaiting user
  | 'attempted'    // user opened checkout / callback received but signature not yet verified
  | 'verified'     // signature verified successfully
  | 'captured'     // webhook confirmed capture (redundant safety net)
  | 'failed'       // signature failed, or webhook marked failed
  | 'refunded';

const paymentSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    gateway: { type: String, enum: ['razorpay'], default: 'razorpay' },
    gatewayOrderId: { type: String, required: true, unique: true, index: true },
    gatewayPaymentId: { type: String, default: null, index: true },
    gatewaySignature: { type: String, default: null },
    amount: { type: Number, required: true, min: 0 }, // major unit (₹)
    amountMinor: { type: Number, required: true, min: 0 }, // paise, what Razorpay stores
    currency: { type: String, enum: ['INR', 'USD'], default: 'INR' },
    status: {
      type: String,
      enum: ['created', 'attempted', 'verified', 'captured', 'failed', 'refunded'],
      default: 'created',
      index: true,
    },
    verified: { type: Boolean, default: false, index: true },
    failureReason: { type: String, default: '' },

    /**
     * Snapshot of the priced cart at the moment of `create-order`. Used at
     * verify time to reconstruct the exact order body without re-reading the
     * cart (which the user could have mutated mid-payment).
     */
    quote: {
      items: {
        type: [
          new Schema(
            {
              productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
              sizeVariationId: { type: Schema.Types.ObjectId, required: true },
              productName: String,
              productSlug: String,
              categoryId: { type: Schema.Types.ObjectId, ref: 'Category' },
              primaryImage: String,
              size: String,
              unitPrice: Number,
              discountPercent: Number,
              netUnitPrice: Number,
              quantity: Number,
              lineTotal: Number,
            },
            { _id: false },
          ),
        ],
        default: [],
      },
      subtotal: { type: Number, default: 0 },
      shipping: { type: Number, default: 0 },
      discount: { type: Number, default: 0 },
      tax: { type: Number, default: 0 },
      grandTotal: { type: Number, default: 0 },
      coupon: {
        code: { type: String, default: null },
        type: { type: String, default: null },
        discountApplied: { type: Number, default: 0 },
        freeShipping: { type: Boolean, default: false },
        couponId: { type: Schema.Types.ObjectId, ref: 'Coupon', default: null },
      },
      addressSnapshot: {
        label: String,
        fullName: String,
        phone: String,
        countryCode: String,
        line1: String,
        line2: String,
        landmark: String,
        city: String,
        state: String,
        country: String,
        zip: String,
      },
    },

    orderId: { type: Schema.Types.ObjectId, ref: 'Order', default: null, index: true },

    verifiedAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

paymentSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret: Record<string, unknown>) => {
    delete ret._id;
    return ret;
  },
});

export type PaymentDoc = InferSchemaType<typeof paymentSchema> & {
  _id: Schema.Types.ObjectId;
};
export const Payment: Model<PaymentDoc> = model<PaymentDoc>('Payment', paymentSchema);
