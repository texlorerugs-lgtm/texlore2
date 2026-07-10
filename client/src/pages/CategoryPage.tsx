import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SlidersHorizontal, X } from 'lucide-react';
import { catalogApi, type ProductListQuery } from '@/services/catalog.service';
import type {
  CategoryPublic,
  Paginated,
  ProductCardData,
} from '@/types/catalog';
import { ProductCard } from '@/components/ProductCard';
import { BackButton } from '@/components/BackButton';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Button } from '@/components/ui/Button';

const SORTS = [
  { value: 'createdAt:desc', label: 'Newest first' },
  { value: 'minPrice:asc', label: 'Price: low to high' },
  { value: 'minPrice:desc', label: 'Price: high to low' },
  { value: 'maxDiscountPercent:desc', label: 'Biggest discount' },
] as const;

/**
 * Category listing / all-products page.
 *
 * Route usage:
 *   /shop                     → all products, no category filter
 *   /category/:slug           → single-category listing (loads the category too)
 *
 * URL search params drive the query so filters survive reloads and share links:
 *   ?q=&sort=&page=&min=&max=
 */
export default function CategoryPage(): JSX.Element {
  const { slug } = useParams<{ slug?: string }>();
  const [params, setParams] = useSearchParams();
  const [category, setCategory] = useState<CategoryPublic | null>(null);
  const [page, setPage] = useState<Paginated<ProductCardData> | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const query: ProductListQuery = useMemo(
    () => ({
      categorySlug: slug,
      q: params.get('q') ?? undefined,
      sort: params.get('sort') ?? 'createdAt:desc',
      page: Number(params.get('page') ?? 1),
      limit: 12,
      minPrice: params.get('min') ? Number(params.get('min')) : undefined,
      maxPrice: params.get('max') ? Number(params.get('max')) : undefined,
    }),
    [slug, params],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const tasks: [Promise<Paginated<ProductCardData>>, Promise<{ category: CategoryPublic }>?] = [
          catalogApi.listProducts(query),
        ];
        if (slug) tasks.push(catalogApi.getCategoryBySlug(slug));
        const [pageData, catData] = await Promise.all(tasks);
        if (cancelled) return;
        setPage(pageData);
        setCategory(catData?.category ?? null);
      } catch {
        if (!cancelled) setPage({ items: [], total: 0, page: 1, limit: 12, pages: 1 });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [query, slug]);

  function updateParam(key: string, value: string | number | null): void {
    const next = new URLSearchParams(params);
    if (value == null || value === '') next.delete(key);
    else next.set(key, String(value));
    // Reset to page 1 whenever anything except `page` itself changes
    if (key !== 'page') next.delete('page');
    setParams(next);
  }

  const title = category?.name ?? 'Shop all rugs';
  const subtitle =
    category?.description ??
    'Every rug in our collection — hand-knotted, hand-tufted, and hand-loomed.';

  const crumbs = category
    ? [{ label: 'Shop', to: '/shop' }, { label: category.name }]
    : [{ label: 'Shop' }];

  return (
    <main className="min-h-screen bg-ivory">
      <div className="container-lux py-10">
        <div className="flex items-center justify-between gap-3 mb-6">
          <BackButton />
          <div className="hidden sm:block">
            <Breadcrumb items={crumbs} />
          </div>
          <div className="w-16" aria-hidden />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <h1 className="font-display text-4xl sm:text-5xl text-midnight-900">
            {title}
          </h1>
          <p className="mt-3 text-charcoal-400 max-w-2xl mx-auto">{subtitle}</p>
        </motion.div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <button
            onClick={() => setFiltersOpen((v) => !v)}
            className="btn-ghost !py-2 !text-sm"
          >
            <SlidersHorizontal size={14} />
            Filters
          </button>
          <div className="flex items-center gap-2 text-sm text-charcoal-400">
            <label htmlFor="sort" className="hidden sm:inline">
              Sort by:
            </label>
            <select
              id="sort"
              value={query.sort ?? 'createdAt:desc'}
              onChange={(e) => updateParam('sort', e.target.value)}
              className="rounded-full border border-line bg-pearl px-3 py-2 text-sm text-midnight-900 outline-none focus:border-midnight-900"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filtersOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="card p-5 mb-6"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-midnight-900">Filters</p>
              <button
                onClick={() => setFiltersOpen(false)}
                className="text-charcoal-400 hover:text-midnight-900"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <label className="block">
                <span className="text-xs text-charcoal-400 mb-1 block">Search</span>
                <input
                  type="text"
                  defaultValue={params.get('q') ?? ''}
                  onBlur={(e) => updateParam('q', e.target.value.trim())}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      updateParam('q', (e.target as HTMLInputElement).value.trim());
                    }
                  }}
                  placeholder="e.g. Persian, wool, ivory"
                  className="w-full rounded-xl border border-line bg-pearl px-3 py-2 text-sm focus:border-midnight-900 outline-none"
                />
              </label>
              <label className="block">
                <span className="text-xs text-charcoal-400 mb-1 block">
                  Min price (₹)
                </span>
                <input
                  type="number"
                  min={0}
                  defaultValue={params.get('min') ?? ''}
                  onBlur={(e) => updateParam('min', e.target.value)}
                  className="w-full rounded-xl border border-line bg-pearl px-3 py-2 text-sm focus:border-midnight-900 outline-none"
                />
              </label>
              <label className="block">
                <span className="text-xs text-charcoal-400 mb-1 block">
                  Max price (₹)
                </span>
                <input
                  type="number"
                  min={0}
                  defaultValue={params.get('max') ?? ''}
                  onBlur={(e) => updateParam('max', e.target.value)}
                  className="w-full rounded-xl border border-line bg-pearl px-3 py-2 text-sm focus:border-midnight-900 outline-none"
                />
              </label>
            </div>
          </motion.div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="card overflow-hidden">
                <div className="skeleton aspect-square" />
                <div className="p-4 space-y-2">
                  <div className="skeleton h-4 w-2/3" />
                  <div className="skeleton h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : !page || page.items.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-charcoal-400 mb-4">
              No rugs match your filters.
            </p>
            <Link to="/shop" className="btn-primary">
              Browse all rugs
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {page.items.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
            {/* Pagination */}
            {page.pages > 1 && (
              <div className="mt-12 flex items-center justify-center gap-2">
                <Button
                  variant="ghost"
                  disabled={page.page <= 1}
                  onClick={() => updateParam('page', page.page - 1)}
                >
                  ← Previous
                </Button>
                <span className="text-sm text-charcoal-400 px-3">
                  Page {page.page} of {page.pages}
                </span>
                <Button
                  variant="ghost"
                  disabled={page.page >= page.pages}
                  onClick={() => updateParam('page', page.page + 1)}
                >
                  Next →
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
