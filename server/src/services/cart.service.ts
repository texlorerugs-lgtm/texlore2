/**
 * Cart service. Every read returns a fully priced snapshot; every mutation
 * revalidates against live product stock and prices.
 *
 * Stale-item behaviour: if a product is deleted/hidden/out-of-stock or a
 * size variation vanishes, the item is filtered out of the response and
 * dropped from the DB on next write. Callers get a flag telling them the
 * cart was auto-cleaned so the UI can surface a toast.
 */
import { Types } from 'mongoose';
import { Cart } from '@/models/Cart.model';
import { Product } from '@/models/Product.model';
import { ApiError } from '@/utils/ApiError';
import { netUnitPrice, computeShipping, round2 } from '@/helpers/pricing';
import { validateAndComputeCoupon } from '@/services/coupon.service';
import { logger } from '@/utils/logger';

export interface CartLine {
  itemId: string;
  productId: string;
  productName: string;
  productSlug: string;
  categoryId: string;
  primaryImage: string;
  sizeVariationId: string;
  size: string;
  unitPrice: number;
  discountPercent: number;
  netUnitPrice: number;
  quantity: number;
  lineTotal: number;
  availableStock: number;
  status: 'ok' | 'stock_reduced' | 'unavailable';
}

export interface CartSnapshot {
  userId: string;
  items: CartLine[];
  itemCount: number;
  subtotal: number;
  shipping: number;
  discount: number;
  tax: number;
  grandTotal: number;
  coupon: {
    code: string | null;
    type: 'percent' | 'fixed' | 'free_shipping' | null;
    discountApplied: number;
    freeShipping: boolean;
    message?: string;
  };
  currency: 'INR';
  autoCleaned: boolean;
}

function emptySnapshot(userId: string, code: string | null = null): CartSnapshot {
  return {
    userId,
    items: [],
    itemCount: 0,
    subtotal: 0,
    shipping: 0,
    discount: 0,
    tax: 0,
    grandTotal: 0,
    coupon: {
      code,
      type: null,
      discountApplied: 0,
      freeShipping: false,
    },
    currency: 'INR',
    autoCleaned: false,
  };
}

async function fetchProductsFor(items: Array<{ productId: Types.ObjectId }>): Promise<Map<string, {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  categoryId: Types.ObjectId;
  status: string;
  deletedAt: Date | null;
  images: Array<{ url: string; order: number }>;
  sizeVariations: Array<{
    _id?: Types.ObjectId;
    size: string;
    price: number;
    discountPercent: number;
    stock: number;
  }>;
}>> {
  if (items.length === 0) return new Map();
  // Explicitly cast every id to ObjectId. Some Mongoose 8 versions fail
  // to cast a mixed string/ObjectId array in $in filters against typed
  // fields, producing a CastError. Casting up-front sidesteps the bug.
  const ids = items
    .map((i) => {
      try {
        return i.productId instanceof Types.ObjectId
          ? i.productId
          : new Types.ObjectId(String(i.productId));
      } catch {
        return null;
      }
    })
    .filter((v): v is Types.ObjectId => v !== null);
  if (ids.length === 0) return new Map();
  const docs = await Product.find({ _id: { $in: ids } }).lean();
  const map = new Map<string, ReturnType<typeof buildValue>>();
  for (const d of docs) map.set(String(d._id), buildValue(d));
  return map;

  function buildValue(d: Record<string, unknown>): {
    _id: Types.ObjectId;
    name: string;
    slug: string;
    categoryId: Types.ObjectId;
    status: string;
    deletedAt: Date | null;
    images: Array<{ url: string; order: number }>;
    sizeVariations: Array<{
      _id?: Types.ObjectId;
      size: string;
      price: number;
      discountPercent: number;
      stock: number;
    }>;
  } {
    return {
      _id: d._id as Types.ObjectId,
      name: String(d.name ?? ''),
      slug: String(d.slug ?? ''),
      categoryId: d.categoryId as Types.ObjectId,
      status: String(d.status ?? 'available'),
      deletedAt: (d.deletedAt as Date | null) ?? null,
      images: (d.images as Array<{ url: string; order: number }> | undefined) ?? [],
      sizeVariations:
        (d.sizeVariations as Array<{
          _id?: Types.ObjectId;
          size: string;
          price: number;
          discountPercent: number;
          stock: number;
        }>) ?? [],
    };
  }
}

/**
 * Assemble a priced snapshot for a user's cart. `writeBack=true` will
 * persist any stock-reduction or removal fixups back to the DB.
 */
