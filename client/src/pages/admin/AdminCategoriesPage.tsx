import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Undo2, Upload } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatusPill } from '@/components/admin/StatusPill';
import { Pagination } from '@/components/admin/Pagination';
import { Modal } from '@/components/admin/Modal';
import { SearchBar } from '@/components/admin/SearchBar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  adminCategoryApi,
  type AdminCategory,
  type CategoryFormData,
} from '@/services/admin-catalog.service';

export default function AdminCategoriesPage(): JSX.Element {
  const [items, setItems] = useState<AdminCategory[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<AdminCategory | null>(null);
  const [deleting, setDeleting] = useState<AdminCategory | null>(null);

  async function refresh(): Promise<void> {
    setLoading(true);
    try {
      const r = await adminCategoryApi.list({ q, includeDeleted, page, limit: 20 });
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
        title="Categories"
        subtitle={`${total} categor${total === 1 ? 'y' : 'ies'}`}
        actions={
          <Button
            variant="primary"
            leftIcon={<Plus size={16} />}
            onClick={() => {
              setEditing(null);
              setOpenForm(true);
            }}
          >
            Add category
          </Button>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <SearchBar value={q} onChange={setQ} placeholder="Search categories…" />
        <label className="text-sm text-charcoal-400 inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={includeDeleted}
            onChange={(e) => setIncludeDeleted(e.target.checked)}
          />
          Show trashed
        </label>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="card overflow-hidden">
              <div className="skeleton aspect-[4/3]" />
              <div className="p-4 space-y-2">
                <div className="skeleton h-4 w-3/4" />
                <div className="skeleton h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="card p-12 text-center text-charcoal-400">
          No categories found. Click Add category to create one.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((c) => (
            <article key={c.id} className="card overflow-hidden">
              <div className="relative aspect-[4/3] bg-ivory">
                {c.image?.url ? (
                  <img
                    src={c.image.url}
                    alt={c.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="skeleton w-full h-full" />
                )}
                <div className="absolute top-3 left-3">
                  <StatusPill status={c.deletedAt ? 'archived' : c.status} />
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-display text-lg text-midnight-900 truncate">
                  {c.name}
                </h3>
                <p className="text-xs text-charcoal-400 truncate">
                  {c.productCount} products
                </p>
                <div className="mt-3 flex items-center gap-2">
                  {c.deletedAt ? (
                    <Button
                      variant="ghost"
                      className="!py-1.5 !text-xs"
                      leftIcon={<Undo2 size={12} />}
                      onClick={async () => {
                        try {
                          await adminCategoryApi.restore(c.id);
                          toast.success('Restored');
                          await refresh();
                        } catch (e: unknown) {
                          toast.error(
                            (e as { response?: { data?: { message?: string } } })
                              ?.response?.data?.message ?? 'Could not restore',
                          );
                        }
                      }}
                    >
                      Restore
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        className="!py-1.5 !text-xs"
                        leftIcon={<Pencil size={12} />}
                        onClick={() => {
                          setEditing(c);
                          setOpenForm(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        className="!py-1.5 !text-xs !text-red-600 !border-red-200 hover:!bg-red-50"
                        leftIcon={<Trash2 size={12} />}
                        onClick={() => setDeleting(c)}
                      >
                        Delete
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Pagination page={page} pages={pages} onChange={setPage} />

      <CategoryFormModal
        open={openForm}
        onClose={() => setOpenForm(false)}
        editing={editing}
        onSaved={async () => {
          setOpenForm(false);
          await refresh();
        }}
      />

      <DeleteCategoryModal
        target={deleting}
        others={items.filter((i) => i.id !== deleting?.id && !i.deletedAt)}
        onClose={() => setDeleting(null)}
        onDeleted={async () => {
          setDeleting(null);
          await refresh();
        }}
      />
    </div>
  );
}

/* ---------- Form ---------- */
function CategoryFormModal({
  open,
  onClose,
  editing,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  editing: AdminCategory | null;
  onSaved: () => Promise<void> | void;
}): JSX.Element {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormData>({
    defaultValues: {
      name: '',
      description: '',
      status: 'active',
      priority: 0,
      seoTitle: '',
      seoDescription: '',
    },
  });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');

  useEffect(() => {
    if (!open) return;
    reset({
      name: editing?.name ?? '',
      description: editing?.description ?? '',
      status: editing?.status ?? 'active',
      priority: editing?.priority ?? 0,
      seoTitle: editing?.seoTitle ?? '',
      seoDescription: editing?.seoDescription ?? '',
    });
    setFile(null);
    setPreview(editing?.image?.url ?? '');
  }, [open, editing, reset]);

  function pickFile(f: File | undefined): void {
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function onSubmit(values: CategoryFormData): Promise<void> {
    try {
      if (editing) {
        await adminCategoryApi.update(editing.id, { ...values, imageFile: file ?? undefined });
        toast.success('Category updated');
      } else {
        if (!file) {
          toast.error('Please choose an image');
          return;
        }
        await adminCategoryApi.create({ ...values, imageFile: file });
        toast.success('Category created');
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
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit category' : 'Add category'}
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="grid sm:grid-cols-2 gap-4" noValidate>
        <div className="sm:col-span-2 flex gap-4">
          <div className="w-32 h-32 rounded-xl overflow-hidden bg-ivory border border-line flex-shrink-0">
            {preview ? (
              <img src={preview} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-charcoal-400 text-xs">
                No image
              </div>
            )}
          </div>
          <label className="flex-1 rounded-xl border-2 border-dashed border-line px-4 py-6 text-center cursor-pointer hover:border-midnight-900/40 transition-colors">
            <Upload className="mx-auto text-charcoal-400 mb-2" size={20} />
            <p className="text-sm text-midnight-900 font-medium">Upload image</p>
            <p className="text-xs text-charcoal-400 mt-1">
              JPG, PNG, WEBP up to 8 MB — device gallery opens
            </p>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0] ?? undefined)}
            />
          </label>
        </div>
        <Input
          label="Name"
          error={errors.name?.message}
          {...register('name', { required: 'Name is required', maxLength: 80 })}
        />
        <label className="block">
          <span className="block mb-1.5 text-sm font-medium text-charcoal-500">
            Status
          </span>
          <select
            {...register('status')}
            className="w-full rounded-xl border border-line bg-pearl px-3 py-3 outline-none focus:border-midnight-900"
          >
            <option value="active">Active</option>
            <option value="hidden">Hidden</option>
          </select>
        </label>
        <Input
          label="Priority"
          type="number"
          {...register('priority', { valueAsNumber: true })}
        />
        <Input label="SEO title" {...register('seoTitle', { maxLength: 160 })} />
        <div className="sm:col-span-2">
          <label className="block mb-1.5 text-sm font-medium text-charcoal-500">
            Description
          </label>
          <textarea
            {...register('description', { maxLength: 5000 })}
            rows={3}
            className="w-full rounded-xl border border-line bg-pearl px-3 py-3 outline-none focus:border-midnight-900"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block mb-1.5 text-sm font-medium text-charcoal-500">
            SEO description
          </label>
          <textarea
            {...register('seoDescription', { maxLength: 500 })}
            rows={2}
            className="w-full rounded-xl border border-line bg-pearl px-3 py-3 outline-none focus:border-midnight-900"
          />
        </div>
        <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={isSubmitting}>
            {editing ? 'Save changes' : 'Create category'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------- Delete ---------- */
function DeleteCategoryModal({
  target,
  others,
  onClose,
  onDeleted,
}: {
  target: AdminCategory | null;
  others: AdminCategory[];
  onClose: () => void;
  onDeleted: () => Promise<void> | void;
}): JSX.Element {
  const [impact, setImpact] = useState<number | null>(null);
  const [mode, setMode] = useState<'empty' | 'move' | 'cascade'>('empty');
  const [targetId, setTargetId] = useState<string>('');
  const [busy, setBusy] = useState(false);

  const otherLive = useMemo(() => others.filter((o) => o.id !== target?.id), [others, target]);

  useEffect(() => {
    if (!target) {
      setImpact(null);
      setMode('empty');
      setTargetId('');
      return;
    }
    (async () => {
      try {
        const { productCount } = await adminCategoryApi.deleteImpact(target.id);
        setImpact(productCount);
        setMode(productCount === 0 ? 'empty' : 'move');
        setTargetId(otherLive[0]?.id ?? '');
      } catch {
        toast.error('Could not check impact');
      }
    })();
  }, [target, otherLive]);

  async function handleDelete(): Promise<void> {
    if (!target) return;
    setBusy(true);
    try {
      await adminCategoryApi.delete(target.id, {
        mode,
        targetCategoryId: mode === 'move' ? targetId : undefined,
      });
      toast.success('Category deleted');
      await onDeleted();
    } catch (e: unknown) {
      toast.error(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Could not delete',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={!!target} onClose={onClose} title="Delete category" size="sm">
      {target && (
        <div className="space-y-4">
          <p className="text-sm text-charcoal-500">
            Deleting <strong>{target.name}</strong> — this can be restored from the
            trashed list.
          </p>
          {impact === null ? (
            <div className="skeleton h-16 rounded-xl" />
          ) : impact === 0 ? (
            <p className="text-sm text-emerald-700">
              This category contains no products. Safe to delete.
            </p>
          ) : (
            <>
              <p className="text-sm text-amber-700">
                This category contains {impact} product(s). Choose what happens to them.
              </p>
              <div className="space-y-2">
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="radio"
                    name="del-mode"
                    checked={mode === 'move'}
                    onChange={() => setMode('move')}
                  />
                  <span>
                    <strong>Move</strong> the products to another category:
                    <select
                      value={targetId}
                      onChange={(e) => setTargetId(e.target.value)}
                      disabled={mode !== 'move'}
                      className="ml-2 rounded-full border border-line bg-pearl px-2 py-1 text-xs"
                    >
                      {otherLive.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </span>
                </label>
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="radio"
                    name="del-mode"
                    checked={mode === 'cascade'}
                    onChange={() => setMode('cascade')}
                  />
                  <span>
                    <strong>Move to trash</strong> all products inside this category.
                  </span>
                </label>
              </div>
            </>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={busy}
              onClick={handleDelete}
              disabled={impact === null || (mode === 'move' && !targetId)}
              className="!bg-red-600 hover:!bg-red-700"
            >
              Delete category
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
