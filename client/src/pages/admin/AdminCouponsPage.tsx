import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Undo2 } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { SearchBar } from '@/components/admin/SearchBar';
import { Pagination } from '@/components/admin/Pagination';
import { StatusPill } from '@/components/admin/StatusPill';
import { Modal } from '@/components/admin/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { http } from '@/lib/http';
import type { ApiSuccess } from '@/types/api';

interface Coupon {
  id: string;
  code: string;
  description: string;
  type: 'percent' | 'fixed' | 'free_shipping';
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount: number;
  usageLimit: number;
  perUserLimit: number;
  usedCount: number;
  startsAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  deletedAt: string | null;
}

interface Page {
  items: Coupon[];
  total: number;
  page: number;
  pages: number;
}

async function unwrap<T>(p: Promise<{ data: ApiSuccess<T> }>): Promise<T> {
  return (await p).data.data;
}

const api = {
  list: (params: Record<string, unknown>) =>
    unwrap<Page>(http.get('/admin/coupons', { audience: 'admin', params })),
  create: (body: Partial<Coupon>) =>
    unwrap<{ coupon: Coupon }>(http.post('/admin/coupons', body, { audience: 'admin' })),
  update: (id: string, body: Partial<Coupon>) =>
    unwrap<{ coupon: Coupon }>(http.patch(`/admin/coupons/${id}`, body, { audience: 'admin' })),
  del: (id: string) => http.post(`/admin/coupons/${id}/delete`, {}, { audience: 'admin' }),
  restore: (id: string) => http.post(`/admin/coupons/${id}/restore`, {}, { audience: 'admin' }),
};

