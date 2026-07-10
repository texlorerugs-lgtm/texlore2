export interface CategoryPublic {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: { url: string; publicId: string; width?: number; height?: number };
  priority: number;
  productCount: number;
  seoTitle: string;
  seoDescription: string;
}

export type ProductStatus =
  | 'available'
  | 'out_of_stock'
  | 'hidden'
  | 'coming_soon'
  | 'discontinued';

export interface SizeVariation {
  _id?: string;
  size: string;
  sku?: string;
  price: number;
  discountPercent: number;
  stock: number;
  weightKg: number;
  isPrimary: boolean;
}

export interface ProductImage {
  url: string;
  publicId?: string;
  order: number;
  width?: number;
  height?: number;
}

export interface ProductCardData {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  primaryImage: string;
  images: Array<{ url: string; order: number }>;
  primarySize: string;
  price: number;
  discountPercent: number;
  netPrice: number;
  minPrice: number;
  maxDiscountPercent: number;
  totalStock: number;
  featured: boolean;
  trending: boolean;
  newArrival: boolean;
  bestSeller: boolean;
  status: ProductStatus;
  averageRating: number;
  reviewCount: number;
}

export interface ProductDetail extends ProductCardData {
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
  sizeVariations: SizeVariation[];
  tags: string[];
  seoTitle: string;
  seoDescription: string;
  category?: { id: string; name: string; slug: string };
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}