export async function buildCartSnapshot(
  userId: string,
  opts: { writeBack: boolean } = { writeBack: false },
): Promise<CartSnapshot> {
  if (!Types.ObjectId.isValid(userId)) throw ApiError.badRequest('Invalid user id.');
  const cart = await Cart.findOne({ userId });
  if (!cart || cart.items.length === 0) {
    return emptySnapshot(userId, cart?.couponCode ?? null);
  }

  const productMap = await fetchProductsFor(
    cart.items.map((i) => ({ productId: i.productId as Types.ObjectId })),
  );

  const lines: CartLine[] = [];
  const keepItemIds = new Set<string>();
  let autoCleaned = false;

  for (const item of cart.items) {
    const p = productMap.get(String(item.productId));
    if (!p || p.deletedAt || p.status === 'hidden' || p.status === 'discontinued') {
      autoCleaned = true;
      continue;
    }
    const variation = p.sizeVariations.find(
      (v) => String(v._id) === String(item.sizeVariationId),
    );
    if (!variation) {
      autoCleaned = true;
      continue;
    }
    if (variation.stock <= 0) {
      autoCleaned = true;
      continue;
    }

    let quantity = item.quantity;
    let status: CartLine['status'] = 'ok';
    if (quantity > variation.stock) {
      quantity = variation.stock;
      status = 'stock_reduced';
      autoCleaned = true;
    }
    const net = netUnitPrice(variation.price, variation.discountPercent);
    const images = [...p.images].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    lines.push({
      itemId: String(item._id),
      productId: String(p._id),
      productName: p.name,
      productSlug: p.slug,
      categoryId: String(p.categoryId),
      primaryImage: images[0]?.url ?? '',
      sizeVariationId: String(variation._id),
      size: variation.size,
      unitPrice: variation.price,
      discountPercent: variation.discountPercent,
      netUnitPrice: net,
      quantity,
      lineTotal: round2(net * quantity),
      availableStock: variation.stock,
      status,
    });
    keepItemIds.add(String(item._id));
  }

  if (opts.writeBack && autoCleaned) {
    // Filter + clamp in-place
    const kept = cart.items.filter((i) => keepItemIds.has(String(i._id)));
    for (const it of kept) {
      const line = lines.find((l) => l.itemId === String(it._id));
      if (line && it.quantity !== line.quantity) it.quantity = line.quantity;
    }
    cart.items.splice(0, cart.items.length, ...kept);
    await cart.save();
  }

  const subtotal = round2(lines.reduce((s, l) => s + l.lineTotal, 0));
  let couponInfo: CartSnapshot['coupon'] = {
    code: null,
    type: null,
    discountApplied: 0,
    freeShipping: false,
  };
  let discount = 0;
  let freeShipping = false;

  if (cart.couponCode) {
    try {
      const cResult = await validateAndComputeCoupon({
        code: cart.couponCode,
        userId,
        lines: lines.map((l) => ({
          productId: l.productId,
          categoryId: l.categoryId,
          lineTotal: l.lineTotal,
        })),
        subtotal,
      });
      couponInfo = {
        code: cResult.code,
        type: cResult.type,
        discountApplied: cResult.discountApplied,
        freeShipping: cResult.freeShipping,
      };
      discount = cResult.discountApplied;
      freeShipping = cResult.freeShipping;
    } catch (err) {
      // Coupon no longer valid — silently drop it from the cart.
      logger.info(`Coupon ${cart.couponCode} invalid for user ${userId}: ${(err as Error).message}`);
      couponInfo = {
        code: null,
        type: null,
        discountApplied: 0,
        freeShipping: false,
        message: (err as Error).message,
      };
      cart.couponCode = null;
      if (opts.writeBack) await cart.save();
    }
  }

  let shipping = computeShipping(subtotal - discount);
  if (freeShipping) shipping = 0;
  const tax = 0; // Tax config lives in Settings (M7). Kept in snapshot for clarity.
  const grandTotal = round2(Math.max(0, subtotal - discount + shipping + tax));

  return {
    userId,
    items: lines,
    itemCount: lines.reduce((s, l) => s + l.quantity, 0),
    subtotal,
    shipping,
    discount,
    tax,
    grandTotal,
    coupon: couponInfo,
    currency: 'INR',
    autoCleaned,
  };
}

// --- Mutations ---

async function ensureCart(userId: string): Promise<InstanceType<typeof Cart>> {
  return (
    (await Cart.findOne({ userId })) ??
    (await Cart.create({ userId, items: [], couponCode: null }))
  );
}

