import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Ban, Check } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { SearchBar } from '@/components/admin/SearchBar';
import { StatusPill } from '@/components/admin/StatusPill';
import { Pagination } from '@/components/admin/Pagination';
import { adminCustomersApi, type AdminCustomer } from '@/services/admin-customers.service';

function inr(n: number): string {
  return `₹${(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

const STATUS = ['all', 'active', 'blocked', 'verified', 'unverified'] as const;
type Status = (typeof STATUS)[number];

export default function AdminCustomersPage(): JSX.Element {
  const [items, setItems] = useState<AdminCustomer[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<Status>('all');
  const [loading, setLoading] = useState(true);

  async function refresh(): Promise<void> {
    setLoading(true);
    try {
      const r = await adminCustomersApi.list({ q, status, page, limit: 20 });
      setItems(r.items);
      setTotal(r.total);
      setPages(r.pages);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status, page]);

  async function toggleBlock(c: AdminCustomer): Promise<void> {
    const target = !c.isBlocked;
    if (!confirm(`${target ? 'Block' : 'Unblock'} ${c.email}?`)) return;
    try {
      await adminCustomersApi.setBlocked(c.id, target);
      toast.success(target ? 'Customer blocked' : 'Customer unblocked');
      await refresh();
    } catch {
      toast.error('Could not update');
    }
  }

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle={`${total} customer${total === 1 ? '' : 's'}`}
      />

      <div className="flex flex-wrap gap-3 justify-between mb-4">
        <SearchBar value={q} onChange={setQ} placeholder="Name, email or phone…" />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as Status)}
          className="rounded-full border border-line bg-pearl px-3 py-2 text-sm text-midnight-900 outline-none focus:border-midnight-900"
        >
          {STATUS.map((s) => (
            <option key={s} value={s}>
              {s === 'all' ? 'All' : s}
            </option>
          ))}
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-ivory text-charcoal-400 text-xs uppercase tracking-widest">
              <tr>
                <th className="text-left px-5 py-3">Customer</th>
                <th className="text-left px-5 py-3">Phone</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-right px-5 py-3">Orders</th>
                <th className="text-right px-5 py-3">Spent</th>
                <th className="text-left px-5 py-3">Joined</th>
                <th className="text-right px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="px-5 py-4">
                      <div className="skeleton h-4 w-full" />
                    </td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-charcoal-400">
                    No customers found.
                  </td>
                </tr>
              ) : (
                items.map((c) => (
                  <tr key={c.id} className="hover:bg-ivory transition-colors">
                    <td className="px-5 py-3">
                      <div className="font-medium text-midnight-900">{c.name}</div>
                      <div className="text-xs text-charcoal-400">{c.email}</div>
                    </td>
                    <td className="px-5 py-3 text-charcoal-500">
                      {c.countryCode} {c.phone}
                    </td>
                    <td className="px-5 py-3 space-x-1">
                      {c.isBlocked ? (
                        <StatusPill status="blocked" />
                      ) : c.isVerified ? (
                        <StatusPill status="verified" />
                      ) : (
                        <StatusPill status="unverified" />
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">{c.orderCount}</td>
                    <td className="px-5 py-3 text-right font-medium text-midnight-900">
                      {inr(c.totalSpent)}
                    </td>
                    <td className="px-5 py-3 text-charcoal-400">
                      {new Date(c.createdAt).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => toggleBlock(c)}
                        className={
                          'inline-flex items-center gap-1 text-xs font-medium ' +
                          (c.isBlocked
                            ? 'text-emerald-700 hover:text-emerald-800'
                            : 'text-red-600 hover:text-red-700')
                        }
                      >
                        {c.isBlocked ? (
                          <>
                            <Check size={12} /> Unblock
                          </>
                        ) : (
                          <>
                            <Ban size={12} /> Block
                          </>
                        )}
                      </button>
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
