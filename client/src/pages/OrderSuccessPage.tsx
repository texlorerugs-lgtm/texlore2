import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CheckCircle2, Download, Package, ArrowRight } from 'lucide-react';
import { orderApi } from '@/services/order.service';
import type { Order } from '@/types/order';
import { formatINR } from '@/utils/format';
import { useCart } from '@/hooks/useCart';
import { useDocumentHead } from '@/hooks/useDocumentHead';

/**
 * Shown ONLY after backend verification succeeded. The order is guaranteed
 * to exist server-side. The cart was cleared server-side inside the fulfil
 * routine — we just refresh our local mirror.
 */
export default function OrderSuccessPage(): JSX.Element {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const { refresh } = useCart();

  useDocumentHead({ title: 'Order confirmed', noindex: true });

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
    if (!orderNumber) {
      navigate('/', { replace: true });
      return;
    }
    void refresh();
    (async () => {
      try {
        const { order: o } = await orderApi.get(orderNumber);
        setOrder(o);
      } catch (err: unknown) {
        setError(
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
            'Could not load your order.',
        );
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNumber]);

  if (error) {
    return (
      <main className="min-h-screen bg-ivory flex items-center justify-center p-6">
        <div className="card p-8 max-w-md text-center">
          <h1 className="font-display text-2xl text-midnight-900 mb-2">
            Order not found
          </h1>
          <p className="text-charcoal-400 mb-4">{error}</p>
          <Link to="/orders" className="btn-primary">
            View my orders
          </Link>
        </div>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="min-h-screen bg-ivory flex items-center justify-center">
        <div className="animate-pulse text-charcoal-400 tracking-widest text-sm">
          LOADING…
        </div>
      </main>
    );
  }

  const eta = order.expectedDelivery
    ? new Date(order.expectedDelivery).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'within 5–8 business days';

  return (
    <main className="min-h-screen bg-ivory">
      <div className="container-lux py-14 max-w-3xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 mb-5">
            <CheckCircle2 size={30} />
          </div>
          <h1 className="font-display text-4xl text-midnight-900 mb-2">
            Thank you for your order
          </h1>
          <p className="text-charcoal-400">
            A confirmation email is on its way to <strong>{order.userEmail}</strong>.
          </p>
        </div>

        <section className="card p-6 sm:p-8">
          <div className="grid sm:grid-cols-3 gap-6 mb-6">
            <div>
              <p className="text-xs uppercase tracking-widest text-gold-700 mb-1">
                Order
              </p>
              <p className="font-medium text-midnight-900">{order.orderNumber}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-gold-700 mb-1">
                Payment ID
              </p>
              <p className="font-medium text-midnight-900 break-all">
                {order.gatewayPaymentId}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-gold-700 mb-1">
                Estimated delivery
              </p>
              <p className="font-medium text-midnight-900">{eta}</p>
            </div>
          </div>

          <div className="border-t border-line pt-6">
            <ul className="divide-y divide-line">
              {order.items.map((it, i) => (
                <li key={i} className="py-3 flex gap-3">
                  <div className="w-14 h-14 rounded-lg bg-ivory overflow-hidden shrink-0">
                    <img
                      src={it.primaryImage}
                      alt={it.productName}
                      className="w-full h-full object-cover"
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
          </div>

          <div className="border-t border-line pt-6 mt-6 grid sm:grid-cols-2 gap-6">
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-charcoal-400">Subtotal</dt>
                <dd>{formatINR(order.subtotal)}</dd>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <dt>Discount</dt>
                  <dd>−{formatINR(order.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-charcoal-400">Shipping</dt>
                <dd>{order.shipping === 0 ? 'Free' : formatINR(order.shipping)}</dd>
              </div>
              <div className="flex justify-between text-base font-semibold border-t border-line pt-2 mt-2">
                <dt>Total paid</dt>
                <dd>{formatINR(order.grandTotal)}</dd>
              </div>
            </dl>
            <div className="text-sm text-charcoal-500">
              <p className="text-xs uppercase tracking-widest text-gold-700 mb-1">
                Shipping to
              </p>
              <p className="font-medium text-midnight-900">{order.address.fullName}</p>
              <p>
                {order.address.line1}
                {order.address.line2 ? `, ${order.address.line2}` : ''}
              </p>
              <p>
                {order.address.city}, {order.address.state} {order.address.zip}
              </p>
              <p>{order.address.country}</p>
            </div>
          </div>
        </section>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleDownloadInvoice}
            disabled={downloading}
            className="btn-ghost disabled:opacity-60"
          >
            <Download size={16} />
            {downloading ? 'Preparing…' : 'Download invoice'}
          </button>
          <Link to={`/orders/${order.orderNumber}`} className="btn-primary">
            <Package size={16} /> Track this order
          </Link>
          <Link to="/" className="btn-gold">
            Continue shopping <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </main>
  );
}
