/**
 * Coupon validation + admin CRUD.
 *
 * Public API surface:
 *   - validateAndComputeCoupon → used by cart + checkout to price the coupon
 *
 * Admin API surface:
 *   - create / update / delete / restore / list / get
 *
 * Discount computation only considers eligible line totals (scope-matched).
 * For `percent`: eligible subtotal × pct, capped by maxDiscountAmount.
 * For `fixed`:   min(discountValue, eligible subtotal).
 * For `free_shipping`: no cart discount, sets shipping to 0 at snapshot time.
 */
import { Types } from 'mongoose';
import { Coupon, CouponUsage, type CouponType } from '@/models/Coupon.model';
import { ApiError } from '@/utils/ApiError';
import { round2 } from '@/helpers/pricing';

export interface CouponLineInput {
  productId: string;
  categoryId: string;
  lineTotal: number;
}

export interface CouponComputeResult {
  couponId: string;
  code: string;
  type: CouponType;
  eligibleSubtotal: number;
  discountApplied: number;
  freeShipping: boolean;
}

export async function validateAndComputeCoupon(params: {
  code: string;
  userId: string;
  lines: CouponLineInput[];
  subtotal: number;
}): Promise<CouponComputeResult> {
  const code = String(params.code ?? '').toUpperCase().trim();
  if (!code) throw ApiError.badRequest('Coupon code is required.');
  const now = new Date();

  const coupon = await Coupon.findOne({ code, deletedAt: null });
  if (!coupon) throw ApiError.badRequest('Invalid coupon code.');
  if (!coupon.isActive) throw ApiError.badRequest('This coupon is not active.');
  if (coupon.startsAt && coupon.startsAt.getTime() > now.getTime()) {
    throw ApiError.badRequest('This coupon is not yet active.');
  }
  if (coupon.expiresAt && coupon.expiresAt.getTime() < now.getTime()) {
    throw ApiError.badRequest('This coupon has expired.');
  }
  if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
    throw ApiError.badRequest('This coupon has reached its usage limit.');
  }
  if (params.subtotal < coupon.minOrderAmount) {
    throw ApiError.badRequest(
      `Minimum order of ₹${coupon.minOrderAmount.toLocaleString('en-IN')} required for this coupon.`,
    );
  }

  // User scope
  if (coupon.scopeUserIds?.length) {
    const allowed = coupon.scopeUserIds.some((u) => String(u) === params.userId);
    if (!allowed) throw ApiError.badRequest('This coupon is not available for your account.');
  }

  // Per-user usage limit
  if (coupon.perUserLimit > 0) {
    const usedByUser = await CouponUsage.countDocuments({
      couponId: coupon._id,
      userId: params.userId,
    });
    if (usedByUser >= coupon.perUserLimit) {
      throw ApiError.badRequest('You have already used this coupon the maximum number of times.');
    }
  }

  // Product/category scope filter — only matching lines contribute
  const prodScope = new Set((coupon.scopeProductIds ?? []).map((p) => String(p)));
  const catScope = new Set((coupon.scopeCategoryIds ?? []).map((c) => String(c)));
  const scopeFilter = (line: CouponLineInput): boolean => {
    if (prodScope.size > 0 && !prodScope.has(line.productId)) return false;
    if (catScope.size > 0 && !catScope.has(line.categoryId)) return false;
    return true;
  };
  const eligibleLines = params.lines.filter(scopeFilter);
  const eligibleSubtotal = round2(
    eligibleLines.reduce((s, l) => s + l.lineTotal, 0),
  );
  if (eligibleSubtotal <= 0 && coupon.type !== 'free_shipping') {
    throw ApiError.badRequest('No items in your cart qualify for this coupon.');
  }

  let discountApplied = 0;
  let freeShipping = false;

  if (coupon.type === 'percent') {
    if (coupon.discountValue <= 0 || coupon.discountValue > 90) {
      throw ApiError.badRequest('Coupon is misconfigured.');
    }
    let d = round2(eligibleSubtotal * (coupon.discountValue / 100));
    if (coupon.maxDiscountAmount > 0) d = Math.min(d, coupon.maxDiscountAmount);
    discountApplied = d;
  } else if (coupon.type === 'fixed') {
    if (coupon.discountValue <= 0) {
      throw ApiError.badRequest('Coupon is misconfigured.');
    }
    discountApplied = Math.min(coupon.discountValue, eligibleSubtotal);
  } else if (coupon.type === 'free_shipping') {
    freeShipping = true;
  }

  return {
    couponId: String(coupon._id),
    code: coupon.code,
    type: coupon.type,
    eligibleSubtotal,
    discountApplied: round2(discountApplied),
    freeShipping,
  };
}

