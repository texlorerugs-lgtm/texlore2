/**
 * Coupon model.
 *
 * Types (Part 3):
 *   - percent          → discountValue is percent 0..90
 *   - fixed            → discountValue is amount in default currency (INR)
 *   - free_shipping    → shipping charge waived; discountValue ignored
 *
 * Scope: applies to whole store, one product, one category, or a specific
 * customer (userId). Multiple scopes may be set — all must match.
 *
 * Limits:
 *   - minOrderAmount
 *   - maxDiscountAmount (cap for percent coupons)
 *   - usageLimit         (global cap across all users)
 *   - perUserLimit
 *   - startsAt / expiresAt
 *
 * Usage is tracked in the CouponUsage collection.
 */
import { Schema, model, type InferSchemaType, type Model } from 'mongoose';

export type CouponType = 'percent' | 'fixed' | 'free_shipping';

const couponSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      unique: true,
      index: true,
      maxlength: 40,
    },
    description: { type: String, trim: true, default: '' },
    type: {
      type: String,
      enum: ['percent', 'fixed', 'free_shipping'],
      required: true,
    },
    discountValue: { type: Number, default: 0, min: 0 },
    currency: { type: String, enum: ['INR', 'USD'], default: 'INR' },

    // Scope filters — ALL provided scopes must match
    scopeProductIds: { type: [Schema.Types.ObjectId], ref: 'Product', default: [] },
    scopeCategoryIds: { type: [Schema.Types.ObjectId], ref: 'Category', default: [] },
    scopeUserIds: { type: [Schema.Types.ObjectId], ref: 'User', default: [] },

    // Limits
    minOrderAmount: { type: Number, default: 0, min: 0 },
    maxDiscountAmount: { type: Number, default: 0, min: 0 }, // 0 = no cap
    usageLimit: { type: Number, default: 0, min: 0 }, // 0 = unlimited
    perUserLimit: { type: Number, default: 1, min: 1 },
    usedCount: { type: Number, default: 0, min: 0 },

    // Window
    startsAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },

    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

couponSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret: Record<string, unknown>) => {
    delete ret._id;
    return ret;
  },
});

export type CouponDoc = InferSchemaType<typeof couponSchema> & {
  _id: Schema.Types.ObjectId;
};
export const Coupon: Model<CouponDoc> = model<CouponDoc>('Coupon', couponSchema);

/**
 * CouponUsage — one row per successful order (written from the payment/order
 * pipeline in M5). Enables per-user limit enforcement without scanning orders.
 */
const couponUsageSchema = new Schema(
  {
    couponId: { type: Schema.Types.ObjectId, ref: 'Coupon', required: true, index: true },
    code: { type: String, required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    discountApplied: { type: Number, required: true, min: 0 },
  },
  { timestamps: true },
);
couponUsageSchema.index({ couponId: 1, userId: 1 });

export type CouponUsageDoc = InferSchemaType<typeof couponUsageSchema> & {
  _id: Schema.Types.ObjectId;
};
export const CouponUsage: Model<CouponUsageDoc> = model<CouponUsageDoc>(
  'CouponUsage',
  couponUsageSchema,
);
