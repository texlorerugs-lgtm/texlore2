/**
 * Human-friendly, monotonically-improving order + invoice numbers.
 * Format:
 *   TXL-YYYYMMDD-XXXXXX  (order)
 *   INV-YYYYMMDD-XXXXXX  (invoice)
 * XXXXXX is cryptographically random base36 — collision resistance is high
 * and the `unique` index in the Order model catches any theoretical dupe.
 */
import { randomBytes } from 'node:crypto';

function yyyymmdd(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

function suffix(bytes = 4): string {
  return randomBytes(bytes).toString('hex').toUpperCase();
}

export function newOrderNumber(): string {
  return `TXL-${yyyymmdd()}-${suffix(4)}`;
}

export function newInvoiceNumber(): string {
  return `INV-${yyyymmdd()}-${suffix(4)}`;
}
