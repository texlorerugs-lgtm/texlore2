/**
 * Database seed script.
 *
 * Bootstraps:
 *   1. The initial admin from ADMIN_* env vars (idempotent upsert)
 *   2. 4 categories × 5 products = 20 products
 *
 * Every image is uploaded from a source URL to your Cloudinary account so
 * the catalog remains self-contained after the seed completes. Re-running
 * the seed will SKIP entities that already exist (matched by slug), so it
 * is safe to run multiple times without duplicating data or images.
 *
 * Usage: `npm run seed`
 */
import mongoose from 'mongoose';
import { env } from '../src/config/env';
import { connectDatabase, disconnectDatabase } from '../src/config/db';
import { logger } from '../src/utils/logger';
import { Admin } from '../src/models/Admin.model';
import { Category } from '../src/models/Category.model';
import { Product } from '../src/models/Product.model';
import { hashPassword } from '../src/helpers/password';
import { slugify } from '../src/helpers/slug';
import { uploadUrlToCloudinary } from '../src/config/cloudinary';
import { SEED_CATEGORIES, SEED_PRODUCTS } from './seed-data';

async function seedAdmin(): Promise<void> {
  const email = env.ADMIN_EMAIL.toLowerCase().trim();
  const passwordHash = await hashPassword(env.ADMIN_PASSWORD);
  const secretKeyHash = await hashPassword(env.ADMIN_SECRET_KEY);

  const existing = await Admin.findOne({ email });
  if (existing) {
    existing.name = env.ADMIN_NAME;
    existing.passwordHash = passwordHash;
    existing.secretKeyHash = secretKeyHash;
    existing.isActive = true;
    existing.failedAttempts = 0;
    existing.accountLockedUntil = null;
    await existing.save();
    logger.info(`\u267B\uFE0F  Admin refreshed: ${email}`);
    return;
  }
  await Admin.create({
    name: env.ADMIN_NAME,
    email,
    passwordHash,
    secretKeyHash,
    role: 'admin',
    isActive: true,
  });
  logger.info(`\u2705 Admin created: ${email}`);
}

async function seedCategories(): Promise<Map<string, string>> {
  const map = new Map<string, string>(); // key -> categoryId (string)
  for (const c of SEED_CATEGORIES) {
    const slug = slugify(c.name);
    const existing = await Category.findOne({ slug, deletedAt: null });
    if (existing) {
      map.set(c.key, existing._id.toString());
      logger.info(`\u21B7  Category exists, skipping: ${c.name}`);
      continue;
    }
    logger.info(`\u2B06\uFE0F  Uploading image for category: ${c.name}`);
    const asset = await uploadUrlToCloudinary(c.imageUrl, 'categories');
    const doc = await Category.create({
      name: c.name,
      slug,
      description: c.description,
      image: {
        url: asset.url,
        publicId: asset.publicId,
        width: asset.width,
        height: asset.height,
        bytes: asset.bytes,
        format: asset.format,
      },
      priority: c.priority,
      seoTitle: c.seoTitle,
      seoDescription: c.seoDescription,
      status: 'active',
    });
    map.set(c.key, doc._id.toString());
    logger.info(`\u2705 Category created: ${c.name}`);
  }
  return map;
}

async function seedProducts(catMap: Map<string, string>): Promise<void> {
  let created = 0;
  let skipped = 0;
  for (const p of SEED_PRODUCTS) {
    const categoryId = catMap.get(p.categoryKey);
    if (!categoryId) {
      logger.warn(`\u26A0\uFE0F  No category mapping for ${p.categoryKey}, skipping ${p.name}`);
      continue;
    }
    const slug = slugify(p.name);
    const existing = await Product.findOne({ slug, deletedAt: null });
    if (existing) {
      skipped += 1;
      continue;
    }

    logger.info(`\u2B06\uFE0F  Uploading ${p.images.length} images for product: ${p.name}`);
    const assets = [];
    for (const url of p.images) {
      try {
        const a = await uploadUrlToCloudinary(url, 'products');
        assets.push(a);
      } catch (err) {
        logger.error(`Image upload failed for ${p.name}`, err);
      }
    }
    if (assets.length === 0) {
      logger.warn(`\u26A0\uFE0F  Skipping ${p.name} — no images uploaded successfully`);
      continue;
    }

    const vs = p.sizes.map((s, i) => ({
      size: s.size,
      price: s.price,
      discountPercent: s.discountPercent ?? 0,
      stock: s.stock,
      weightKg: s.weightKg ?? 0,
      isPrimary: s.isPrimary ?? (i === 0),
    }));

    await Product.create({
      categoryId,
      name: p.name,
      slug,
      description: p.description,
      material: p.material,
      origin: p.origin,
      shape: p.shape,
      color: p.color,
      weightKg: p.weightKg,
      pileHeightMm: p.pileHeightMm,
      knotDensity: p.knotDensity,
      construction: p.construction,
      careInstructions: p.careInstructions,
      shippingInfo: p.shippingInfo,
      warranty: p.warranty,
      featured: !!p.featured,
      trending: !!p.trending,
      newArrival: !!p.newArrival,
      bestSeller: !!p.bestSeller,
      tags: p.tags,
      seoTitle: p.seoTitle,
      seoDescription: p.seoDescription,
      images: assets.map((a, i) => ({
        url: a.url,
        publicId: a.publicId,
        width: a.width,
        height: a.height,
        bytes: a.bytes,
        format: a.format,
        order: i,
      })),
      sizeVariations: vs,
      status: 'available',
    });
    created += 1;
    logger.info(`\u2705 Product created: ${p.name}`);
  }

  // Refresh category productCount denorms
  for (const [, id] of catMap) {
    const count = await Product.countDocuments({ categoryId: id, deletedAt: null });
    await Category.updateOne({ _id: id }, { $set: { productCount: count } });
  }

  logger.info(`\uD83D\uDCE6 Products: ${created} created, ${skipped} already existed`);
}

async function run(): Promise<void> {
  await connectDatabase();
  logger.info(`Seed connected to database: ${mongoose.connection.name}`);

  await seedAdmin();
  const catMap = await seedCategories();
  await seedProducts(catMap);

  await disconnectDatabase();
  logger.info('\u2728 Seed complete.');
  process.exit(0);
}

run().catch((err) => {
  logger.error('Seed failed', err);
  process.exit(1);
});
