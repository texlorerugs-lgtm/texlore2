import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Mail, Trash2, Reply } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { SearchBar } from '@/components/admin/SearchBar';
import { Pagination } from '@/components/admin/Pagination';
import { StatusPill } from '@/components/admin/StatusPill';
import {
  adminContactApi,
  type ContactMsg,
  type ContactStatus,
} from '@/services/admin-contact.service';

const STATUSES: Array<ContactStatus | 'all'> = [
  'all',
  'new',
  'read',
  'replied',
  'resolved',
  'archived',
];

export default function AdminMessagesPage(): JSX.Element {
  const [items, setItems] = useState<ContactMsg[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<ContactStatus | 'all'>('all');
  const [selected, setSelected] = useState<ContactMsg | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh(): Promise<void> {
    setLoading(true);
    try {
      const r = await adminContactApi.list({ q, status, page, limit: 20 });
      setItems(r.items);
      setTotal(r.total);
      setPages(r.pages);
      if (selected) setSelected(r.items.find((i) => i.id === selected.id) ?? null);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status, page]);

  async function setStatusOf(m: ContactMsg, s: ContactStatus): Promise<void> {
    try {
      await adminContactApi.updateStatus(m.id, s);
      toast.success(`Marked ${s}`);
      await refresh();
    } catch {
      toast.error('Could not update');
    }
  }

  async function remove(m: ContactMsg): Promise<void> {
    if (!confirm(`Delete message from ${m.email}?`)) return;
    try {
      await adminContactApi.remove(m.id);
      toast.success('Deleted');
      if (selected?.id === m.id) setSelected(null);
      await refresh();
    } catch {
      toast.error('Could not delete');
    }
  }

  return (
    <div>
      <PageHeader
        title="Messages"
        subtitle={`${total} message${total === 1 ? '' : 's'}`}
      />

      <div className="flex flex-wrap gap-3 justify-between mb-4">
        <SearchBar value={q} onChange={setQ} placeholder="Search name, email, message…" />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as ContactStatus | 'all')}
          className="rounded-full border border-line bg-pearl px-3 py-2 text-sm text-midnight-900 outline-none focus:border-midnight-900"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s === 'all' ? 'All' : s}
            </option>
          ))}
        </select>
      </div>

      <div className="grid lg:grid-cols-[1fr_1fr] gap-4">
        <div className="card overflow-hidden">
          <ul className="divide-y divide-line/60 max-h-[70vh] overflow-y-auto">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <li key={i} className="p-4">
                  <div className="skeleton h-4 w-3/4 mb-2" />
                  <div className="skeleton h-3 w-1/2" />
                </li>
              ))
            ) : items.length === 0 ? (
              <li className="p-10 text-center text-charcoal-400">No messages.</li>
            ) : (
              items.map((m) => (
                <li key={m.id}>
                  <button
                    onClick={() => {
                      setSelected(m);
                      if (m.status === 'new') void setStatusOf(m, 'read');
                    }}
                    className={
                      'w-full text-left px-4 py-3 hover:bg-ivory transition-colors ' +
                      (selected?.id === m.id ? 'bg-ivory' : '')
                    }
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="font-medium text-midnight-900 truncate">
                        {m.name}
                      </div>
                      <StatusPill status={m.status} />
                    </div>
                    <div className="text-xs text-charcoal-400 truncate">{m.email}</div>
                    <p className="text-sm text-charcoal-500 mt-1 line-clamp-2">
                      {m.message}
                    </p>
                    <p className="text-[10px] text-charcoal-400 mt-1">
                      {new Date(m.createdAt).toLocaleString('en-IN')}
                    </p>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="card p-6 h-fit sticky top-24">
          {selected ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="font-display text-xl text-midnight-900">
                    {selected.name}
                  </h2>
                  <p className="text-sm text-charcoal-400">{selected.email}</p>
                  {selected.phone && (
                    <p className="text-xs text-charcoal-400">
                      {selected.countryCode} {selected.phone}
                    </p>
                  )}
                </div>
                <StatusPill status={selected.status} />
              </div>
              <div className="rounded-xl bg-ivory p-4 whitespace-pre-wrap text-sm text-charcoal-500 leading-relaxed">
                {selected.message}
              </div>
              <p className="text-xs text-charcoal-400 mt-3">
                Received {new Date(selected.createdAt).toLocaleString('en-IN')}
                {selected.emailNotified
                  ? ' · admin email delivered'
                  : ' · admin email pending / failed'}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href={`mailto:${selected.email}?subject=${encodeURIComponent(
                    'Re: your Texlore message',
                  )}`}
                  className="btn-primary !py-2 !text-xs"
                >
                  <Reply size={14} /> Reply by email
                </a>
                <button
                  onClick={() => setStatusOf(selected, 'replied')}
                  className="btn-ghost !py-2 !text-xs"
                >
                  Mark replied
                </button>
                <button
                  onClick={() => setStatusOf(selected, 'resolved')}
                  className="btn-ghost !py-2 !text-xs"
                >
                  Mark resolved
                </button>
                <button
                  onClick={() => setStatusOf(selected, 'archived')}
                  className="btn-ghost !py-2 !text-xs"
                >
                  Archive
                </button>
                <button
                  onClick={() => remove(selected)}
                  className="btn-ghost !py-2 !text-xs !text-red-600 !border-red-200 hover:!bg-red-50"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-16">
              <Mail className="mx-auto text-charcoal-400 mb-2" size={30} />
              <p className="text-sm text-charcoal-400">Select a message to read.</p>
            </div>
          )}
        </div>
      </div>

      <Pagination page={page} pages={pages} onChange={setPage} />
    </div>
  );
}
