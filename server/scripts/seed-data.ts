/**
 * Catalog seed data.
 * Only the initial showcase catalog (Part 1 rule): 4 categories × 5 products.
 * All image URLs point to Unsplash — Cloudinary uploads and hosts copies.
 */

export interface SeedCategory {
  key: string; // internal lookup key used to link products
  name: string;
  description: string;
  imageUrl: string;
  priority: number;
  seoTitle: string;
  seoDescription: string;
}

export interface SeedProduct {
  categoryKey: string;
  name: string;
  description: string;
  material: string;
  origin: string;
  shape: string;
  color: string;
  weightKg: number;
  pileHeightMm: number;
  knotDensity: string;
  construction: string;
  careInstructions: string;
  shippingInfo: string;
  warranty: string;
  featured?: boolean;
  trending?: boolean;
  newArrival?: boolean;
  bestSeller?: boolean;
  tags: string[];
  seoTitle: string;
  seoDescription: string;
  images: string[]; // remote URLs
  sizes: Array<{
    size: string;
    price: number;
    discountPercent?: number;
    stock: number;
    weightKg?: number;
    isPrimary?: boolean;
  }>;
}

export const SEED_CATEGORIES: SeedCategory[] = [
  {
    key: 'persian',
    name: 'Persian Rugs',
    description:
      'Timeless handwoven Persian rugs from master ateliers — intricate medallions, botanical motifs, and warm heritage palettes.',
    imageUrl:
      'https://images.unsplash.com/photo-1600166898405-da9535204843?w=1600&q=80',
    priority: 100,
    seoTitle: 'Persian Rugs — Handwoven Heritage Collection | Texlore',
    seoDescription:
      'Shop handwoven Persian rugs featuring classic medallion and botanical motifs. Free shipping across India, worldwide delivery.',
  },
  {
    key: 'modern',
    name: 'Modern Rugs',
    description:
      'Contemporary designs for minimalist interiors — abstract geometry, muted palettes, and clean textures.',
    imageUrl:
      'https://images.unsplash.com/photo-1615529182904-14819c35db37?w=1600&q=80',
    priority: 90,
    seoTitle: 'Modern Rugs — Contemporary Designs | Texlore',
    seoDescription:
      'Modern rugs with abstract, geometric, and minimalist designs. Perfect for contemporary living rooms and bedrooms.',
  },
  {
    key: 'handmade',
    name: 'Handmade Rugs',
    description:
      'Artisan hand-knotted and hand-tufted pieces — every weave tells a story.',
    imageUrl:
      'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=1600&q=80',
    priority: 80,
    seoTitle: 'Handmade Rugs — Artisan Hand-Knotted Pieces | Texlore',
    seoDescription:
      'Discover authentic handmade rugs crafted by master weavers. Hand-knotted and hand-tufted with premium natural fibers.',
  },
  {
    key: 'luxury',
    name: 'Luxury Rugs',
    description:
      'Signature statement pieces in silk, wool, and viscose — for those who demand the finest.',
    imageUrl:
      'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1600&q=80',
    priority: 110,
    seoTitle: 'Luxury Rugs — Premium Silk & Wool | Texlore',
    seoDescription:
      'Luxury rugs in silk, wool, and viscose blends. Statement pieces designed to transform any interior.',
  },
];

// Curated Unsplash rug/carpet imagery
const IMG = {
  persian1: 'https://images.unsplash.com/photo-1600166898405-da9535204843?w=1600&q=80',
  persian2: 'https://images.unsplash.com/photo-1583845112203-29329902332e?w=1600&q=80',
  persian3: 'https://images.unsplash.com/photo-1600166898405-da9535204843?w=1600&q=80',
  persian4: 'https://images.unsplash.com/photo-1615529182904-14819c35db37?w=1600&q=80',
  persian5: 'https://images.unsplash.com/photo-1616627452515-40de8a94a20d?w=1600&q=80',
  modern1: 'https://images.unsplash.com/photo-1615529162924-f8605388461d?w=1600&q=80',
  modern2: 'https://images.unsplash.com/photo-1567016432779-094069958ea5?w=1600&q=80',
  modern3: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1600&q=80',
  modern4: 'https://images.unsplash.com/photo-1615873968403-89e068629265?w=1600&q=80',
  hand1: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=1600&q=80',
  hand2: 'https://images.unsplash.com/photo-1618220179428-22790b461013?w=1600&q=80',
  hand3: 'https://images.unsplash.com/photo-1594026112284-02bb6f3352fe?w=1600&q=80',
  hand4: 'https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=1600&q=80',
  lux1: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1600&q=80',
  lux2: 'https://images.unsplash.com/photo-1567016376408-0226e4d0c1ea?w=1600&q=80',
  lux3: 'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=1600&q=80',
  lux4: 'https://images.unsplash.com/photo-1615874959474-d609969a20ed?w=1600&q=80',
} as const;

