/**
 * User document. Passwords stored only as bcrypt hash.
 * Addresses/cart/wishlist live here for simplicity in v1.
 */
import { Schema, model, type InferSchemaType, type Model } from 'mongoose';

const addressSchema = new Schema(
  {
    label: { type: String, trim: true, default: 'Home' }, // Home / Office / Other
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    countryCode: { type: String, required: true, trim: true, default: '+91' },
    line1: { type: String, required: true, trim: true },
    line2: { type: String, trim: true },
    landmark: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true, default: 'India' },
    zip: { type: String, required: true, trim: true },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true, timestamps: true },
);

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: { type: String, required: true, trim: true, index: true },
    countryCode: { type: String, required: true, trim: true, default: '+91' },
    passwordHash: { type: String, required: true, select: false },
    profileImage: {
      url: { type: String, default: '' },
      publicId: { type: String, default: '' },
    },
    isVerified: { type: Boolean, default: false, index: true },
    isBlocked: { type: Boolean, default: false, index: true },
    role: { type: String, enum: ['user'], default: 'user' },
    addresses: { type: [addressSchema], default: [] },
    lastLoginAt: { type: Date },
    lastLoginIp: { type: String },
  },
  { timestamps: true },
);

// Ensure a user's phone (with country code) is unique across the platform.
userSchema.index({ countryCode: 1, phone: 1 }, { unique: true });

// Never expose passwordHash even if it accidentally gets selected.
userSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret: Record<string, unknown>) => {
    delete ret.passwordHash;
    delete ret._id;
    return ret;
  },
});

export type UserDoc = InferSchemaType<typeof userSchema> & { _id: Schema.Types.ObjectId };
export const User: Model<UserDoc> = model<UserDoc>('User', userSchema);
