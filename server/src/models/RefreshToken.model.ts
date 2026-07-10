/**
 * Server-side refresh-token registry.
 * Enables rotation, revocation, and re-use detection.
 *
 * On each refresh call we:
 *   1. verify JWT signature
 *   2. look up the jti and confirm it is not revoked
 *   3. mark it revoked, issue a new jti
 * If a revoked jti is re-presented we treat that as compromise
 * and invalidate ALL tokens for that principal.
 */
import { Schema, model, type InferSchemaType, type Model } from 'mongoose';

const refreshTokenSchema = new Schema(
  {
    jti: { type: String, required: true, unique: true, index: true },
    audience: { type: String, enum: ['user', 'admin'], required: true },
    subjectId: { type: Schema.Types.ObjectId, required: true, index: true },
    userAgent: { type: String, default: '' },
    ip: { type: String, default: '' },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    replacedBy: { type: String, default: null }, // jti of the rotated token
  },
  { timestamps: true },
);

// TTL index — Mongo auto-removes docs after expiry.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type RefreshTokenDoc = InferSchemaType<typeof refreshTokenSchema> & {
  _id: Schema.Types.ObjectId;
};
export const RefreshToken: Model<RefreshTokenDoc> = model<RefreshTokenDoc>(
  'RefreshToken',
  refreshTokenSchema,
);
