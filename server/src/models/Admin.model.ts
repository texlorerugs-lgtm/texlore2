/**
 * Admin document. Distinct from User — separate collection, separate auth.
 * Password AND Secret Key are bcrypt hashed.
 * Failed-login lockout enforced at the model layer.
 */
import { Schema, model, type InferSchemaType, type Model } from 'mongoose';

const loginHistorySchema = new Schema(
  {
    at: { type: Date, default: Date.now },
    ip: String,
    userAgent: String,
    success: Boolean,
    reason: String,
  },
  { _id: false },
);

const adminSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true, select: false },
    secretKeyHash: { type: String, required: true, select: false },
    profileImage: {
      url: { type: String, default: '' },
      publicId: { type: String, default: '' },
    },
    role: { type: String, enum: ['admin', 'superadmin'], default: 'admin' },
    permissions: {
      type: [String],
      default: [
        'category:manage',
        'product:manage',
        'order:manage',
        'coupon:manage',
        'customer:manage',
        'analytics:view',
        'settings:manage',
      ],
    },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
    lastLoginIp: { type: String },
    failedAttempts: { type: Number, default: 0 },
    accountLockedUntil: { type: Date, default: null },
    loginHistory: { type: [loginHistorySchema], default: [] },
  },
  { timestamps: true },
);

adminSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret: Record<string, unknown>) => {
    delete ret.passwordHash;
    delete ret.secretKeyHash;
    delete ret._id;
    return ret;
  },
});

export type AdminDoc = InferSchemaType<typeof adminSchema> & { _id: Schema.Types.ObjectId };
export const Admin: Model<AdminDoc> = model<AdminDoc>('Admin', adminSchema);
