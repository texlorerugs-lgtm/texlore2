import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2, Tag, X, ShoppingBag } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useAppSelector } from '@/store';
import { BackButton } from '@/components/BackButton';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatINR } from '@/utils/format';

/**
 * Cart page. Fetches the live snapshot on mount (server is source of truth).
 * Fully functional: quantity +/-, remove, coupon apply/remove, proceed to
 * checkout (M5). Requires login — redirects to /login preserving intent.
 */
export default function CartPage(): JSX.Element {
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const { snapshot, loading, refresh, updateQty, remove, applyCoupon, removeCoupon } = useCart();
  const [coupon, setCoupon] = useState('');
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true, state: { from: '/cart' } });
      return;
    }
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function handleApply(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!coupon.trim()) return;
    setApplying(true);
    try {
      await applyCoupon(coupon.trim());
      setCoupon('');
    } finally {
      setApplying(false);
    }
  }

  if (loading && !snapshot) {
    return (
      <main className="min-h-screen bg-ivory">
        <div className="container-lux py-10">
          <div className="skeleton h-6 w-32 mb-8" />
          <div className="grid lg:grid-cols-[1fr_360px] gap-8">
            <div className="space-y-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="card p-4 flex gap-4">
                  <div className="skeleton w-24 h-24 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-4 w-2/3" />
                    <div className="skeleton h-3 w-1/3" />
                    <div className="skeleton h-3 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
            <div className="skeleton h-72 rounded-xl2" />
          </div>
        </div>
      </main>
    );
  }

  const isEmpty = !snapshot || snapshot.items.length === 0;

  return (
    <main className="min-h-screen bg-ivory">
      <div className="container-lux py-10">
        <div className="flex items-center justify-between mb-8">
          <BackButton />
          <h1 className="font-display text-3xl text-midnight-900">Your Cart</h1>
          <div className="w-16" aria-hidden />
        </div>

        {isEmpty ? (
          <div className="card p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-ivory text-charcoal-400 mb-6">
              <ShoppingBag size={30} />
            </div>
            <h2 className="font-display text-2xl text-midnight-900 mb-2">
              Your cart is empty
            </h2>
            <p className="text-charcoal-400 mb-6">
              Browse our collection and add something beautiful.
            </p>
            <Link to="/" className="btn-primary">
              Continue shopping
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[1fr_380px] gap-8">
            {/* ITEMS */}
            <div className="space-y-4">
              {snapshot!.items.map((item) => (
                <article
                  key={item.itemId}
                  className="card p-4 sm:p-5 flex gap-4 items-start"
                >
                  <Link
                    to={`/product/${item.productSlug}`}
                    className="shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-lg overflow-hidden bg-ivory"
                  >
                    <img
                      src={item.primaryImage}
                      alt={item.productName}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/product/${item.productSlug}`}
                      className="font-display text-lg text-midnight-900 hover:text-gold-600 line-clamp-1"
                    >
                      {item.productName}
                    </Link>
                    <p className="text-xs text-charcoal-400 mt-0.5">Size: {item.size}</p>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="font-semibold text-midnight-900">
                        {formatINR(item.netUnitPrice)}
                      </span>
                      {item.discountPercent > 0 && (
                        <>
                          <span className="text-xs text-charcoal-400 line-through">
                            {formatINR(item.unitPrice)}
                          </span>
                          <span className="text-xs text-emerald-500 font-medium">
                            -{item.discountPercent}%
                          </span>
                        </>
                      )}
                    </div>
                    {item.status === 'stock_reduced' && (
                      <p className="mt-2 text-xs text-amber-600">
                        Quantity adjusted to the {item.availableStock} available.
                      </p>
                    )}
                    <div className="mt-3 flex items-center gap-3">
                      <div className="inline-flex items-center rounded-full border border-line bg-pearl">
                        <button
                          type="button"
                          onClick={() => updateQty(item.itemId, Math.max(1, item.quantity - 1))}
                          className="p-2 text-charcoal-500 hover:text-midnight-900 disabled:opacity-40"
                          disabled={item.quantity <= 1}
                          aria-label="Decrease"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() =>
                            updateQty(item.itemId, Math.min(item.availableStock, item.quantity + 1))
                          }
                          className="p-2 text-charcoal-500 hover:text-midnight-900 disabled:opacity-40"
                          disabled={item.quantity >= item.availableStock}
                          aria-label="Increase"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(item.itemId)}
                        className="inline-flex items-center gap-1 text-xs text-charcoal-400 hover:text-red-500"
                      >
                        <Trash2 size={14} /> Remove
                      </button>
                    </div>
                  </div>
                  <div className="hidden sm:block text-right shrink-0">
                    <div className="font-semibold text-midnight-900">
                      {formatINR(item.lineTotal)}
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {/* SUMMARY */}
            <aside className="card p-6 h-fit sticky top-6">
              <h2 className="font-display text-xl text-midnight-900 mb-4">Order summary</h2>

              <form onSubmit={handleApply} className="mb-5">
                {snapshot!.coupon.code ? (
                  <div className="flex items-center justify-between rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2.5">
                    <div className="flex items-center gap-2 text-emerald-700">
                      <Tag size={16} />
                      <span className="font-medium">{snapshot!.coupon.code}</span>
                      <span className="text-xs text-emerald-600">
                        {snapshot!.coupon.freeShipping
                          ? '(free shipping)'
                          : `−${formatINR(snapshot!.coupon.discountApplied)}`}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeCoupon()}
                      className="text-emerald-700 hover:text-emerald-900"
                      aria-label="Remove coupon"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      value={coupon}
                      onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                      placeholder="Coupon code"
                      className="uppercase tracking-wider"
                    />
                    <Button
                      type="submit"
                      variant="ghost"
                      loading={applying}
                      disabled={!coupon.trim()}
                    >
                      Apply
                    </Button>
                  </div>
                )}
              </form>

              <dl className="space-y-2 text-sm border-t border-line pt-4">
                <div className="flex justify-between">
                  <dt className="text-charcoal-400">Subtotal</dt>
                  <dd className="text-midnight-900">{formatINR(snapshot!.subtotal)}</dd>
                </div>
                {snapshot!.discount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <dt>Discount</dt>
                    <dd>−{formatINR(snapshot!.discount)}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-charcoal-400">Shipping</dt>
                  <dd className="text-midnight-900">
                    {snapshot!.shipping === 0 ? 'Free' : formatINR(snapshot!.shipping)}
                  </dd>
                </div>
                {snapshot!.tax > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-charcoal-400">Tax</dt>
                    <dd className="text-midnight-900">{formatINR(snapshot!.tax)}</dd>
                  </div>
                )}
                <div className="flex justify-between text-base font-semibold border-t border-line pt-3 mt-3">
                  <dt className="text-midnight-900">Total</dt>
                  <dd className="text-midnight-900">{formatINR(snapshot!.grandTotal)}</dd>
                </div>
              </dl>

              <Button
                variant="primary"
                fullWidth
                className="mt-6"
                onClick={() => navigate('/checkout')}
              >
                Proceed to checkout
              </Button>
              <p className="text-xs text-charcoal-400 text-center mt-3">
                Secure payments via Razorpay
              </p>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
