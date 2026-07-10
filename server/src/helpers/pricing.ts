/**
 * Pricing helpers — server is the single source of truth for money math.
 * All amounts are stored/computed as INR-major (₹) with 2-decimal rounding.
 */

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function netUnitPrice(price: number, discountPercent: number): number {
  const d = Math.max(0, Math.min(90, discountPercent ?? 0));
  return round2(price * (1 - d / 100));
}

export interface ShippingRule {
  freeAbove: number;
  flat: number;
}

/**
 * Default shipping. In a later milestone these become tenant settings.
 * Free shipping above ₹15,000 (matches the SHIP copy in seed products).
 */
export const DEFAULT_SHIPPING: ShippingRule = {
  freeAbove: 15_000,
  flat: 499,
};

export function computeShipping(subtotal: number, rule: ShippingRule = DEFAULT_SHIPPING): number {
  if (subtotal <= 0) return 0;
  if (subtotal >= rule.freeAbove) return 0;
  return rule.flat;
}