export default function AdminCouponsPage(): JSX.Element {
  const [items, setItems] = useState<Coupon[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [q, setQ] = useState('');
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);

  async function refresh(): Promise<void> {
    setLoading(true);
    try {
      const r = await api.list({ q, includeDeleted, page, limit: 20 });
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
  }, [q, includeDeleted, page]);

  return (
    <div>
      <PageHeader
        title="Coupons"
        subtitle={`${total} coupon${total === 1 ? '' : 's'}`}
        actions={
          <Button
            variant="primary"
            leftIcon={<Plus size={16} />}
            onClick={() => {
              setEditing(null);
              setOpenForm(true);
            }}
          >
            New coupon
          </Button>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <SearchBar value={q} onChange={setQ} placeholder="Search code…" />
        <label className="text-sm text-charcoal-400 inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={includeDeleted}
            onChange={(e) => setIncludeDeleted(e.target.checked)}
          />
          Show deleted
        </label>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-ivory text-charcoal-400 text-xs uppercase tracking-widest">
              <tr>
                <th className="text-left px-5 py-3">Code</th>
                <th className="text-left px-5 py-3">Type</th>
                <th className="text-left px-5 py-3">Value</th>
                <th className="text-left px-5 py-3">Used</th>
                <th className="text-left px-5 py-3">Expires</th>
                <th className="text-left px-5 py-3">Status</th>
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
                    No coupons yet.
                  </td>
                </tr>
              ) : (
                items.map((c) => (
                  <tr key={c.id} className="hover:bg-ivory transition-colors">
                    <td className="px-5 py-3 font-medium text-midnight-900">
                      {c.code}
                      {c.description && (
                        <div className="text-xs text-charcoal-400">{c.description}</div>
                      )}
                    </td>
                    <td className="px-5 py-3 capitalize">
                      {c.type.replace('_', ' ')}
                    </td>
                    <td className="px-5 py-3">
                      {c.type === 'percent'
                        ? `${c.discountValue}%`
                        : c.type === 'fixed'
                        ? `₹${c.discountValue.toLocaleString('en-IN')}`
                        : 'Free shipping'}
                    </td>
                    <td className="px-5 py-3 text-charcoal-500">
                      {c.usedCount}
                      {c.usageLimit ? ` / ${c.usageLimit}` : ''}
                    </td>
                    <td className="px-5 py-3 text-charcoal-500">
                      {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <StatusPill
                        status={c.deletedAt ? 'archived' : c.isActive ? 'active' : 'hidden'}
                      />
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      {c.deletedAt ? (
                        <button
                          onClick={async () => {
                            try {
                              await api.restore(c.id);
                              toast.success('Restored');
                              await refresh();
                            } catch {
                              toast.error('Could not restore');
                            }
                          }}
                          className="inline-flex items-center gap-1 text-xs text-midnight-900 hover:text-gold-600"
                        >
                          <Undo2 size={12} /> Restore
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setEditing(c);
                              setOpenForm(true);
                            }}
                            className="inline-flex items-center gap-1 text-xs text-midnight-900 hover:text-gold-600 mr-3"
                          >
                            <Pencil size={12} /> Edit
                          </button>
                          <button
                            onClick={async () => {
                              if (!confirm(`Delete coupon ${c.code}?`)) return;
                              try {
                                await api.del(c.id);
                                toast.success('Deleted');
                                await refresh();
                              } catch {
                                toast.error('Could not delete');
                              }
                            }}
                            className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
                          >
                            <Trash2 size={12} /> Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination page={page} pages={pages} onChange={setPage} />

      <CouponFormModal
        open={openForm}
        onClose={() => setOpenForm(false)}
        editing={editing}
        onSaved={async () => {
          setOpenForm(false);
          await refresh();
        }}
      />
    </div>
  );
}

interface CouponForm {
  code: string;
  description: string;
  type: 'percent' | 'fixed' | 'free_shipping';
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount: number;
  usageLimit: number;
  perUserLimit: number;
  startsAt: string;
  expiresAt: string;
  isActive: boolean;
}

function CouponFormModal({
  open,
  onClose,
  editing,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  editing: Coupon | null;
  onSaved: () => Promise<void> | void;
}): JSX.Element {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CouponForm>({
    defaultValues: {
      code: '',
      description: '',
      type: 'percent',
      discountValue: 10,
      minOrderAmount: 0,
      maxDiscountAmount: 0,
      usageLimit: 0,
      perUserLimit: 1,
      startsAt: '',
      expiresAt: '',
      isActive: true,
    },
  });
  const type = watch('type');
  useEffect(() => {
    if (!open) return;
    reset({
      code: editing?.code ?? '',
      description: editing?.description ?? '',
      type: editing?.type ?? 'percent',
      discountValue: editing?.discountValue ?? 10,
      minOrderAmount: editing?.minOrderAmount ?? 0,
      maxDiscountAmount: editing?.maxDiscountAmount ?? 0,
      usageLimit: editing?.usageLimit ?? 0,
      perUserLimit: editing?.perUserLimit ?? 1,
      startsAt: editing?.startsAt?.slice(0, 10) ?? '',
      expiresAt: editing?.expiresAt?.slice(0, 10) ?? '',
      isActive: editing ? editing.isActive : true,
    });
  }, [open, editing, reset]);

  async function onSubmit(values: CouponForm): Promise<void> {
    const body: Partial<Coupon> = {
      code: values.code.toUpperCase().trim(),
      description: values.description,
      type: values.type,
      discountValue: Number(values.discountValue ?? 0),
      minOrderAmount: Number(values.minOrderAmount ?? 0),
      maxDiscountAmount: Number(values.maxDiscountAmount ?? 0),
      usageLimit: Number(values.usageLimit ?? 0),
      perUserLimit: Number(values.perUserLimit ?? 1),
      startsAt: values.startsAt ? new Date(values.startsAt).toISOString() : null,
      expiresAt: values.expiresAt ? new Date(values.expiresAt).toISOString() : null,
      isActive: !!values.isActive,
    };
    try {
      if (editing) {
        await api.update(editing.id, body);
        toast.success('Coupon updated');
      } else {
        await api.create(body);
        toast.success('Coupon created');
      }
      await onSaved();
    } catch (e: unknown) {
      toast.error(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Could not save',
      );
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit coupon' : 'New coupon'}>
      <form onSubmit={handleSubmit(onSubmit)} className="grid sm:grid-cols-2 gap-4" noValidate>
        <Input
          label="Code"
          className="uppercase tracking-widest"
          error={errors.code?.message}
          {...register('code', {
            required: 'Required',
            pattern: { value: /^[A-Z0-9_-]{2,40}$/i, message: 'A–Z, 0–9, _ or -' },
          })}
        />
        <label className="block">
          <span className="block mb-1.5 text-sm font-medium text-charcoal-500">Type</span>
          <select
            {...register('type')}
            className="w-full rounded-xl border border-line bg-pearl px-3 py-3 outline-none focus:border-midnight-900"
          >
            <option value="percent">Percent</option>
            <option value="fixed">Fixed amount (₹)</option>
            <option value="free_shipping">Free shipping</option>
          </select>
        </label>
        {type !== 'free_shipping' && (
          <Input
            label={type === 'percent' ? 'Discount % (1–90)' : 'Discount amount (₹)'}
            type="number"
            step="0.01"
            {...register('discountValue', { valueAsNumber: true })}
          />
        )}
        <Input
          label="Min order amount (₹)"
          type="number"
          {...register('minOrderAmount', { valueAsNumber: true })}
        />
        {type === 'percent' && (
          <Input
            label="Max discount cap (₹, 0 = none)"
            type="number"
            {...register('maxDiscountAmount', { valueAsNumber: true })}
          />
        )}
        <Input
          label="Total usage limit (0 = unlimited)"
          type="number"
          {...register('usageLimit', { valueAsNumber: true })}
        />
        <Input
          label="Per-user limit"
          type="number"
          min={1}
          {...register('perUserLimit', { valueAsNumber: true })}
        />
        <Input label="Starts at" type="date" {...register('startsAt')} />
        <Input label="Expires at" type="date" {...register('expiresAt')} />
        <div className="sm:col-span-2">
          <label className="block">
            <span className="block mb-1.5 text-sm font-medium text-charcoal-500">
              Description (internal)
            </span>
            <textarea
              {...register('description', { maxLength: 500 })}
              rows={2}
              className="w-full rounded-xl border border-line bg-pearl px-3 py-3 outline-none focus:border-midnight-900"
            />
          </label>
        </div>
        <label className="sm:col-span-2 flex items-center gap-2 text-sm">
          <input type="checkbox" {...register('isActive')} /> Active
        </label>
        <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={isSubmitting}>
            {editing ? 'Save changes' : 'Create coupon'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
