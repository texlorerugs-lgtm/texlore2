import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAdmin, requirePermission } from '@/middlewares/admin';
import { validate } from '@/middlewares/validate';
import {
  submitContactValidators,
  updateStatusValidators,
  idParam,
  listContactValidators,
} from '@/validators/contact.validator';
import {
  postContact,
  adminListContact,
  adminUpdateContactStatus,
  adminDeleteContact,
} from '@/controllers/contact.controller';

// Public form gets its own stricter limiter (5 per 10 min per IP).
const contactLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many contact submissions from this IP. Please try again later.',
    data: null,
    errors: null,
  },
});

// Public
export const contactPublicRouter = Router();
contactPublicRouter.post('/', contactLimiter, submitContactValidators, validate, postContact);

// Admin
export const contactAdminRouter = Router();
contactAdminRouter.use(requireAdmin, requirePermission('customer:manage'));
contactAdminRouter.get('/', listContactValidators, validate, adminListContact);
contactAdminRouter.patch('/:id/status', updateStatusValidators, validate, adminUpdateContactStatus);
contactAdminRouter.delete('/:id', idParam, validate, adminDeleteContact);
