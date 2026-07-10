import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatCard } from '@/components/admin/StatCard';
import { RevenueChart } from '@/components/admin/RevenueChart';
import {
  adminAnalyticsApi,
  type DashboardSummary,
  type RevenuePoint,
  type TopProduct,
} from '@/services/admin-analytics.service';

function inr(n: number): string {
  return `₹${(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export default function AdminAnalyticsPage(): JSX.Element {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [series, setSeries] = useState<RevenuePoint[]>([]);
  const [top, setTop] = useState<TopProduct[]>([]);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    (async () => {
      try {
        const [s, sr, t] = await Promise.all([
          adminAnalyticsApi.summary(),
          adminAnalyticsApi.revenueSeries(days),
          adminAnalyticsApi.topProducts(10),
        ]);
        setSummary(s);
        setSeries(sr.series);
        setTop(t.products);
      } finally {
        setLoading(false);
      }
    })();
  }, [days]);

  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle="Revenue, orders, and top-selling products across your store."
        actions={
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-full border border-line bg-pearl px-3 py-2 text-sm text-midnight-900 outline-none focus:border-midnight-900"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={180}>Last 6 months</option>
          </select>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard
          label={`Revenue (${days}d)`}
          value={loading || !summary ? '—' : inr(days === 30 ? summary.revenue.last30Days : series.reduce((s, p) => s + p.revenue, 0))}
          accent="gold"
        />
        <StatCard
          label="Total lifetime"
          value={loading || !summary ? '—' : inr(summary.revenue.total)}
        />
        <StatCard
          label="Average order value"
          value={loading || !summary ? '—' : inr(summary.revenue.averageOrderValue)}
        />
        <StatCard
          label="Orders in window"
          value={loading ? '—' : series.reduce((s, p) => s + p.orders, 0)}
        />
      </div>

      <section className="card p-6 mb-6">
        <h2 className="font-display text-lg text-midnight-900 mb-4">Revenue</h2>
        {loading ? <div className="skeleton h-56 rounded-xl" /> : <RevenueChart data={series} metric="revenue" />}
      </section>

      <section className="card p-6 mb-6">
        <h2 className="font-display text-lg text-midnight-900 mb-4">Orders per day</h2>
        {loading ? <div className="skeleton h-56 rounded-xl" /> : <RevenueChart data={series} metric="orders" />}
      </section>

      <section className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-line/60">
          <h2 className="font-display text-lg text-midnight-900">Top-selling products</h2>
        </div>
        {loading ? (
          <div className="p-6"><div className="skeleton h-32" /></div>
        ) : top.length === 0 ? (
          <p className="text-center text-charcoal-400 py-10">
            Not enough sales data yet.
          </p>
        ) : (
          <ul className="divide-y divide-line/60">
            {top.map((p, i) => (
              <li key={p.productId} className="flex items-center gap-3 px-5 py-3">
                <span className="w-5 text-right text-charcoal-400 text-sm">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-midnight-900 truncate">
                    {p.productName}
                  </p>
                  <p className="text-xs text-charcoal-400">{p.unitsSold} sold</p>
                </div>
                <div className="text-sm font-semibold text-midnight-900">
                  {inr(p.revenue)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
