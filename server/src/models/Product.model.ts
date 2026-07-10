/**
 * Product model.
 *
 * Key rules (Part 2/3):
 *   - 1..7 Cloudinary images per product
 *   - Each product has 1..N size variations, each with independent stock
 *   - Primary variation is flagged; used for card price/stock display
 *   - Slug unique among live products
 *   - Soft delete via deletedAt; 30-day purge handled by a scheduled job (M4+)
 *   - Discount is expressed as percent 0..90 per variation
 */
import { Schema, model, type InferSchemaType, type Model } from 'mongoose';

export type ProductStatus =
  | 'available'
  | 'out_of_stock'
  | 'hidden'
  | 'coming_soon'
  | 'discontinued';

const cloudinaryImageSchema = new Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    width: { type: Number },
    height: { type: Number },
    bytes: { type: Number },
    format: { type: String },
    order: { type: Number, default: 0 },
  },
  { _id: false },
);

const sizeVariationSchema = new Schema(
  {
    size: { type: String, required: true, trim: true }, // e.g. "5x7", "6x9"
    sku: { type: String, trim: true, default: '' },
    price: { type: Number, required: true, min: 0 },
    discountPercent: { type: Number, default: 0, min: 0, max: 90 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    weightKg: { type: Number, default: 0, min: 0 },
    isPrimary: { type: Boolean, default: false },
  },
  { _id: true },
);

const productSchema = new Schema(
  {
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      index: true,
    },
    productType: { type: String, trim: true, default: 'rug' },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    slug: { type: String, required: true, trim: true, lowercase: true },
    description: { type: String, trim: true, default: '' },

    // Attributes
    material: { type: String, trim: true, default: '' },
    origin: { type: String, trim: true, default: '' },
    shape: { type: String, trim: true, default: 'Rectangular' },
    color: { type: String, trim: true, default: '' },
    weightKg: { type: Number, default: 0, min: 0 },
    pileHeightMm: { type: Number, default: 0, min: 0 },
    knotDensity: { type: String, trim: true, default: '' },
    construction: { type: String, trim: true, default: '' },
    careInstructions: { type: String, trim: true, default: '' },
    shippingInfo: { type: String, trim: true, default: '' },
    warranty: { type: String, trim: true, default: '' },

    // Media
    images: {
      type: [cloudinaryImageSchema],
      validate: [
        (v: unknown[]) => Array.isArray(v) && v.length >= 1 && v.length <= 7,
        'Product must have between 1 and 7 images',
      ],
      required: true,
    },

    // Variations
    sizeVariations: {
      type: [sizeVariationSchema],
      validate: [
        (v: unknown[]) => Array.isArray(v) && v.length >= 1,
        'Product must have at least one size variation',
      ],
      required: true,
    },

    // Flags
    status: {
      type: String,
      enum: ['available', 'out_of_stock', 'hidden', 'coming_soon', 'discontinued'],
      default: 'available',
      index: true,
    },
    featured: { type: Boolean, default: false, index: true },
    trending: { type: Boolean, default: false, index: true },
    newArrival: { type: Boolean, default: false, index: true },
    bestSeller: { type: Boolean, default: false, index: true },

    // SEO
    seoTitle: { type: String, trim: true, default: '' },
    seoDescription: { type: String, trim: true, default: '' },
    tags: { type: [String], default: [] },

    // Denormalized (kept in sync at write time)
    minPrice: { type: Number, default: 0, index: true },
    maxDiscountPercent: { type: Number, default: 0 },
    totalStock: { type: Number, default: 0 },

    // Reviews scaffold (populated in a future milestone)
    averageRating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },

    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

/**
 * Unique slug among live products. Also a compound index for the common
 * "products in category, newest first" listing.
 */
productSchema.index(
  { slug: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } },
);
productSchema.index({ categoryId: 1, deletedAt: 1, createdAt: -1 });
productSchema.index({ name: 'text', description: 'text', tags: 'text' });

/**
 * Recompute denormalized fields before every save.
 */
productSchema.pre('save', function preSave(next) {
  const doc = this as unknown as {
    sizeVariations: Array<{
      price: number;
      discountPercent: number;
      stock: number;
      isPrimary: boolean;
    }>;
    minPrice: number;
    maxDiscountPercent: number;
    totalStock: number;
    status: ProductStatus;
  };
  if (Array.isArray(doc.sizeVariations) && doc.sizeVariations.length > 0) {
    // Ensure exactly one primary variation
    const primaryCount = doc.sizeVariations.filter((v) => v.isPrimary).length;
    if (primaryCount === 0) doc.sizeVariations[0].isPrimary = true;
    if (primaryCount > 1) {
      let kept = false;
      for (const v of doc.sizeVariations) {
        if (v.isPrimary && !kept) {
          kept = true;
        } else {
          v.isPrimary = false;
        }
      }
    }
    doc.minPrice = doc.sizeVariations.reduce(
      (m, v) => Math.min(m, netPrice(v.price, v.discountPercent)),
      Number.POSITIVE_INFINITY,
    );
    if (!Number.isFinite(doc.minPrice)) doc.minPrice = 0;
    doc.maxDiscountPercent = doc.sizeVariations.reduce(
      (m, v) => Math.max(m, v.discountPercent ?? 0),
      0,
    );
    doc.totalStock = doc.sizeVariations.reduce((s, v) => s + (v.stock ?? 0), 0);
    // Auto out-of-stock when everything is zero, but never override manual hidden/discontinued
    if (
      doc.totalStock === 0 &&
      doc.status !== 'hidden' &&
      doc.status !== 'discontinued' &&
      doc.status !== 'coming_soon'
    ) {
      doc.status = 'out_of_stock';
    } else if (doc.totalStock > 0 && doc.status === 'out_of_stock') {
      doc.status = 'available';
    }
  }
  next();
});

function netPrice(price: number, discountPercent: number): number {
  const d = Math.max(0, Math.min(90, discountPercent));
  return Math.round(price * (1 - d / 100) * 100) / 100;
}

productSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret: Record<string, unknown>) => {
    delete ret._id;
    return ret;
  },
});

export type ProductDoc = InferSchemaType<typeof productSchema> & {
  _id: Schema.Types.ObjectId;
};
export const Product: Model<ProductDoc> = model<ProductDoc>('Product', productSchema);
