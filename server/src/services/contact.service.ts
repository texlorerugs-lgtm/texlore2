/**
 * Contact form service. Persistence is the source of truth — if SMTP fails
 * we still return success to the user and increment emailAttempts for a
 * background retry (see jobs/ in later milestones).
 */
import { Types } from 'mongoose';
import { ContactMessage, type ContactStatus } from '@/models/ContactMessage.model';
import { ApiError } from '@/utils/ApiError';
import { sendAdminContactNotification } from '@/services/email.service';
import { logger } from '@/utils/logger';

export interface ContactInput {
  name: string;
  email: string;
  phone?: string;
  countryCode?: string;
  message: string;
  ip?: string;
  userAgent?: string;
}

export async function submitContact(input: ContactInput): Promise<{ id: string }> {
  const name = input.name?.trim();
  const email = input.email?.toLowerCase().trim();
  const message = input.message?.trim();
  if (!name) throw ApiError.badRequest('Name is required.');
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw ApiError.badRequest('Valid email is required.');
  if (!message || message.length < 8) throw ApiError.badRequest('Message must be at least 8 characters.');
  if (message.length > 5000) throw ApiError.badRequest('Message is too long.');

  // Rate-limit is applied at the route level; here we also prevent spam bursts
  // by a soft per-email quota over 24h.
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recent = await ContactMessage.countDocuments({ email, createdAt: { $gte: dayAgo } });
  if (recent >= 10) {
    throw ApiError.tooMany('Too many messages from this email in the last 24 hours.');
  }

  // 1) Persist first — never lose the message.
  const doc = await ContactMessage.create({
    name,
    email,
    phone: input.phone?.trim() ?? '',
    countryCode: input.countryCode?.trim() ?? '',
    message,
    ip: input.ip ?? '',
    userAgent: input.userAgent ?? '',
  });

  // 2) Attempt email. Success/failure does not affect the API response.
  try {
    const result = await sendAdminContactNotification({
      id: String(doc._id),
      name: doc.name,
      email: doc.email,
      phone: doc.phone,
      countryCode: doc.countryCode,
      message: doc.message,
      createdAt: doc.createdAt as Date,
    });
    if (result.ok) {
      doc.emailNotified = true;
    } else {
      doc.lastEmailError = result.error ?? 'unknown';
    }
    doc.emailAttempts = 1;
    await doc.save();
  } catch (err) {
    logger.error('Contact email send crashed', err);
    doc.emailAttempts = 1;
    doc.lastEmailError = (err as Error).message;
    await doc.save();
  }

  return { id: String(doc._id) };
}

// ---------- Admin ----------

export async function listContactMessages(params: {
  q?: string;
  status?: ContactStatus | 'all';
  page?: number;
  limit?: number;
  sort?: string;
}): Promise<{
  items: unknown[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}> {
  const page = Math.max(1, Number(params.page ?? 1));
  const limit = Math.min(100, Math.max(1, Number(params.limit ?? 20)));
  const filter: Record<string, unknown> = {};
  if (params.status && params.status !== 'all') filter.status = params.status;
  if (params.q?.trim()) {
    const rex = new RegExp(params.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: rex }, { email: rex }, { message: rex }];
  }
  const sort = parseSort(params.sort) ?? { createdAt: -1 };
  const [items, total] = await Promise.all([
    ContactMessage.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
    ContactMessage.countDocuments(filter),
  ]);
  return {
    items: items.map(shape),
    total,
    page,
    limit,
    pages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function updateContactStatus(
  id: string,
  status: ContactStatus,
  adminNote?: string,
): Promise<unknown> {
  if (!Types.ObjectId.isValid(id)) throw ApiError.badRequest('Invalid id.');
  const doc = await ContactMessage.findById(id);
  if (!doc) throw ApiError.notFound('Message not found.');
  doc.status = status;
  if (adminNote !== undefined) doc.adminNote = adminNote;
  await doc.save();
  return shape(doc.toObject() as Record<string, unknown>);
}

export async function deleteContactMessage(id: string): Promise<void> {
  if (!Types.ObjectId.isValid(id)) throw ApiError.badRequest('Invalid id.');
  const r = await ContactMessage.deleteOne({ _id: id });
  if (r.deletedCount === 0) throw ApiError.notFound('Message not found.');
}

function shape(m: Record<string, unknown>): Record<string, unknown> {
  const { _id, ...rest } = m as { _id: unknown } & Record<string, unknown>;
  return { id: String(_id), ...rest };
}

function parseSort(sort?: string): Record<string, 1 | -1> | null {
  if (!sort) return null;
  const out: Record<string, 1 | -1> = {};
  for (const t of sort.split(',')) {
    const [f, d] = t.split(':');
    if (!f) continue;
    out[f.trim()] = d?.trim().toLowerCase() === 'asc' ? 1 : -1;
  }
  return Object.keys(out).length ? out : null;
}
