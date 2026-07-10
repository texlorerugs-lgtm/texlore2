import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/admin/PageHeader';
import { SearchBar } from '@/components/admin/SearchBar';
import { StatusPill } from '@/components/admin/StatusPill';
import { Pagination } from '@/components/admin/Pagination';
import { adminOrdersApi } from '@/services/admin-orders.service';
import type { Order, OrderStatus } from '@/types/order';

const STATUSES: Array<OrderStatus | 'all'> = [
  'all',
  'pending',
  'confirmed',
  'preparing',
  'packed',
  'shipped',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'returned',
  'refunded',
];

function inr(n: number): string {
  return `₹${(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export default function AdminOrdersPage(): JSX.Element {
  const [items, setItems] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<OrderStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    (async () => {
      try {
        const r = await adminOrdersApi.list({ q, status, page, limit: 20 });
        setItems(r.items);
        setTotal(r.total);
        setPages(r.pages);
      } finally {
        setLoading(false);
      }
    })();
  }, [q, status, page]);

  return (
    <div>
      <PageHeader title="Orders" subtitle={`${total} order${total === 1 ? '' : 's'}`} />

      <div className="flex flex-wrap gap-3 justify-between mb-4">
        <SearchBar
          value={q}
          onChange={setQ}
          placeholder="Order number, email, payment ID…"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as OrderStatus | 'all')}
          className="rounded-full border border-line bg-pearl px-3 py-2 text-sm text-midnight-900 outline-none focus:border-midnight-900"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s === 'all' ? 'All statuses' : s.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-ivory text-charcoal-400 text-xs uppercase tracking-widest">
              <tr>
                <th className="text-left px-5 py-3">Order</th>
                <th className="text-left px-5 py-3">Customer</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-right px-5 py-3">Total</th>
                <th className="text-left px-5 py-3">Placed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-5 py-4"><div className="skeleton h-4 w-32" /></td>
                    <td className="px-5 py-4"><div className="skeleton h-4 w-40" /></td>
                    <td className="px-5 py-4"><div className="skeleton h-4 w-20" /></td>
                    <td className="px-5 py-4 text-right"><div className="skeleton h-4 w-16 ml-auto" /></td>
                    <td className="px-5 py-4"><div className="skeleton h-4 w-24" /></td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center px-5 py-10 text-charcoal-400">
                    No orders yet.
                  </td>
                </tr>
              ) : (
                items.map((o) => (
                  <tr key={o.id} className="hover:bg-ivory transition-colors">
                    <td className="px-5 py-3">
                      <Link
                        to={`/admin/orders/${o.orderNumber}`}
                        className="font-medium text-midnight-900 hover:text-gold-600"
                      >
                        {o.orderNumber}
                      </Link>
                      <div className="text-xs text-charcoal-400">
                        {o.items.length} item(s)
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="text-midnight-900">{o.userName}</div>
                      <div className="text-xs text-charcoal-400">{o.userEmail}</div>
                    </td>
                    <td className="px-5 py-3">
                      <StatusPill status={o.orderStatus} />
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-midnight-900">
                      {inr(o.grandTotal)}
                    </td>
                    <td className="px-5 py-3 text-charcoal-400">
                      {new Date(o.createdAt).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination page={page} pages={pages} onChange={setPage} />
    </div>
  );
}