/**
 * Record coupon usage — called from the order pipeline in M5 after payment
 * verification. Increments the global counter atomically.
 */
export async function recordCouponUsage(params: {
  couponId: string;
  code: string;
  userId: string;
  orderId?: string;
  discountApplied: number;
}): Promise<void> {
  if (!Types.ObjectId.isValid(params.couponId)) return;
  await Promise.all([
    CouponUsage.create({
      couponId: params.couponId,
      code: params.code,
      userId: params.userId,
      orderId: params.orderId,
      discountApplied: params.discountApplied,
    }),
    Coupon.updateOne({ _id: params.couponId }, { $inc: { usedCount: 1 } }),
  ]);
}

// ---------- Admin CRUD ----------

export interface CouponInput {
  code: string;
  description?: string;
  type: CouponType;
  discountValue?: number;
  scopeProductIds?: string[];
  scopeCategoryIds?: string[];
  scopeUserIds?: string[];
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  usageLimit?: number;
  perUserLimit?: number;
  startsAt?: string | null;
  expiresAt?: string | null;
  isActive?: boolean;
}

function validateInput(input: CouponInput, forCreate: boolean): void {
  if (forCreate && !input.code?.trim()) throw ApiError.badRequest('Coupon code is required.');
  if (input.type === 'percent') {
    if (!(typeof input.discountValue === 'number' && input.discountValue > 0 && input.discountValue <= 90)) {
      throw ApiError.badRequest('Percent coupons need a discountValue between 1 and 90.');
    }
  } else if (input.type === 'fixed') {
    if (!(typeof input.discountValue === 'number' && input.discountValue > 0)) {
      throw ApiError.badRequest('Fixed coupons need a positive discountValue.');
    }
  }
  if (input.startsAt && input.expiresAt) {
    const s = new Date(input.startsAt).getTime();
    const e = new Date(input.expiresAt).getTime();
    if (Number.isFinite(s) && Number.isFinite(e) && s > e) {
      throw ApiError.badRequest('startsAt must be before expiresAt.');
    }
  }
  for (const arr of [input.scopeProductIds, input.scopeCategoryIds, input.scopeUserIds]) {
    if (arr) for (const id of arr) if (!Types.ObjectId.isValid(id))
      throw ApiError.badRequest(`Invalid id in scope: ${id}`);
  }
}

export async function createCoupon(input: CouponInput, adminId?: string): Promise<unknown> {
  validateInput(input, true);
  const code = input.code.toUpperCase().trim();
  const exists = await Coupon.findOne({ code, deletedAt: null }).lean();
  if (exists) throw ApiError.conflict('A coupon with this code already exists.');
  const doc = await Coupon.create({
    code,
    description: input.description ?? '',
    type: input.type,
    discountValue: input.discountValue ?? 0,
    scopeProductIds: input.scopeProductIds ?? [],
    scopeCategoryIds: input.scopeCategoryIds ?? [],
    scopeUserIds: input.scopeUserIds ?? [],
    minOrderAmount: input.minOrderAmount ?? 0,
    maxDiscountAmount: input.maxDiscountAmount ?? 0,
    usageLimit: input.usageLimit ?? 0,
    perUserLimit: input.perUserLimit ?? 1,
    startsAt: input.startsAt ? new Date(input.startsAt) : null,
    expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    isActive: input.isActive ?? true,
    createdBy: adminId,
  });
  return doc.toJSON();
}

