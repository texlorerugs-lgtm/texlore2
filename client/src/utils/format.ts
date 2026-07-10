/**
 * Currency + misc formatters. INR is the display currency in v1 (Razorpay
 * International handles USD server-side; UI stays INR until M6 adds the
 * currency selector).
 */
export function formatINR(n: number): string {
  return `₹${(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}
