import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import Zoom from 'react-medium-image-zoom';
import 'react-medium-image-zoom/dist/styles.css';
import {
  Truck,
  ShieldCheck,
  Undo2,
  Package,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  Zap,
  Share2,
  Check,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { catalogApi } from '@/services/catalog.service';
import type { ProductCardData, ProductDetail, SizeVariation } from '@/types/catalog';
import { BackButton } from '@/components/BackButton';
import { Breadcrumb } from '@/components/Breadcrumb';
import { ProductCard } from '@/components/ProductCard';
import { PriceDisplay } from '@/components/PriceDisplay';
import { Button } from '@/components/ui/Button';
import { useAppSelector } from '@/store';
import { useCart } from '@/hooks/useCart';
import { useDocumentHead } from '@/hooks/useDocumentHead';

/**
 * Product detail page.
 *  - Fetches product + related in parallel by slug
 *  - Gallery: main image + thumbnails, next/prev arrows, pinch/zoom via react-medium-image-zoom
 *  - Size selection updates price + stock + weight dynamically
 *  - Add to cart / Buy now — if unauthenticated we redirect to /login with
 *    ?intent=buy so we can complete the action after sign-in (M2 already
 *    preserves the return location)
 */
export default function ProductDetailPage(): JSX.Element {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAppSelector((s) => s.auth.user);
  const { add } = useCart();

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [related, setRelated] = useState<ProductCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedSizeId, setSelectedSizeId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setActiveImageIndex(0);
    setQuantity(1);
    (async () => {
      try {
        // Fetch product first — this is required. Related is a nice-to-have
        // and its failure should never hide the product itself.
        const { product: p } = await catalogApi.getProductBySlug(slug);
        if (cancelled) return;
        setProduct(p);
        const primary =
          p.sizeVariations.find((v) => v.isPrimary && v.stock > 0) ??
          p.sizeVariations.find((v) => v.stock > 0) ??
          p.sizeVariations[0];
        setSelectedSizeId(primary?._id ?? null);

        // Related products — silent failure OK.
        try {
          const { products: rel } = await catalogApi.getRelatedProducts(slug, 8);
          if (!cancelled) setRelated(rel);
        } catch {
          if (!cancelled) setRelated([]);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            (err as { response?: { data?: { message?: string } } })?.response?.data
              ?.message ?? 'Product not found.',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const selectedSize = useMemo<SizeVariation | null>(
    () => product?.sizeVariations.find((v) => v._id === selectedSizeId) ?? null,
    [product, selectedSizeId],
  );

  const netPrice = useMemo(() => {
    if (!selectedSize) return 0;
    const d = Math.max(0, Math.min(90, selectedSize.discountPercent ?? 0));
    return Math.round(selectedSize.price * (1 - d / 100) * 100) / 100;
  }, [selectedSize]);

  const images = product?.images ?? [];
  const currentImage = images[activeImageIndex]?.url ?? product?.primaryImage ?? '';

  async function handleAddToCart(mode: 'add' | 'buy'): Promise<void> {
    if (!product || !selectedSize) return;
    if (!user) {
      const returnTo = location.pathname + location.search;
      navigate('/login', { state: { from: returnTo } });
      return;
    }
    const setBusy = mode === 'add' ? setAdding : setBuying;
    setBusy(true);
    try {
      await add({
        productId: product.id,
        sizeVariationId: selectedSize._id ?? '',
        quantity,
      });
      if (mode === 'buy') navigate('/checkout');
    } catch {
      /* toast handled inside useCart */
    } finally {
      setBusy(false);
    }
  }

  function share(): void {
    const url = window.location.href;
    if (navigator.share) {
      navigator
        .share({ title: product?.name ?? 'Texlore', url })
        .catch(() => copyToClipboard(url));
    } else {
      copyToClipboard(url);
    }
  }
  function copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(
      () => toast.success('Link copied'),
      () => toast.error('Could not copy link'),
    );
  }

  useDocumentHead({
    title: product?.seoTitle || product?.name,
    description:
      product?.seoDescription ||
      (product?.description ? product.description.slice(0, 160) : undefined),
    image: product?.primaryImage,
    type: 'product',
    productPrice: netPrice || product?.minPrice,
    productCurrency: 'INR',
  });

  if (loading) return <ProductSkeleton />;
  if (error || !product) return <ProductNotFound message={error ?? undefined} />;

  const crumbs = product.category
    ? [
        { label: 'Shop', to: '/shop' },
        { label: product.category.name, to: `/category/${product.category.slug}` },
        { label: product.name },
      ]
    : [{ label: 'Shop', to: '/shop' }, { label: product.name }];

  return (
    <main className="min-h-screen bg-ivory">
      <div className="container-lux py-8">
        <div className="flex items-center justify-between gap-3 mb-6">
          <BackButton />
          <div className="hidden sm:block">
            <Breadcrumb items={crumbs} />
          </div>
          <button
            onClick={share}
            className="inline-flex items-center gap-1 text-xs text-charcoal-400 hover:text-midnight-900"
          >
            <Share2 size={14} /> Share
          </button>
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_400px] gap-10 lg:gap-16">
          {/* Gallery */}
          <div>
            <div className="relative rounded-2xl overflow-hidden bg-pearl border border-line/60">
              <Zoom>
                <img
                  src={currentImage}
                  alt={product.name}
                  className="w-full aspect-square object-cover cursor-zoom-in"
                />
              </Zoom>
              {images.length > 1 && (
                <>
                  <button
                    onClick={() =>
                      setActiveImageIndex(
                        (i) => (i - 1 + images.length) % images.length,
                      )
                    }
                    aria-label="Previous image"
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-pearl/90 backdrop-blur border border-line inline-flex items-center justify-center hover:bg-pearl"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    onClick={() => setActiveImageIndex((i) => (i + 1) % images.length)}
                    aria-label="Next image"
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-pearl/90 backdrop-blur border border-line inline-flex items-center justify-center hover:bg-pearl"
                  >
                    <ChevronRight size={18} />
                  </button>
                  <span className="absolute bottom-3 right-3 rounded-full bg-midnight-900/70 text-ivory text-xs px-2.5 py-1">
                    {activeImageIndex + 1} / {images.length}
                  </span>
                </>
              )}
            </div>
            {images.length > 1 && (
              <div className="mt-3 grid grid-cols-6 sm:grid-cols-7 gap-2">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImageIndex(i)}
                    aria-label={`Thumbnail ${i + 1}`}
                    className={
                      'aspect-square rounded-lg overflow-hidden border-2 transition-all ' +
                      (i === activeImageIndex
                        ? 'border-midnight-900 shadow-soft'
                        : 'border-transparent opacity-80 hover:opacity-100')
                    }
                  >
                    <img
                      src={img.url}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <aside className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <p className="text-xs tracking-[0.3em] text-gold-600 mb-2">
                {product.category?.name?.toUpperCase() ?? 'RUG'}
              </p>
              <h1 className="font-display text-3xl sm:text-4xl text-midnight-900 leading-tight">
                {product.name}
              </h1>
              <div className="mt-4">
                <PriceDisplay
                  amount={netPrice}
                  original={
                    selectedSize && selectedSize.discountPercent > 0
                      ? selectedSize.price
                      : undefined
                  }
                  size="lg"
                />
              </div>
              <p className="mt-3 text-sm text-charcoal-400 leading-relaxed">
                {product.description}
              </p>
            </motion.div>

            {/* Size */}
            <div>
              <p className="text-xs tracking-widest text-gold-700 mb-2">SIZE</p>
              <div className="flex flex-wrap gap-2">
                {product.sizeVariations.map((v) => {
                  const active = v._id === selectedSizeId;
                  const oos = v.stock <= 0;
                  return (
                    <button
                      key={v._id}
                      disabled={oos}
                      onClick={() => v._id && setSelectedSizeId(v._id)}
                      className={
                        'rounded-full px-4 py-2 text-sm border transition-all ' +
                        (active
                          ? 'border-midnight-900 bg-midnight-900 text-ivory'
                          : oos
                          ? 'border-line bg-line/30 text-charcoal-400 line-through cursor-not-allowed'
                          : 'border-line bg-pearl text-midnight-900 hover:border-midnight-900')
                      }
                    >
                      {v.size}
                    </button>
                  );
                })}
              </div>
              {selectedSize && (
                <p className="mt-2 text-xs text-charcoal-400">
                  {selectedSize.stock > 0
                    ? `${selectedSize.stock} in stock`
                    : 'Out of stock — pick a different size'}
                </p>
              )}
            </div>

            {/* Quantity */}
            {selectedSize && selectedSize.stock > 0 && (
              <div>
                <p className="text-xs tracking-widest text-gold-700 mb-2">QUANTITY</p>
                <div className="inline-flex items-center rounded-full border border-line bg-pearl">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="p-2.5 text-charcoal-500 hover:text-midnight-900"
                    aria-label="Decrease quantity"
                    disabled={quantity <= 1}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="w-10 text-center text-sm font-medium">
                    {quantity}
                  </span>
                  <button
                    onClick={() =>
                      setQuantity((q) =>
                        Math.min(Math.min(20, selectedSize.stock), q + 1),
                      )
                    }
                    className="p-2.5 text-charcoal-500 hover:text-midnight-900"
                    aria-label="Increase quantity"
                    disabled={quantity >= Math.min(20, selectedSize.stock)}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                variant="primary"
                fullWidth
                loading={adding}
                disabled={!selectedSize || selectedSize.stock <= 0}
                onClick={() => handleAddToCart('add')}
                leftIcon={<ShoppingBag size={16} />}
              >
                Add to cart
              </Button>
              <Button
                variant="gold"
                fullWidth
                loading={buying}
                disabled={!selectedSize || selectedSize.stock <= 0}
                onClick={() => handleAddToCart('buy')}
                leftIcon={<Zap size={16} />}
              >
                Buy now
              </Button>
            </div>

            {/* Info strip */}
            <ul className="grid grid-cols-2 gap-3 pt-4 border-t border-line">
              <InfoRow icon={<Truck size={14} />} label="Free shipping above ₹15,000" />
              <InfoRow icon={<Package size={14} />} label="Ships in 3–5 business days" />
              <InfoRow icon={<Undo2 size={14} />} label="7-day easy returns" />
              <InfoRow icon={<ShieldCheck size={14} />} label={product.warranty || 'Warranty included'} />
            </ul>

            {/* Specs */}
            <details className="card !p-0 group" open>
              <summary className="cursor-pointer list-none flex items-center justify-between px-5 py-4">
                <span className="font-display text-lg text-midnight-900">Specifications</span>
                <span className="text-charcoal-400 text-xs group-open:hidden">Show</span>
                <span className="text-charcoal-400 text-xs hidden group-open:inline">Hide</span>
              </summary>
              <dl className="px-5 pb-5 grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                {product.material && <Spec label="Material" value={product.material} />}
                {product.origin && <Spec label="Origin" value={product.origin} />}
                {product.shape && <Spec label="Shape" value={product.shape} />}
                {product.color && <Spec label="Color" value={product.color} />}
                {selectedSize?.weightKg
                  ? <Spec label="Weight" value={`${selectedSize.weightKg} kg`} />
                  : product.weightKg
                  ? <Spec label="Weight" value={`${product.weightKg} kg`} />
                  : null}
                {product.pileHeightMm ? (
                  <Spec label="Pile height" value={`${product.pileHeightMm} mm`} />
                ) : null}
                {product.knotDensity && (
                  <Spec label="Knot density" value={product.knotDensity} />
                )}
                {product.construction && (
                  <Spec label="Construction" value={product.construction} />
                )}
              </dl>
            </details>

            {product.careInstructions && (
              <details className="card !p-0 group">
                <summary className="cursor-pointer list-none flex items-center justify-between px-5 py-4">
                  <span className="font-display text-lg text-midnight-900">Care instructions</span>
                  <span className="text-charcoal-400 text-xs group-open:hidden">Show</span>
                  <span className="text-charcoal-400 text-xs hidden group-open:inline">Hide</span>
                </summary>
                <p className="px-5 pb-5 text-sm text-charcoal-500 leading-relaxed">
                  {product.careInstructions}
                </p>
              </details>
            )}

            {product.shippingInfo && (
              <details className="card !p-0 group">
                <summary className="cursor-pointer list-none flex items-center justify-between px-5 py-4">
                  <span className="font-display text-lg text-midnight-900">Shipping & delivery</span>
                  <span className="text-charcoal-400 text-xs group-open:hidden">Show</span>
                  <span className="text-charcoal-400 text-xs hidden group-open:inline">Hide</span>
                </summary>
                <p className="px-5 pb-5 text-sm text-charcoal-500 leading-relaxed">
                  {product.shippingInfo}
                </p>
              </details>
            )}
          </aside>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <section className="mt-24">
            <div className="flex items-end justify-between mb-8">
              <div>
                <p className="text-xs tracking-[0.3em] text-gold-600 mb-2">
                  YOU MAY ALSO LIKE
                </p>
                <h2 className="font-display text-3xl text-midnight-900">
                  Related pieces
                </h2>
              </div>
              {product.category && (
                <Link
                  to={`/category/${product.category.slug}`}
                  className="text-sm text-midnight-900 hover:text-gold-600 hidden sm:inline"
                >
                  Browse all in {product.category.name} →
                </Link>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {related.slice(0, 4).map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function Spec({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="text-xs uppercase tracking-widest text-charcoal-400 shrink-0 min-w-[100px]">
        {label}
      </dt>
      <dd className="text-midnight-900">{value}</dd>
    </div>
  );
}

function InfoRow({ icon, label }: { icon: React.ReactNode; label: string }): JSX.Element {
  return (
    <li className="flex items-center gap-2 text-xs text-charcoal-500">
      <span className="text-gold-600">{icon}</span>
      {label}
    </li>
  );
}

function ProductSkeleton(): JSX.Element {
  return (
    <main className="min-h-screen bg-ivory">
      <div className="container-lux py-10">
        <div className="skeleton h-4 w-40 mb-6" />
        <div className="grid lg:grid-cols-[minmax(0,1fr)_400px] gap-10">
          <div className="skeleton aspect-square rounded-2xl" />
          <div className="space-y-3">
            <div className="skeleton h-4 w-24" />
            <div className="skeleton h-10 w-3/4" />
            <div className="skeleton h-6 w-1/3" />
            <div className="skeleton h-24 w-full" />
            <div className="skeleton h-12 w-full" />
            <div className="skeleton h-12 w-full" />
          </div>
        </div>
      </div>
    </main>
  );
}

function ProductNotFound({ message }: { message?: string }): JSX.Element {
  return (
    <main className="min-h-screen bg-ivory flex items-center justify-center p-6">
      <div className="card p-10 max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-charcoal-400/10 text-charcoal-400 mb-4">
          <Check size={26} />
        </div>
        <h1 className="font-display text-2xl text-midnight-900 mb-2">
          Product unavailable
        </h1>
        <p className="text-charcoal-400 mb-4">
          {message ?? 'This rug isn\u2019t available right now.'}
        </p>
        <Link to="/shop" className="btn-primary">
          Browse the collection
        </Link>
      </div>
    </main>
  );
}