export async function addToCart(
  userId: string,
  input: { productId: string; sizeVariationId: string; quantity: number },
): Promise<CartSnapshot> {
  if (!Types.ObjectId.isValid(input.productId)) throw ApiError.badRequest('Invalid product id.');
  if (!Types.ObjectId.isValid(input.sizeVariationId))
    throw ApiError.badRequest('Invalid size variation id.');
  if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > 20) {
    throw ApiError.badRequest('Quantity must be an integer between 1 and 20.');
  }

  const product = await Product.findOne({
    _id: input.productId,
    deletedAt: null,
    // Explicit $or avoids the Mongoose enum casting quirk with $in.
    $or: [{ status: 'available' }, { status: 'out_of_stock' }],
  });
  if (!product) throw ApiError.notFound('Product is unavailable.');
  const variation = product.sizeVariations.find(
    (v) => String(v._id) === input.sizeVariationId,
  );
  if (!variation) throw ApiError.badRequest('Selected size is unavailable.');
  if (variation.stock < 1) throw ApiError.badRequest('This size is out of stock.');

  const cart = await ensureCart(userId);
  const existing = cart.items.find(
    (i) =>
      String(i.productId) === input.productId &&
      String(i.sizeVariationId) === input.sizeVariationId,
  );
  const targetQty = Math.min(20, (existing?.quantity ?? 0) + input.quantity);
  const clamped = Math.min(targetQty, variation.stock);
  if (clamped < 1) throw ApiError.badRequest('Not enough stock for this size.');

  if (existing) {
    existing.quantity = clamped;
  } else {
    cart.items.push({
      productId: new Types.ObjectId(input.productId),
      sizeVariationId: new Types.ObjectId(input.sizeVariationId),
      quantity: clamped,
      addedAt: new Date(),
    });
  }
  await cart.save();
  return buildCartSnapshot(userId, { writeBack: true });
}

export async function updateCartItem(
  userId: string,
  itemId: string,
  quantity: number,
): Promise<CartSnapshot> {
  if (!Types.ObjectId.isValid(itemId)) throw ApiError.badRequest('Invalid cart item id.');
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
    throw ApiError.badRequest('Quantity must be an integer between 1 and 20.');
  }
  const cart = await Cart.findOne({ userId });
  if (!cart) throw ApiError.notFound('Cart is empty.');
  const item = cart.items.find((i) => String(i._id) === itemId);
  if (!item) throw ApiError.notFound('Cart item not found.');

  const product = await Product.findById(item.productId).lean();
  if (!product) throw ApiError.notFound('Product is unavailable.');
  const variation = product.sizeVariations.find(
    (v) => String(v._id) === String(item.sizeVariationId),
  );
  if (!variation) throw ApiError.badRequest('Selected size is unavailable.');

  item.quantity = Math.min(quantity, variation.stock);
  if (item.quantity < 1) throw ApiError.badRequest('Not enough stock for this size.');
  await cart.save();
  return buildCartSnapshot(userId, { writeBack: true });
}

export async function removeCartItem(
  userId: string,
  itemId: string,
): Promise<CartSnapshot> {
  if (!Types.ObjectId.isValid(itemId)) throw ApiError.badRequest('Invalid cart item id.');
  const cart = await Cart.findOne({ userId });
  if (!cart) return buildCartSnapshot(userId);
  cart.items.splice(
    0,
    cart.items.length,
    ...cart.items.filter((i) => String(i._id) !== itemId),
  );
  await cart.save();
  return buildCartSnapshot(userId, { writeBack: true });
}

export async function clearCart(userId: string): Promise<CartSnapshot> {
  const cart = await Cart.findOne({ userId });
  if (cart) {
    cart.items.splice(0, cart.items.length);
    cart.couponCode = null;
    await cart.save();
  }
  return emptySnapshot(userId);
}

export async function applyCoupon(userId: string, code: string): Promise<CartSnapshot> {
  const cart = await ensureCart(userId);
  const normalized = String(code ?? '').toUpperCase().trim();
  if (!normalized) throw ApiError.badRequest('Coupon code is required.');
  cart.couponCode = normalized;
  await cart.save();
  const snap = await buildCartSnapshot(userId, { writeBack: true });
  if (!snap.coupon.code) {
    // buildCartSnapshot cleared it because it failed validation.
    throw ApiError.badRequest(snap.coupon.message ?? 'Coupon is not valid for this cart.');
  }
  return snap;
}

export async function removeCoupon(userId: string): Promise<CartSnapshot> {
  const cart = await Cart.findOne({ userId });
  if (cart && cart.couponCode) {
    cart.couponCode = null;
    await cart.save();
  }
  return buildCartSnapshot(userId, { writeBack: true });
}
