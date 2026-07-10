/**
 * Category model.
 * Soft-delete via `deletedAt`. Slug auto-generated + unique among non-deleted.
 * Image is a Cloudinary asset (url + publicId).
 */
import { Schema, model, type InferSchemaType, type Model } from 'mongoose';

export type CategoryStatus = 'active' | 'hidden' | 'archived';

const cloudinaryAssetSchema = new Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    width: { type: Number },
    height: { type: Number },
    bytes: { type: Number },
    format: { type: String },
  },
  { _id: false },
);

const categorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, trim: true, lowercase: true },
    description: { type: String, trim: true, default: '' },
    image: { type: cloudinaryAssetSchema, required: true },
    status: {
      type: String,
      enum: ['active', 'hidden', 'archived'],
      default: 'active',
      index: true,
    },
    priority: { type: Number, default: 0 },
    seoTitle: { type: String, trim: true, default: '' },
    seoDescription: { type: String, trim: true, default: '' },
    productCount: { type: Number, default: 0 }, // denormalized, refreshed on write
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

/**
 * Slug must be unique among live (non-deleted) categories.
 * We use a partial unique index so soft-deleted rows do not conflict.
 */
categorySchema.index(
  { slug: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } },
);

categorySchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret: Record<string, unknown>) => {
    delete ret._id;
    return ret;
  },
});

export type CategoryDoc = InferSchemaType<typeof categorySchema> & {
  _id: Schema.Types.ObjectId;
};
export const Category: Model<CategoryDoc> = model<CategoryDoc>('Category', categorySchema);
