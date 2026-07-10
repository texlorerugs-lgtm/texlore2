import type { Request, Response } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import { ok, created } from '@/utils/apiResponse';
import {
  submitContact,
  listContactMessages,
  updateContactStatus,
  deleteContactMessage,
} from '@/services/contact.service';

export const postContact = asyncHandler(async (req: Request, res: Response) => {
  const result = await submitContact({
    name: String(req.body.name ?? ''),
    email: String(req.body.email ?? ''),
    phone: req.body.phone ? String(req.body.phone) : undefined,
    countryCode: req.body.countryCode ? String(req.body.countryCode) : undefined,
    message: String(req.body.message ?? ''),
    ip: (req.headers['x-forwarded-for']?.toString().split(',')[0] ?? req.ip ?? '').trim(),
    userAgent: req.headers['user-agent'] ?? '',
  });
  created(res, { id: result.id }, 'Thanks — your message has been received.');
});

// Admin
export const adminListContact = asyncHandler(async (req: Request, res: Response) => {
  const data = await listContactMessages({
    q: req.query.q as string | undefined,
    status: req.query.status as never,
    page: req.query.page as unknown as number,
    limit: req.query.limit as unknown as number,
    sort: req.query.sort as string | undefined,
  });
  ok(res, data, 'OK');
});

export const adminUpdateContactStatus = asyncHandler(async (req: Request, res: Response) => {
  const m = await updateContactStatus(
    req.params.id,
    req.body.status,
    req.body.adminNote,
  );
  ok(res, { message: m }, 'Updated.');
});

export const adminDeleteContact = asyncHandler(async (req: Request, res: Response) => {
  await deleteContactMessage(req.params.id);
  ok(res, null, 'Deleted.');
});
