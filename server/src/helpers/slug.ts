/**
 * Slug helpers. We do not depend on external slug packages to keep the
 * dep tree lean; this handles Unicode → ASCII via NFKD normalisation.
 */
import type { Model } from 'mongoose';

export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

/**
 * Produce a slug that is unique among live docs of the given model.
 * `filter` is the Mongo filter identifying "live" (e.g. { deletedAt: null }).
 * `excludeId` is optional — used when renaming an existing doc.
 */
export async function uniqueSlug<T>(
  model: Model<T>,
  base: string,
  filter: Record<string, unknown> = {},
  excludeId?: string,
): Promise<string> {
  const root = slugify(base) || 'item';
  let candidate = root;
  let i = 2;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const q: Record<string, unknown> = { ...filter, slug: candidate };
    if (excludeId) q._id = { $ne: excludeId };
    const clash = await model.exists(q as never);
    if (!clash) return candidate;
    candidate = `${root}-${i}`;
    i += 1;
    if (i > 999) throw new Error('Could not derive a unique slug');
  }
}