const CARE =
  'Vacuum regularly using low suction. Rotate every 3–6 months to distribute wear. Spot-clean spills with mild detergent and cold water. Professional dry cleaning recommended annually.';

const SHIP =
  'Ships within 3–5 business days across India. International delivery in 10–14 business days. Free shipping on orders above ₹15,000.';

export const SEED_PRODUCTS: SeedProduct[] = [
  // ---------- PERSIAN (5) ----------
  {
    categoryKey: 'persian',
    name: 'Isfahan Medallion Wool Rug',
    description:
      'A classic Isfahan-inspired medallion in ivory, garnet, and midnight blue. Hand-knotted from long-staple New Zealand wool, this rug brings centuries of Persian tradition into your home.',
    material: 'Hand-knotted New Zealand Wool',
    origin: 'India (Persian design)',
    shape: 'Rectangular',
    color: 'Ivory, Garnet, Midnight',
    weightKg: 12,
    pileHeightMm: 12,
    knotDensity: '150 KPSI',
    construction: 'Hand-knotted',
    careInstructions: CARE,
    shippingInfo: SHIP,
    warranty: '5-year weave warranty',
    featured: true,
    bestSeller: true,
    tags: ['persian', 'medallion', 'wool', 'traditional'],
    seoTitle: 'Isfahan Medallion Wool Rug | Texlore Persian Collection',
    seoDescription:
      'Hand-knotted Persian medallion rug in ivory, garnet, and midnight. New Zealand wool, 150 KPSI.',
    images: [IMG.persian1, IMG.persian2, IMG.persian3],
    sizes: [
      { size: '5x7 ft', price: 24999, discountPercent: 10, stock: 8, weightKg: 9, isPrimary: true },
      { size: '6x9 ft', price: 34999, discountPercent: 10, stock: 5, weightKg: 12 },
      { size: '8x10 ft', price: 52999, discountPercent: 5, stock: 3, weightKg: 18 },
    ],
  },
  {
    categoryKey: 'persian',
    name: 'Tabriz Floral Garden',
    description:
      'Densely woven Tabriz-inspired floral pattern rendered in soft botanicals. Perfect for formal living rooms and dining spaces.',
    material: 'Hand-knotted Wool & Silk',
    origin: 'India (Persian design)',
    shape: 'Rectangular',
    color: 'Rose, Sage, Cream',
    weightKg: 14,
    pileHeightMm: 10,
    knotDensity: '200 KPSI',
    construction: 'Hand-knotted',
    careInstructions: CARE,
    shippingInfo: SHIP,
    warranty: '5-year weave warranty',
    featured: true,
    tags: ['persian', 'floral', 'silk-blend'],
    seoTitle: 'Tabriz Floral Garden Rug | Texlore',
    seoDescription:
      'Densely knotted Tabriz-style rug with a floral garden pattern in rose, sage, and cream tones.',
    images: [IMG.persian2, IMG.persian4, IMG.persian1],
    sizes: [
      { size: '5x7 ft', price: 29999, discountPercent: 15, stock: 6, weightKg: 10, isPrimary: true },
      { size: '6x9 ft', price: 42999, discountPercent: 15, stock: 4, weightKg: 14 },
    ],
  },
  {
    categoryKey: 'persian',
    name: 'Kashan Deep Ruby Rug',
    description:
      'Deep ruby field with a classical Kashan medallion. Traditional palette with a slightly softer knot for everyday comfort.',
    material: 'Hand-knotted Wool',
    origin: 'India',
    shape: 'Rectangular',
    color: 'Ruby, Navy, Ivory',
    weightKg: 11,
    pileHeightMm: 13,
    knotDensity: '120 KPSI',
    construction: 'Hand-knotted',
    careInstructions: CARE,
    shippingInfo: SHIP,
    warranty: '3-year weave warranty',
    tags: ['persian', 'kashan', 'traditional'],
    seoTitle: 'Kashan Deep Ruby Wool Rug | Texlore',
    seoDescription:
      'Traditional Kashan wool rug in deep ruby with medallion, ideal for classic interiors.',
    images: [IMG.persian3, IMG.persian5],
    sizes: [
      { size: '4x6 ft', price: 18999, stock: 10, weightKg: 6, isPrimary: true },
      { size: '5x8 ft', price: 26999, stock: 6, weightKg: 9 },
    ],
  },
  {
    categoryKey: 'persian',
    name: 'Herati Botanical Runner',
    description:
      'Long hallway runner featuring the traditional Herati botanical repeat pattern. Available in three lengths.',
    material: 'Hand-tufted Wool',
    origin: 'India',
    shape: 'Runner',
    color: 'Indigo, Amber, Ivory',
    weightKg: 6,
    pileHeightMm: 11,
    knotDensity: '100 KPSI',
    construction: 'Hand-tufted',
    careInstructions: CARE,
    shippingInfo: SHIP,
    warranty: '3-year weave warranty',
    trending: true,
    tags: ['persian', 'runner', 'herati'],
    seoTitle: 'Herati Botanical Runner Rug | Texlore',
    seoDescription:
      'Traditional Herati runner in indigo, amber, and ivory. Hallway-friendly lengths.',
    images: [IMG.persian4, IMG.persian2],
    sizes: [
      { size: '2.5x8 ft', price: 8999, stock: 14, weightKg: 4, isPrimary: true },
      { size: '2.5x10 ft', price: 11999, stock: 10, weightKg: 5 },
      { size: '2.5x12 ft', price: 13999, stock: 7, weightKg: 6 },
    ],
  },
  {
    categoryKey: 'persian',
    name: 'Nain Silk Highlight Rug',
    description:
      'Fine wool ground with silk highlights that catch the light beautifully. A show-stopping centrepiece for luxury interiors.',
    material: 'Wool with Silk Highlights',
    origin: 'India',
    shape: 'Rectangular',
    color: 'Ivory, Powder Blue, Champagne',
    weightKg: 10,
    pileHeightMm: 9,
    knotDensity: '220 KPSI',
    construction: 'Hand-knotted',
    careInstructions: CARE,
    shippingInfo: SHIP,
    warranty: '5-year weave warranty',
    featured: true,
    trending: true,
    tags: ['persian', 'silk', 'luxury'],
    seoTitle: 'Nain Silk-Highlight Wool Rug | Texlore',
    seoDescription:
      'Wool rug with silk highlights in ivory, powder blue, and champagne. 220 KPSI.',
    images: [IMG.persian5, IMG.persian1, IMG.persian2],
    sizes: [
      { size: '5x7 ft', price: 36999, discountPercent: 10, stock: 5, weightKg: 8, isPrimary: true },
      { size: '6x9 ft', price: 52999, discountPercent: 10, stock: 3, weightKg: 11 },
    ],
  },

  // ---------- MODERN (5) ----------
  {
    categoryKey: 'modern',
    name: 'Aurora Abstract Rug',
    description:
      'Soft gradient washes in dusk tones. Machine-tuned wool blend that captures a modern painterly aesthetic.',
    material: 'Wool + Viscose Blend',
    origin: 'India',
    shape: 'Rectangular',
    color: 'Slate, Blush, Cream',
    weightKg: 9,
    pileHeightMm: 8,
    knotDensity: '—',
    construction: 'Power-loomed',
    careInstructions: CARE,
    shippingInfo: SHIP,
    warranty: '2-year warranty',
    newArrival: true,
    trending: true,
    tags: ['modern', 'abstract', 'gradient'],
    seoTitle: 'Aurora Abstract Modern Rug | Texlore',
    seoDescription:
      'Modern gradient rug in slate, blush, and cream. Wool + viscose blend, softly painterly finish.',
    images: [IMG.modern1, IMG.modern2],
    sizes: [
      { size: '5x7 ft', price: 12999, stock: 20, weightKg: 6, isPrimary: true },
      { size: '6x9 ft', price: 18999, stock: 15, weightKg: 9 },
      { size: '8x10 ft', price: 27999, stock: 8, weightKg: 13 },
    ],
  },
  {
    categoryKey: 'modern',
    name: 'Geo Grid Charcoal',
    description:
      'A sharp grid geometry in charcoal and bone. Grounds a room without dominating it.',
    material: 'Polyester Blend',
    origin: 'India',
    shape: 'Rectangular',
    color: 'Charcoal, Bone',
    weightKg: 7,
    pileHeightMm: 6,
    knotDensity: '—',
    construction: 'Power-loomed',
    careInstructions: CARE,
    shippingInfo: SHIP,
    warranty: '1-year warranty',
    newArrival: true,
    tags: ['modern', 'geometric', 'minimal'],
    seoTitle: 'Geo Grid Charcoal Modern Rug | Texlore',
    seoDescription:
      'Modern grid-pattern rug in charcoal and bone. Understated and versatile.',
    images: [IMG.modern2, IMG.modern4],
    sizes: [
      { size: '4x6 ft', price: 6499, stock: 25, weightKg: 4, isPrimary: true },
      { size: '5x7 ft', price: 8999, stock: 20, weightKg: 6 },
      { size: '6x9 ft', price: 12999, stock: 12, weightKg: 8 },
    ],
  },
  {
    categoryKey: 'modern',
    name: 'Moonstone Round Rug',
    description:
      'A soft round rug with a subtle concentric pattern — perfect for reading nooks and bedside spaces.',
    material: 'Wool Blend',
    origin: 'India',
    shape: 'Round',
    color: 'Moonstone Grey',
    weightKg: 5,
    pileHeightMm: 10,
    knotDensity: '—',
    construction: 'Hand-tufted',
    careInstructions: CARE,
    shippingInfo: SHIP,
    warranty: '2-year warranty',
    tags: ['modern', 'round', 'bedroom'],
    seoTitle: 'Moonstone Round Modern Rug | Texlore',
    seoDescription:
      'Round wool-blend rug in moonstone grey with a subtle concentric pattern.',
    images: [IMG.modern3, IMG.modern1],
    sizes: [
      { size: 'Ø 5 ft', price: 8999, stock: 15, weightKg: 5, isPrimary: true },
      { size: 'Ø 6 ft', price: 11999, stock: 10, weightKg: 6 },
    ],
  },
  {
    categoryKey: 'modern',
    name: 'Onyx Minimal Rug',
    description:
      'A single deep charcoal wash with a subtle textured weave — the definition of minimal.',
    material: 'Polyester + Cotton',
    origin: 'India',
    shape: 'Rectangular',
    color: 'Onyx',
    weightKg: 6,
    pileHeightMm: 7,
    knotDensity: '—',
    construction: 'Power-loomed',
    careInstructions: CARE,
    shippingInfo: SHIP,
    warranty: '1-year warranty',
    tags: ['modern', 'minimal', 'solid'],
    seoTitle: 'Onyx Minimal Modern Rug | Texlore',
    seoDescription:
      'Solid onyx modern rug with a subtly textured weave. Perfect minimalist statement piece.',
    images: [IMG.modern4, IMG.modern2],
    sizes: [
      { size: '5x7 ft', price: 7499, stock: 18, weightKg: 5, isPrimary: true },
      { size: '6x9 ft', price: 10499, stock: 12, weightKg: 7 },
    ],
  },
  {
    categoryKey: 'modern',
    name: 'Terracotta Wave Rug',
    description:
      'Warm terracotta and cream in an organic wave motif — brings movement without being loud.',
    material: 'Wool Blend',
    origin: 'India',
    shape: 'Rectangular',
    color: 'Terracotta, Cream',
    weightKg: 8,
    pileHeightMm: 9,
    knotDensity: '—',
    construction: 'Hand-tufted',
    careInstructions: CARE,
    shippingInfo: SHIP,
    warranty: '2-year warranty',
    featured: true,
    tags: ['modern', 'organic', 'wave'],
    seoTitle: 'Terracotta Wave Modern Rug | Texlore',
    seoDescription:
      'Modern rug with an organic wave motif in terracotta and cream. Hand-tufted wool blend.',
    images: [IMG.modern1, IMG.modern3, IMG.modern4],
    sizes: [
      { size: '5x7 ft', price: 14999, discountPercent: 10, stock: 12, weightKg: 6, isPrimary: true },
      { size: '6x9 ft', price: 20999, discountPercent: 10, stock: 8, weightKg: 9 },
    ],
  },

  // ---------- HANDMADE (5) ----------
  {
    categoryKey: 'handmade',
    name: 'Dhurrie Bohemian Kilim',
    description:
      'Flat-woven Indian dhurrie in a bold bohemian palette. Reversible for extended life.',
    material: 'Handspun Cotton',
    origin: 'Rajasthan, India',
    shape: 'Rectangular',
    color: 'Multicolor',
    weightKg: 4,
    pileHeightMm: 3,
    knotDensity: '—',
    construction: 'Handwoven (Dhurrie)',
    careInstructions: CARE,
    shippingInfo: SHIP,
    warranty: '2-year warranty',
    bestSeller: true,
    tags: ['handmade', 'dhurrie', 'kilim', 'boho'],
    seoTitle: 'Dhurrie Bohemian Kilim Rug | Texlore',
    seoDescription:
      'Handwoven Rajasthani dhurrie in a bold bohemian palette. Reversible cotton flat-weave.',
    images: [IMG.hand1, IMG.hand2],
    sizes: [
      { size: '4x6 ft', price: 5499, stock: 22, weightKg: 3, isPrimary: true },
      { size: '5x7 ft', price: 7499, stock: 18, weightKg: 4 },
      { size: '6x9 ft', price: 10999, stock: 12, weightKg: 6 },
    ],
  },
  {
    categoryKey: 'handmade',
    name: 'Kashmir Chain-Stitch Rug',
    description:
      'A hand-embroidered chain-stitch rug from Kashmir featuring the classic chinar leaf motif.',
    material: 'Wool on Cotton Base',
    origin: 'Kashmir, India',
    shape: 'Rectangular',
    color: 'Emerald, Ivory, Gold',
    weightKg: 7,
    pileHeightMm: 5,
    knotDensity: '—',
    construction: 'Hand-embroidered chain stitch',
    careInstructions: CARE,
    shippingInfo: SHIP,
    warranty: '3-year warranty',
    featured: true,
    tags: ['handmade', 'kashmir', 'chain-stitch', 'chinar'],
    seoTitle: 'Kashmir Chain-Stitch Rug | Texlore',
    seoDescription:
      'Hand-embroidered Kashmiri chain-stitch rug with chinar leaf motif in emerald, ivory, and gold.',
    images: [IMG.hand2, IMG.hand3],
    sizes: [
      { size: '4x6 ft', price: 14999, stock: 8, weightKg: 5, isPrimary: true },
      { size: '5x8 ft', price: 22999, stock: 5, weightKg: 7 },
    ],
  },
  {
    categoryKey: 'handmade',
    name: 'Jute Braided Natural Rug',
    description:
      'Chunky braided jute with a natural undyed finish. Perfect texture layer for organic interiors.',
    material: '100% Jute',
    origin: 'West Bengal, India',
    shape: 'Rectangular',
    color: 'Natural',
    weightKg: 8,
    pileHeightMm: 12,
    knotDensity: '—',
    construction: 'Hand-braided',
    careInstructions: 'Vacuum only. Avoid damp environments.',
    shippingInfo: SHIP,
    warranty: '1-year warranty',
    newArrival: true,
    tags: ['handmade', 'jute', 'natural', 'organic'],
    seoTitle: 'Jute Braided Natural Rug | Texlore',
    seoDescription:
      'Hand-braided natural jute rug — undyed, chunky, organic. Ideal texture layer.',
    images: [IMG.hand3, IMG.hand4],
    sizes: [
      { size: '4x6 ft', price: 4999, stock: 30, weightKg: 5, isPrimary: true },
      { size: '5x8 ft', price: 7999, stock: 24, weightKg: 8 },
      { size: '6x9 ft', price: 10999, stock: 15, weightKg: 12 },
    ],
  },
  {
    categoryKey: 'handmade',
    name: 'Bhadohi Hand-Tufted Sage',
    description:
      'Soft sage-green hand-tufted rug from the weaving town of Bhadohi. Understated luxury for bedrooms.',
    material: 'New Zealand Wool',
    origin: 'Bhadohi, India',
    shape: 'Rectangular',
    color: 'Sage',
    weightKg: 9,
    pileHeightMm: 15,
    knotDensity: '—',
    construction: 'Hand-tufted',
    careInstructions: CARE,
    shippingInfo: SHIP,
    warranty: '3-year warranty',
    trending: true,
    tags: ['handmade', 'wool', 'bedroom'],
    seoTitle: 'Bhadohi Hand-Tufted Sage Wool Rug | Texlore',
    seoDescription:
      'Hand-tufted sage-green wool rug from Bhadohi. Plush 15 mm pile height.',
    images: [IMG.hand4, IMG.hand1],
    sizes: [
      { size: '5x7 ft', price: 16999, discountPercent: 15, stock: 10, weightKg: 7, isPrimary: true },
      { size: '6x9 ft', price: 23999, discountPercent: 15, stock: 6, weightKg: 10 },
    ],
  },
  {
    categoryKey: 'handmade',
    name: 'Warangal Handloom Runner',
    description:
      'Handloom runner from Warangal in indigo and undyed cotton. Beautiful for kitchens and entryways.',
    material: 'Handspun Cotton',
    origin: 'Warangal, India',
    shape: 'Runner',
    color: 'Indigo, Natural',
    weightKg: 3,
    pileHeightMm: 4,
    knotDensity: '—',
    construction: 'Handloom flat-weave',
    careInstructions: 'Machine-washable on gentle cycle in cold water.',
    shippingInfo: SHIP,
    warranty: '1-year warranty',
    tags: ['handmade', 'runner', 'cotton', 'kitchen'],
    seoTitle: 'Warangal Handloom Runner Rug | Texlore',
    seoDescription:
      'Handloom cotton runner in indigo and natural. Machine-washable. Made in Warangal, India.',
    images: [IMG.hand1, IMG.hand3, IMG.hand2],
    sizes: [
      { size: '2x6 ft', price: 2499, stock: 40, weightKg: 2, isPrimary: true },
      { size: '2.5x8 ft', price: 3499, stock: 28, weightKg: 3 },
    ],
  },

  // ---------- LUXURY (5) ----------
  {
    categoryKey: 'luxury',
    name: 'Bamboo Silk Signature Rug',
    description:
      'A flagship piece in lustrous bamboo silk. Subtle abstract washes catch light throughout the day.',
    material: '100% Bamboo Silk',
    origin: 'India',
    shape: 'Rectangular',
    color: 'Champagne, Ivory',
    weightKg: 10,
    pileHeightMm: 10,
    knotDensity: '180 KPSI',
    construction: 'Hand-knotted',
    careInstructions: 'Professional cleaning only. Rotate every 3 months.',
    shippingInfo: SHIP,
    warranty: '10-year weave warranty',
    featured: true,
    bestSeller: true,
    tags: ['luxury', 'bamboo-silk', 'signature'],
    seoTitle: 'Bamboo Silk Signature Rug | Texlore Luxury',
    seoDescription:
      'Flagship bamboo silk rug in champagne and ivory with subtle abstract washes. 180 KPSI, hand-knotted.',
    images: [IMG.lux1, IMG.lux2, IMG.lux3],
    sizes: [
      { size: '5x7 ft', price: 48999, discountPercent: 5, stock: 4, weightKg: 8, isPrimary: true },
      { size: '6x9 ft', price: 72999, discountPercent: 5, stock: 3, weightKg: 11 },
      { size: '8x10 ft', price: 109999, stock: 2, weightKg: 16 },
    ],
  },
  {
    categoryKey: 'luxury',
    name: 'Royal Emerald Wool-Silk',
    description:
      'Deep emerald wool ground with silk arabesques in ivory and gold. Signature Texlore luxury.',
    material: 'Wool + Silk',
    origin: 'India',
    shape: 'Rectangular',
    color: 'Emerald, Ivory, Gold',
    weightKg: 13,
    pileHeightMm: 11,
    knotDensity: '160 KPSI',
    construction: 'Hand-knotted',
    careInstructions: 'Professional cleaning only. Rotate every 6 months.',
    shippingInfo: SHIP,
    warranty: '10-year weave warranty',
    featured: true,
    tags: ['luxury', 'wool-silk', 'emerald'],
    seoTitle: 'Royal Emerald Wool-Silk Luxury Rug | Texlore',
    seoDescription:
      'Emerald wool ground with silk arabesques in ivory and gold. Hand-knotted 160 KPSI.',
    images: [IMG.lux2, IMG.lux3, IMG.lux4],
    sizes: [
      { size: '5x7 ft', price: 54999, stock: 4, weightKg: 10, isPrimary: true },
      { size: '6x9 ft', price: 79999, stock: 3, weightKg: 13 },
    ],
  },
  {
    categoryKey: 'luxury',
    name: 'Midnight Damask Silk Rug',
    description:
      'A midnight silk ground with tone-on-tone damask. Understated, opulent, and utterly modern.',
    material: '100% Silk',
    origin: 'India',
    shape: 'Rectangular',
    color: 'Midnight',
    weightKg: 8,
    pileHeightMm: 8,
    knotDensity: '260 KPSI',
    construction: 'Hand-knotted',
    careInstructions: 'Professional cleaning only.',
    shippingInfo: SHIP,
    warranty: '10-year weave warranty',
    trending: true,
    tags: ['luxury', 'silk', 'damask'],
    seoTitle: 'Midnight Damask Silk Rug | Texlore',
    seoDescription:
      'Midnight silk rug with tone-on-tone damask, 260 KPSI hand-knotted.',
    images: [IMG.lux3, IMG.lux4],
    sizes: [
      { size: '4x6 ft', price: 62999, stock: 3, weightKg: 6, isPrimary: true },
      { size: '5x8 ft', price: 89999, stock: 2, weightKg: 9 },
    ],
  },
  {
    categoryKey: 'luxury',
    name: 'Ivory Viscose Contour Rug',
    description:
      'A soft ivory viscose rug with subtle contour cuts — luxurious underfoot and visually calm.',
    material: '100% Viscose',
    origin: 'India',
    shape: 'Rectangular',
    color: 'Ivory',
    weightKg: 7,
    pileHeightMm: 12,
    knotDensity: '—',
    construction: 'Hand-tufted',
    careInstructions: 'Professional cleaning only.',
    shippingInfo: SHIP,
    warranty: '5-year warranty',
    newArrival: true,
    tags: ['luxury', 'viscose', 'contour', 'ivory'],
    seoTitle: 'Ivory Viscose Contour Luxury Rug | Texlore',
    seoDescription:
      'Soft ivory viscose rug with hand-carved contour cuts. Plush 12 mm pile height.',
    images: [IMG.lux4, IMG.lux1],
    sizes: [
      { size: '5x7 ft', price: 22999, stock: 6, weightKg: 6, isPrimary: true },
      { size: '6x9 ft', price: 32999, stock: 4, weightKg: 9 },
    ],
  },
  {
    categoryKey: 'luxury',
    name: 'Heirloom Silk Prayer Rug',
    description:
      'Miniature-scale prayer rug in hand-knotted silk. A collector-grade heirloom piece.',
    material: '100% Silk',
    origin: 'India',
    shape: 'Rectangular',
    color: 'Ruby, Ivory, Gold',
    weightKg: 3,
    pileHeightMm: 6,
    knotDensity: '400 KPSI',
    construction: 'Hand-knotted',
    careInstructions: 'Professional cleaning only.',
    shippingInfo: SHIP,
    warranty: '10-year weave warranty',
    featured: true,
    tags: ['luxury', 'silk', 'prayer', 'heirloom'],
    seoTitle: 'Heirloom Silk Prayer Rug | Texlore',
    seoDescription:
      'Collector-grade hand-knotted silk prayer rug. 400 KPSI, heirloom quality.',
    images: [IMG.lux1, IMG.lux4, IMG.lux2],
    sizes: [
      { size: '2.5x4 ft', price: 74999, stock: 2, weightKg: 2, isPrimary: true },
      { size: '3x5 ft', price: 109999, stock: 1, weightKg: 3 },
    ],
  },
];
