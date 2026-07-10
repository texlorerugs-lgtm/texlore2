/**
 * OTP records, one collection covering three purposes:
 *   - signup           (verify email during signup)
 *   - password_reset   (user forgot password)
 *   - admin_login      (admin 5-factor login)
 *
 * The OTP itself is bcrypt-hashed. Docs auto-delete via TTL index.
 */
import { Schema, model, type InferSchemaType, type Model } from 'mongoose';

export type OtpPurpose = 'signup' | 'password_reset' | 'admin_login';

const otpSchema = new Schema(
  {
    identifier: { type: String, required: true, lowercase: true, trim: true, index: true }, // email
    purpose: {
      type: String,
      enum: ['signup', 'password_reset', 'admin_login'],
      required: true,
      index: true,
    },
    codeHash: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, default: null }, // e.g. pending signup fields
    attempts: { type: Number, default: 0 },
    resendCount: { type: Number, default: 0 },
    lastSentAt: { type: Date, default: () => new Date() },
    expiresAt: { type: Date, required: true },
    consumedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Auto-delete once expiry passes.
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Enforce at most one *active* OTP per (identifier, purpose).
otpSchema.index({ identifier: 1, purpose: 1 });

export type OtpDoc = InferSchemaType<typeof otpSchema> & { _id: Schema.Types.ObjectId };
export const Otp: Model<OtpDoc> = model<OtpDoc>('Otp', otpSchema);
