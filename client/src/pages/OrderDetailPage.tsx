import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Download, Mail, Phone, Clock, Info } from 'lucide-react';
import { BackButton } from '@/components/BackButton';
import { orderApi } from '@/services/order.service';
import type { Order } from '@/types/order';
import { formatINR } from '@/utils/format';
import { useAppSelector } from '@/store';
import { useDocumentHead } from '@/hooks/useDocumentHead';

// Statuses where the order is still open (not yet delivered / cancelled /
// refunded). The Cancellation-help card is shown for these; final states
// hide it.
const OPEN_STATES = new Set([
  'pending',
  'confirmed',
  'preparing',
  'packed',
  'shipped',
  'out_for_delivery',
]);

const SUPPORT_EMAIL = 'texlorerug@gmail.com';

export default function OrderDetailPage(): JSX.Element {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useDocumentHead({ title: 'Order details', noindex: true });

  async function handleDownloadInvoice(): Promise<void> {
    if (!order) return;
    setDownloading(true);
    try {
      await orderApi.downloadInvoice(order.orderNumber);
      toast.success('Invoice downloaded');
    } catch {
      toast.error('Could not download invoice. Try again.');
    } finally {
      setDownloading(false);
    }
  }

  useEffect(() => {
    if (!user) {
      navigate('/login', {
        replace: true,
        state: { from: `/orders/${orderNumber ?? ''}` },
      });
      return;
    }
    if (!orderNumber) {
      navigate('/orders', { replace: true });
      return;
    }
    (async () => {
      try {
        const { order: o } = await orderApi.get(orderNumber);
        setOrder(o);
      } catch (err: unknown) {
        toast.error(
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
            'Could not load order.',
        );
        navigate('/orders', { replace: true });
      } finally {
        setLoading(false);
      }
    })();
  }, [user, orderNumber, navigate]);

  if (loading) {
    return (
      <main className="min-h-screen bg-ivory">
        <div className="container-lux py-10 max-w-4xl">
          <div className="skeleton h-6 w-32 mb-6" />
          <div className="skeleton h-64 rounded-xl2 mb-4" />
          <div className="skeleton h-40 rounded-xl2" />
        </div>
      </main>
    );
  }
  if (!order) return <></>;

  return (
    <main className="min-h-screen bg-ivory">
      <div className="container-lux py-10 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <BackButton />
          <h1 className="font-display text-3xl text-midnight-900">Order details</h1>
          <div className="w-16" aria-hidden />
        </div>

        <section className="card p-6 mb-4">
          <div className="flex flex-wrap gap-4 items-center justify-between mb-6">
            <div>
              <p className="text-xs uppercase tracking-widest text-gold-700">
                {order.orderNumber}
              </p>
              <p className="font-display text-2xl text-midnight-900 mt-1 capitalize">
                {order.orderStatus.replace(/_/g, ' ')}
              </p>
              <p className="text-sm text-charcoal-400 mt-1">
                Placed{' '}
                {new Date(order.createdAt).toLocaleDateString('en-IN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDownloadInvoice}
                disabled={downloading}
                className="btn-ghost disabled:opacity-60"
              >
                <Download size={14} />
                {downloading ? 'Preparing…' : 'Invoice'}
              </button>
            </div>
          </div>

          <ul className="divide-y divide-line">
            {order.items.map((it, i) => (
              <li key={i} className="py-3 flex gap-3">
                <Link
                  to={`/product/${it.productSlug}`}
                  className="w-16 h-16 rounded-lg bg-ivory overflow-hidden shrink-0"
                >
                  <img
                    src={it.primaryImage}
                    alt={it.productName}
                    className="w-full h-full object-cover"
                  />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/product/${it.productSlug}`}
                    className="font-medium text-midnight-900 hover:text-gold-600 truncate block"
                  >
                    {it.productName}
                  </Link>
                  <p className="text-xs text-charcoal-400">
                    {it.size} · Qty {it.quantity} · {formatINR(it.netUnitPrice)} each
                  </p>
                </div>
                <div className="text-sm font-semibold text-midnight-900">
                  {formatINR(it.lineTotal)}
                </div>
              </li>
            ))}
          </ul>

          <div className="grid sm:grid-cols-2 gap-6 mt-6 pt-6 border-t border-line">
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-charcoal-400">Subtotal</dt>
                <dd>{formatINR(order.subtotal)}</dd>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <dt>Discount{order.coupon.code ? ` (${order.coupon.code})` : ''}</dt>
                  <dd>−{formatINR(order.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-charcoal-400">Shipping</dt>
                <dd>{order.shipping === 0 ? 'Free' : formatINR(order.shipping)}</dd>
              </div>
              <div className="flex justify-between text-base font-semibold border-t border-line pt-2 mt-2">
                <dt>Total</dt>
                <dd>{formatINR(order.grandTotal)}</dd>
              </div>
              <p className="text-xs text-charcoal-400 mt-2 break-all">
                Payment: {order.gatewayPaymentId}
              </p>
            </dl>
            <div className="text-sm">
              <p className="text-xs uppercase tracking-widest text-gold-700 mb-1">
                Shipping to
              </p>
              <p className="font-medium text-midnight-900">{order.address.fullName}</p>
              <p>{order.address.line1}{order.address.line2 ? `, ${order.address.line2}` : ''}</p>
              <p>
                {order.address.city}, {order.address.state} {order.address.zip}
              </p>
              <p>{order.address.country}</p>
              <p className="mt-1">
                {order.address.countryCode} {order.address.phone}
              </p>
            </div>
          </div>
        </section>

        {/* Cancellation help card — shown only for open orders */}
        {OPEN_STATES.has(order.orderStatus) && (
          <CancellationHelp orderNumber={order.orderNumber} />
        )}

        {order.timeline.length > 0 && (
          <section className="card p-6">
            <h2 className="font-display text-xl text-midnight-900 mb-4">Timeline</h2>
            <ol className="space-y-3">
              {[...order.timeline].reverse().map((t, i) => (
                <li key={i} className="flex gap-3 items-start">
                  <div className="mt-1.5 w-2 h-2 rounded-full bg-gold-500 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-midnight-900 capitalize">
                      {t.status.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-charcoal-400">
                      {new Date(t.at).toLocaleString('en-IN')}
                    </p>
                    {t.note && <p className="text-sm text-charcoal-500 mt-1">{t.note}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </main>
  );
}

/**
 * Cancellation help card — replaces the old customer-initiated cancel button.
 * Cancellations are handled only by the Texlore team; the customer is asked
 * to contact us. Refunds are processed within 72 working hours of
 * cancellation confirmation.
 */
function CancellationHelp({ orderNumber }: { orderNumber: string }): JSX.Element {
  const subject = encodeURIComponent(`Cancellation request — ${orderNumber}`);
  const body = encodeURIComponent(
    `Hi Texlore team,\n\nI would like to request a cancellation for the following order:\n\nOrder number: ${orderNumber}\nReason: \n\nThank you.`,
  );
  return (
    <section className="card p-6 mb-4 border-l-4 border-gold-500">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-gold-gradient text-midnight-900 inline-flex items-center justify-center shrink-0">
          <Info size={18} />
        </div>
        <div>
          <h2 className="font-display text-xl text-midnight-900">
            Need to cancel this order?
          </h2>
          <p className="text-sm text-charcoal-500 mt-1">
            To protect handwoven inventory and coordinate shipping schedules,
            cancellations are processed by our team — not through the website.
            Please contact us at the email or phone below and mention your
            order number.
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        <a
          href={`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`}
          className="flex items-center gap-3 rounded-xl border border-line bg-pearl px-4 py-3 hover:border-midnight-900 transition-colors"
        >
          <span className="w-9 h-9 rounded-full bg-midnight-900/5 text-midnight-900 inline-flex items-center justify-center">
            <Mail size={16} />
          </span>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-widest text-charcoal-400">
              Email
            </p>
            <p className="text-sm font-medium text-midnight-900 truncate">
              {SUPPORT_EMAIL}
            </p>
          </div>
        </a>
        <a
          href="tel:+910000000000"
          className="flex items-center gap-3 rounded-xl border border-line bg-pearl px-4 py-3 hover:border-midnight-900 transition-colors"
        >
          <span className="w-9 h-9 rounded-full bg-midnight-900/5 text-midnight-900 inline-flex items-center justify-center">
            <Phone size={16} />
          </span>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-widest text-charcoal-400">
              Phone
            </p>
            <p className="text-sm font-medium text-midnight-900 truncate">
              +91 00000 00000
            </p>
          </div>
        </a>
      </div>

      <div className="rounded-xl bg-ivory border border-line/60 px-4 py-3 flex items-start gap-3">
        <Clock size={16} className="text-gold-600 mt-0.5 shrink-0" />
        <p className="text-xs text-charcoal-500 leading-relaxed">
          <strong className="text-midnight-900">Refund policy:</strong>{' '}
          Once your cancellation is confirmed by our team, the refund is
          initiated to your original payment method within{' '}
          <strong className="text-midnight-900">72 working hours</strong>. Bank
          settlement times vary — please allow 5–7 additional business days
          for the amount to reflect in your statement.
        </p>
      </div>
    </section>
  );
}
