import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package } from 'lucide-react';
import { BackButton } from '@/components/BackButton';
import { orderApi } from '@/services/order.service';
import type { Order } from '@/types/order';
import { formatINR } from '@/utils/format';
import { useAppSelector } from '@/store';

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-700',
  confirmed: 'bg-emerald-500/10 text-emerald-700',
  preparing: 'bg-emerald-500/10 text-emerald-700',
  packed: 'bg-emerald-500/10 text-emerald-700',
  shipped: 'bg-midnight-900/10 text-midnight-900',
  out_for_delivery: 'bg-midnight-900/10 text-midnight-900',
  delivered: 'bg-emerald-500/10 text-emerald-700',
  cancelled: 'bg-red-500/10 text-red-700',
  returned: 'bg-red-500/10 text-red-700',
  refunded: 'bg-red-500/10 text-red-700',
};

export default function MyOrdersPage(): JSX.Element {
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true, state: { from: '/orders' } });
      return;
    }
    (async () => {
      try {
        const page = await orderApi.list({ limit: 20 });
        setOrders(page.items);
      } finally {
        setLoading(false);
      }
    })();
  }, [user, navigate]);

  return (
    <main className="min-h-screen bg-ivory">
      <div className="container-lux py-10 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <BackButton />
          <h1 className="font-display text-3xl text-midnight-900">My Orders</h1>
          <div className="w-16" aria-hidden />
        </div>

        {loading ? (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="card p-5">
                <div className="skeleton h-4 w-1/3 mb-2" />
                <div className="skeleton h-3 w-1/4" />
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="card p-12 text-center">
            <Package className="mx-auto text-charcoal-400 mb-3" size={30} />
            <p className="text-charcoal-400 mb-4">You have no orders yet.</p>
            <Link to="/" className="btn-primary">
              Start shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((o) => (
              <Link
                to={`/orders/${o.orderNumber}`}
                key={o.id}
                className="card p-5 flex items-center justify-between gap-4 hover:-translate-y-0.5 hover:shadow-luxury transition-all"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <p className="font-medium text-midnight-900 truncate">
                      {o.orderNumber}
                    </p>
                    <span
                      className={
                        'text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full ' +
                        (STATUS_STYLE[o.orderStatus] ?? 'bg-charcoal-400/10 text-charcoal-400')
                      }
                    >
                      {o.orderStatus.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-charcoal-400">
                    {new Date(o.createdAt).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}{' '}
                    · {o.items.length} item(s)
                  </p>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-midnight-900">
                    {formatINR(o.grandTotal)}
                  </div>
                  <div className="text-xs text-charcoal-400">
                    {o.currency}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
