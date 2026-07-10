/**
 * Per-user cart. One document per user (upsert on write).
 *
 * We store minimal identifiers (productId + sizeVariationId + qty). Prices
 * and totals are recomputed from the live Product on every read — the server
 * is always the source of truth for pricing. This prevents stale-price
 * exploits and lets us drop discounts/coupons/shipping into the same reducer.
 */
import { Schema, model, type InferSchemaType, type Model } from 'mongoose';

const cartItemSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    sizeVariationId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    quantity: { type: Number, required: true, min: 1, max: 20 },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const cartSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    items: { type: [cartItemSchema], default: [] },
    /** Server-set once a valid coupon is applied. Cleared on invalidation. */
    couponCode: { type: String, default: null },
  },
  { timestamps: true },
);

cartSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret: Record<string, unknown>) => {
    delete ret._id;
    return ret;
  },
});

export type CartDoc = InferSchemaType<typeof cartSchema> & {
  _id: Schema.Types.ObjectId;
};
export const Cart: Model<CartDoc> = model<CartDoc>('Cart', cartSchema);
