import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CheckCircle2, ShieldCheck, MapPin, Plus, Loader2 } from 'lucide-react';
import { BackButton } from '@/components/BackButton';
import { Button } from '@/components/ui/Button';
import { formatINR } from '@/utils/format';
import { useAppSelector } from '@/store';
import { useCart } from '@/hooks/useCart';
import { addressApi } from '@/services/address.service';
import { paymentApi } from '@/services/payment.service';
import { loadRazorpay, openRazorpay } from '@/lib/razorpay';
import type { Address } from '@/types/commerce';

/**
 * Checkout flow (Part 4 STRICT rule):
 *   1) User picks an address from their book (or adds one)
 *   2) POST /payments/create-order  → gateway order + priced quote
 *   3) Razorpay Checkout modal opens
 *   4) On success → POST /payments/verify (backend verifies signature,
 *      atomically creates Order + reduces stock + sends emails)
 *   5) Navigate to /order-success/:orderNumber
 *
 * On failure or dismissal we call /payments/fail to mark the payment cancelled
 * so we don't leave dangling "created" rows. NO order exists until verify().
 */
export default function CheckoutPage(): JSX.Element {
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const { snapshot, refresh, loading: cartLoading } = useCart();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressLoading, setAddressLoading] = useState(true);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true, state: { from: '/checkout' } });
      return;
    }
    void refresh();
    (async () => {
      try {
        const { addresses: list } = await addressApi.list();
        setAddresses(list);
        const def = list.find((a) => a.isDefault) ?? list[0];
        if (def) setSelectedAddressId(def.id);
      } catch {
        toast.error('Could not load your saved addresses.');
      } finally {
        setAddressLoading(false);
      }
    })();
    // Preload Razorpay script so the modal opens instantly.
    void loadRazorpay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const selectedAddress = useMemo(
    () => addresses.find((a) => a.id === selectedAddressId) ?? null,
    [addresses, selectedAddressId],
  );

  async function handlePay(): Promise<void> {
    if (!selectedAddress) {
      toast.error('Please select a delivery address.');
      return;
    }
    if (!snapshot || snapshot.items.length === 0) {
      toast.error('Your cart is empty.');
      return;
    }
    setProcessing(true);
    const ready = await loadRazorpay();
    if (!ready) {
      setProcessing(false);
      toast.error('Could not load payment gateway. Check your internet.');
      return;
    }

    try {
      const create = await paymentApi.createOrder(selectedAddress.id);
      const { payment, user: userInfo } = create;

      const { rz } = openRazorpay({
        key: payment.razorpayKeyId,
        amount: payment.amountMinor,
        currency: payment.currency,
        name: 'Texlore',
        description: `Order · ${payment.currency} ${payment.amount}`,
        order_id: payment.gatewayOrderId,
        prefill: {
          name: userInfo.name,
          email: userInfo.email,
          contact: `${userInfo.countryCode}${userInfo.phone}`.replace(/^\+/, ''),
        },
        theme: { color: '#0B1B3A' },
        modal: {
          confirm_close: true,
          ondismiss: () => {
            setProcessing(false);
            void paymentApi.fail({
              gatewayOrderId: payment.gatewayOrderId,
              reason: 'Dismissed by user',
            });
            toast.error('Payment cancelled. Nothing was charged.');
          },
        },
        handler: async (r) => {
          try {
            const result = await paymentApi.verify({
              gatewayOrderId: r.razorpay_order_id,
              gatewayPaymentId: r.razorpay_payment_id,
              signature: r.razorpay_signature,
            });
            toast.success('Payment verified — order placed');
            navigate(`/order-success/${result.orderNumber}`, { replace: true });
          } catch (err: unknown) {
            setProcessing(false);
            toast.error(
              (err as { response?: { data?: { message?: string } } })?.response?.data
                ?.message ??
                'Payment received but verification failed. Our team has been notified.',
            );
          }
        },
      });

      if (rz) {
        rz.on('payment.failed', (resp) => {
          const reason = resp?.error?.description ?? 'Payment failed';
          void paymentApi.fail({
            gatewayOrderId: payment.gatewayOrderId,
            reason,
          });
          setProcessing(false);
          toast.error(reason);
        });
      }
    } catch (err: unknown) {
      setProcessing(false);
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Could not start payment. Please try again.',
      );
    }
  }

  const isLoading = cartLoading || addressLoading;

  return (
    <main className="min-h-screen bg-ivory">
      <div className="container-lux py-10">
        <div className="flex items-center justify-between mb-8">
          <BackButton />
          <h1 className="font-display text-3xl text-midnight-900">Checkout</h1>
          <div className="w-16" aria-hidden />
        </div>

        {isLoading ? (
          <div className="grid lg:grid-cols-[1fr_380px] gap-8">
            <div className="space-y-4">
              <div className="skeleton h-40 rounded-xl2" />
              <div className="skeleton h-64 rounded-xl2" />
            </div>
            <div className="skeleton h-96 rounded-xl2" />
          </div>
        ) : !snapshot || snapshot.items.length === 0 ? (
          <div className="card p-12 text-center">
            <h2 className="font-display text-2xl text-midnight-900 mb-2">
              Your cart is empty
            </h2>
            <Link to="/" className="btn-primary mt-4">
              Continue shopping
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[1fr_380px] gap-8">
            <div className="space-y-6">
              {/* Address picker */}
              <section className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-xl text-midnight-900">
                    Delivery address
                  </h2>
                  <Link
                    to="/addresses"
                    className="text-sm text-midnight-900 hover:text-gold-600 inline-flex items-center gap-1"
                  >
                    <Plus size={14} /> Add or edit
                  </Link>
                </div>
                {addresses.length === 0 ? (
                  <div className="text-center py-6">
                    <MapPin className="mx-auto text-charcoal-400 mb-3" size={28} />
                    <p className="text-charcoal-400 mb-4">
                      Add a delivery address to continue.
                    </p>
                    <Link to="/addresses" className="btn-primary">
                      Add address
                    </Link>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {addresses.map((a) => {
                      const selected = a.id === selectedAddressId;
                      return (
                        <button
                          type="button"
                          key={a.id}
                          onClick={() => setSelectedAddressId(a.id)}
                          className={
                            'text-left rounded-xl border p-4 transition-all ' +
                            (selected
                              ? 'border-midnight-900 bg-midnight-900/5 shadow-soft'
                              : 'border-line bg-pearl hover:border-midnight-900/40')
                          }
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs uppercase tracking-widest text-charcoal-400">
                              {a.label}
                            </span>
                            {selected && (
                              <CheckCircle2 size={16} className="text-emerald-500" />
                            )}
                          </div>
                          <p className="font-medium text-midnight-900">{a.fullName}</p>
                          <p className="text-sm text-charcoal-400 mt-1">
                            {a.line1}
                            {a.line2 ? `, ${a.line2}` : ''}
                          </p>
                          <p className="text-sm text-charcoal-400">
                            {a.city}, {a.state} {a.zip}
                          </p>
                          <p className="text-sm text-charcoal-500 mt-1">
                            {a.countryCode} {a.phone}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Order review */}
              <section className="card p-6">
                <h2 className="font-display text-xl text-midnight-900 mb-4">
                  Review your order
                </h2>
                <ul className="divide-y divide-line">
                  {snapshot.items.map((it) => (
                    <li key={it.itemId} className="py-3 flex gap-3">
                      <div className="w-16 h-16 rounded-lg bg-ivory overflow-hidden shrink-0">
                        <img
                          src={it.primaryImage}
                          alt={it.productName}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-midnight-900 truncate">
                          {it.productName}
                        </p>
                        <p className="text-xs text-charcoal-400">
                          {it.size} · Qty {it.quantity}
                        </p>
                      </div>
                      <div className="text-sm font-semibold text-midnight-900">
                        {formatINR(it.lineTotal)}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            {/* Summary + Pay */}
            <aside className="card p-6 h-fit sticky top-6">
              <h2 className="font-display text-xl text-midnight-900 mb-4">Total</h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-charcoal-400">Subtotal</dt>
                  <dd>{formatINR(snapshot.subtotal)}</dd>
                </div>
                {snapshot.discount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <dt>
                      Discount
                      {snapshot.coupon.code ? ` (${snapshot.coupon.code})` : ''}
                    </dt>
                    <dd>−{formatINR(snapshot.discount)}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-charcoal-400">Shipping</dt>
                  <dd>
                    {snapshot.shipping === 0 ? 'Free' : formatINR(snapshot.shipping)}
                  </dd>
                </div>
                {snapshot.tax > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-charcoal-400">Tax</dt>
                    <dd>{formatINR(snapshot.tax)}</dd>
                  </div>
                )}
                <div className="flex justify-between text-base font-semibold border-t border-line pt-3 mt-3">
                  <dt>Grand total</dt>
                  <dd>{formatINR(snapshot.grandTotal)}</dd>
                </div>
              </dl>

              <Button
                variant="gold"
                fullWidth
                className="mt-6"
                loading={processing}
                onClick={handlePay}
                disabled={!selectedAddress}
                leftIcon={processing ? undefined : <ShieldCheck size={16} />}
              >
                {processing ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    Processing…
                  </span>
                ) : (
                  <>Pay {formatINR(snapshot.grandTotal)}</>
                )}
              </Button>

              <p className="text-xs text-charcoal-400 text-center mt-3 leading-relaxed">
                Your card is charged securely by Razorpay. Your order is placed only
                after the payment is verified.
              </p>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
