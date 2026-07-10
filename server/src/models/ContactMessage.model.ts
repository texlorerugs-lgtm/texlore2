/**
 * Contact form submissions. The rule (Part 4): the message MUST be saved
 * even if the email notification fails. Email retries happen in a job later.
 */
import { Schema, model, type InferSchemaType, type Model } from 'mongoose';

export type ContactStatus = 'new' | 'read' | 'replied' | 'resolved' | 'archived';

const contactSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: { type: String, trim: true, default: '' },
    countryCode: { type: String, trim: true, default: '' },
    message: { type: String, required: true, trim: true, maxlength: 5000 },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    status: {
      type: String,
      enum: ['new', 'read', 'replied', 'resolved', 'archived'],
      default: 'new',
      index: true,
    },
    adminNote: { type: String, default: '' },
    emailNotified: { type: Boolean, default: false },
    emailAttempts: { type: Number, default: 0 },
    lastEmailError: { type: String, default: '' },
  },
  { timestamps: true },
);

contactSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret: Record<string, unknown>) => {
    delete ret._id;
    return ret;
  },
});

export type ContactMessageDoc = InferSchemaType<typeof contactSchema> & {
  _id: Schema.Types.ObjectId;
};
export const ContactMessage: Model<ContactMessageDoc> = model<ContactMessageDoc>(
  'ContactMessage',
  contactSchema,
);