export async function updateCoupon(id: string, input: Partial<CouponInput>): Promise<unknown> {
  if (!Types.ObjectId.isValid(id)) throw ApiError.badRequest('Invalid coupon id.');
  const doc = await Coupon.findOne({ _id: id, deletedAt: null });
  if (!doc) throw ApiError.notFound('Coupon not found.');
  validateInput({ ...doc.toObject(), ...input } as CouponInput, false);

  if (input.code && input.code.toUpperCase().trim() !== doc.code) {
    const nextCode = input.code.toUpperCase().trim();
    const clash = await Coupon.findOne({
      _id: { $ne: doc._id },
      code: nextCode,
      deletedAt: null,
    }).lean();
    if (clash) throw ApiError.conflict('A coupon with this code already exists.');
    doc.code = nextCode;
  }
  if (input.description !== undefined) doc.description = input.description;
  if (input.type !== undefined) doc.type = input.type;
  if (input.discountValue !== undefined) doc.discountValue = input.discountValue;
  if (input.scopeProductIds) doc.scopeProductIds = input.scopeProductIds.map((s) => new Types.ObjectId(s));
  if (input.scopeCategoryIds) doc.scopeCategoryIds = input.scopeCategoryIds.map((s) => new Types.ObjectId(s));
  if (input.scopeUserIds) doc.scopeUserIds = input.scopeUserIds.map((s) => new Types.ObjectId(s));
  if (input.minOrderAmount !== undefined) doc.minOrderAmount = input.minOrderAmount;
  if (input.maxDiscountAmount !== undefined) doc.maxDiscountAmount = input.maxDiscountAmount;
  if (input.usageLimit !== undefined) doc.usageLimit = input.usageLimit;
  if (input.perUserLimit !== undefined) doc.perUserLimit = input.perUserLimit;
  if (input.startsAt !== undefined) doc.startsAt = input.startsAt ? new Date(input.startsAt) : null;
  if (input.expiresAt !== undefined) doc.expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
  if (input.isActive !== undefined) doc.isActive = input.isActive;
  await doc.save();
  return doc.toJSON();
}

export async function softDeleteCoupon(id: string): Promise<void> {
  if (!Types.ObjectId.isValid(id)) throw ApiError.badRequest('Invalid coupon id.');
  const doc = await Coupon.findOne({ _id: id, deletedAt: null });
  if (!doc) throw ApiError.notFound('Coupon not found.');
  doc.deletedAt = new Date();
  doc.isActive = false;
  await doc.save();
}

export async function restoreCoupon(id: string): Promise<unknown> {
  if (!Types.ObjectId.isValid(id)) throw ApiError.badRequest('Invalid coupon id.');
  const doc = await Coupon.findById(id);
  if (!doc) throw ApiError.notFound('Coupon not found.');
  if (!doc.deletedAt) throw ApiError.badRequest('Coupon is not deleted.');
  const clash = await Coupon.findOne({
    _id: { $ne: doc._id },
    code: doc.code,
    deletedAt: null,
  }).lean();
  if (clash) throw ApiError.conflict('A live coupon with this code already exists.');
  doc.deletedAt = null;
  doc.isActive = true;
  await doc.save();
  return doc.toJSON();
}

export async function listCouponsAdmin(params: {
  q?: string;
  isActive?: boolean;
  includeDeleted?: boolean;
  sort?: string;
  page?: number;
  limit?: number;
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
  if (!params.includeDeleted) filter.deletedAt = null;
  if (params.isActive !== undefined) filter.isActive = params.isActive;
  if (params.q?.trim()) {
    const rex = new RegExp(params.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ code: rex }, { description: rex }];
  }
  const sort = parseSort(params.sort) ?? { createdAt: -1 };
  const [items, total] = await Promise.all([
    Coupon.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
    Coupon.countDocuments(filter),
  ]);
  return {
    items: items.map((c) => {
      const { _id, ...rest } = c;
      return { id: String(_id), ...rest };
    }),
    total,
    page,
    limit,
    pages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function getCouponById(id: string): Promise<unknown> {
  if (!Types.ObjectId.isValid(id)) throw ApiError.badRequest('Invalid coupon id.');
  const c = await Coupon.findById(id).lean();
  if (!c) throw ApiError.notFound('Coupon not found.');
  const { _id, ...rest } = c;
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
