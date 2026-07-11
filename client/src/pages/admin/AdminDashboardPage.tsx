import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet,
  ShoppingCart,
  Package,
  Users,
  MessageSquare,
  Percent,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatCard } from '@/components/admin/StatCard';
import { StatusPill } from '@/components/admin/StatusPill';
import { RevenueChart } from '@/components/admin/RevenueChart';
import {
  adminAnalyticsApi,
  type DashboardSummary,
  type LowStockProduct,
  type RecentOrder,
  type RevenuePoint,
  type TopProduct,
} from '@/services/admin-analytics.service';

function inr(n: number): string {
  return `₹${(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export default function AdminDashboardPage(): JSX.Element {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [series, setSeries] = useState<RevenuePoint[]>([]);
  const [top, setTop] = useState<TopProduct[]>([]);
  const [low, setLow] = useState<LowStockProduct[]>([]);
  const [recent, setRecent] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [s, sr, t, l, r] = await Promise.all([
          adminAnalyticsApi.summary(),
          adminAnalyticsApi.revenueSeries(30),
          adminAnalyticsApi.topProducts(5),
          adminAnalyticsApi.lowStock(6),
          adminAnalyticsApi.recentOrders(6),
        ]);
        if (cancelled) return;
        setSummary(s);
        setSeries(sr.series);
        setTop(t.products);
        setLow(l.products);
        setRecent(r.orders);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="A live snapshot of your store — revenue, orders, catalog and customers."
      />

      {loading || !summary ? (
        <SkeletonGrid />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            <StatCard
              label="Total revenue"
              value={inr(summary.revenue.total)}
              hint={`${inr(summary.revenue.today)} today`}
              icon={<Wallet size={16} />}
              accent="gold"
            />
            <StatCard
              label="Orders"
              value={summary.orders.total}
              hint={`${summary.orders.today} today · ${summary.orders.pending} pending`}
              icon={<ShoppingCart size={16} />}
              accent="midnight"
            />
            <StatCard
              label="Customers"
              value={summary.customers.total}
              hint={`${summary.customers.newLast30Days} new in 30 days`}
              icon={<Users size={16} />}
              accent="emerald"
            />
            <StatCard
              label="Avg. order value"
              value={inr(summary.revenue.averageOrderValue)}
              hint={`Delivered: ${summary.orders.delivered}`}
              icon={<TrendingUp size={16} />}
              accent="midnight"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <StatCard
              label="Products"
              value={summary.catalog.products}
              hint={`${summary.catalog.categories} categories`}
              icon={<Package size={16} />}
            />
            <StatCard
              label="Active coupons"
              value={summary.coupons.active}
              hint={`${summary.coupons.total} total`}
              icon={<Percent size={16} />}
            />
            <StatCard
              label="New messages"
              value={summary.messages.new}
              hint={`${summary.messages.total} lifetime`}
              icon={<MessageSquare size={16} />}
            />
          </div>

          <section className="card p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display text-xl text-midnight-900">
                  Revenue — last 30 days
                </h2>
                <p className="text-xs text-charcoal-400">
                  {inr(summary.revenue.last30Days)} across{' '}
                  {series.reduce((s, p) => s + p.orders, 0)} orders
                </p>
              </div>
            </div>
            <RevenueChart data={series} />
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Recent orders */}
            <section className="card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-line/60">
                <h2 className="font-display text-lg text-midnight-900">Recent orders</h2>
                <Link
                  to="/ayan-khan/orders"
                  className="text-xs text-midnight-900 hover:text-gold-600"
                >
                  View all →
                </Link>
              </div>
              {recent.length === 0 ? (
                <p className="p-6 text-sm text-charcoal-400 text-center">
                  No orders yet.
                </p>
              ) : (
                <ul className="divide-y divide-line/60">
                  {recent.map((o) => (
                    <li key={o.id}>
                      <Link
                        to={`/admin/orders/${o.orderNumber}`}
                        className="flex items-center justify-between px-5 py-3 hover:bg-ivory transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-medium text-midnight-900 truncate">
                              {o.orderNumber}
                            </span>
                            <StatusPill status={o.orderStatus} />
                          </div>
                          <p className="text-xs text-charcoal-400 truncate">
                            {o.userName} · {o.itemCount} item(s)
                          </p>
                        </div>
                        <div className="text-sm font-semibold text-midnight-900">
                          {inr(o.grandTotal)}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Top + Low stock */}
            <div className="space-y-6">
              <section className="card overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-line/60">
                  <h2 className="font-display text-lg text-midnight-900">Top-selling</h2>
                  <Link
                    to="/ayan-khan/analytics"
                    className="text-xs text-midnight-900 hover:text-gold-600"
                  >
                    Analytics →
                  </Link>
                </div>
                {top.length === 0 ? (
                  <p className="p-6 text-sm text-charcoal-400 text-center">
                    Not enough sales data yet.
                  </p>
                ) : (
                  <ul className="divide-y divide-line/60">
                    {top.map((p, i) => (
                      <li
                        key={p.productId}
                        className="flex items-center gap-3 px-5 py-3"
                      >
                        <span className="w-5 text-right text-charcoal-400 text-sm">
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-midnight-900 truncate">
                            {p.productName}
                          </p>
                          <p className="text-xs text-charcoal-400">
                            {p.unitsSold} sold
                          </p>
                        </div>
                        <div className="text-sm text-midnight-900">
                          {inr(p.revenue)}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="card overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-line/60">
                  <h2 className="font-display text-lg text-midnight-900 inline-flex items-center gap-2">
                    <AlertTriangle size={16} className="text-amber-600" />
                    Low stock
                  </h2>
                  <Link
                    to="/ayan-khan/products"
                    className="text-xs text-midnight-900 hover:text-gold-600"
                  >
                    Manage →
                  </Link>
                </div>
                {low.length === 0 ? (
                  <p className="p-6 text-sm text-charcoal-400 text-center">
                    All good — no low-stock items.
                  </p>
                ) : (
                  <ul className="divide-y divide-line/60">
                    {low.map((p) => (
                      <li key={p.id} className="flex items-center gap-3 px-5 py-3">
                        <img
                          src={p.primaryImage}
                          alt=""
                          className="w-10 h-10 rounded-lg object-cover bg-ivory"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-midnight-900 truncate">
                            {p.name}
                          </p>
                          <p className="text-xs text-amber-600">
                            {p.totalStock} left
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SkeletonGrid(): JSX.Element {
  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card p-5">
            <div className="skeleton h-3 w-1/2 mb-3" />
            <div className="skeleton h-8 w-2/3" />
          </div>
        ))}
      </div>
      <div className="skeleton h-72 rounded-xl2 mb-6" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="skeleton h-80 rounded-xl2" />
        <div className="skeleton h-80 rounded-xl2" />
      </div>
    </div>
  );
}
