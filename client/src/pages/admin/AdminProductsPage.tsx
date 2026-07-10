import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Undo2, Upload, X, Star } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatusPill } from '@/components/admin/StatusPill';
import { Pagination } from '@/components/admin/Pagination';
import { Modal } from '@/components/admin/Modal';
import { SearchBar } from '@/components/admin/SearchBar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  adminProductApi,
  adminCategoryApi,
  type AdminCategory,
  type ProductFormData,
} from '@/services/admin-catalog.service';

interface AdminProductRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  minPrice: number;
  totalStock: number;
  featured?: boolean;
  bestSeller?: boolean;
  deletedAt?: string | null;
  images?: Array<{ url: string; publicId: string; order: number }>;
  category?: { id: string; name: string; slug: string };
  categoryId?: string;
  sizeVariations?: Array<{
    _id?: string;
    size: string;
    price: number;
    discountPercent: number;
    stock: number;
    weightKg: number;
    isPrimary: boolean;
    sku?: string;
  }>;
  description?: string;
  material?: string;
  origin?: string;
  shape?: string;
  color?: string;
  weightKg?: number;
  pileHeightMm?: number;
  knotDensity?: string;
  construction?: string;
  careInstructions?: string;
  shippingInfo?: string;
  warranty?: string;
  seoTitle?: string;
  seoDescription?: string;
  tags?: string[];
  trending?: boolean;
  newArrival?: boolean;
}

export default function AdminProductsPage(): JSX.Element {
  const [items, setItems] = useState<AdminProductRow[]>([]);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [categoryId, setCategoryId] = useState<string>('');
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<AdminProductRow | null>(null);

  async function refresh(): Promise<void> {
    setLoading(true);
    try {
      const r = await adminProductApi.list({
        q,
        status: status === 'all' ? undefined : status,
        categoryId: categoryId || undefined,
        includeDeleted,
        page,
        limit: 20,
      });
      setItems(r.items as unknown as AdminProductRow[]);
      setTotal(r.total);
      setPages(r.pages);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      const cats = await adminCategoryApi.list({ limit: 100 });
      setCategories(cats.items);
    })();
  }, []);

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status, categoryId, includeDeleted, page]);

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle={`${total} product${total === 1 ? '' : 's'}`}
        actions={
          <Button
            variant="primary"
            leftIcon={<Plus size={16} />}
            onClick={() => {
              setEditing(null);
              setOpenForm(true);
            }}
          >
            Add product
          </Button>
        }
      />

      <div className="flex flex-wrap gap-3 items-center justify-between mb-4">
        <SearchBar value={q} onChange={setQ} placeholder="Search products…" />
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="rounded-full border border-line bg-pearl px-3 py-2 text-sm text-midnight-900 outline-none focus:border-midnight-900"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-full border border-line bg-pearl px-3 py-2 text-sm text-midnight-900 outline-none focus:border-midnight-900"
          >
            <option value="all">All statuses</option>
            <option value="available">Available</option>
            <option value="out_of_stock">Out of stock</option>
            <option value="hidden">Hidden</option>
            <option value="coming_soon">Coming soon</option>
            <option value="discontinued">Discontinued</option>
          </select>
          <label className="text-sm text-charcoal-400 inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={includeDeleted}
              onChange={(e) => setIncludeDeleted(e.target.checked)}
            />
            Trashed
          </label>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="card overflow-hidden">
              <div className="skeleton aspect-square" />
              <div className="p-4 space-y-2">
                <div className="skeleton h-4 w-3/4" />
                <div className="skeleton h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="card p-12 text-center text-charcoal-400">
          No products match your filters.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((p) => (
            <article key={p.id} className="card overflow-hidden">
              <div className="relative aspect-square bg-ivory">
                {p.images?.[0]?.url && (
                  <img
                    src={p.images[0].url}
                    alt={p.name}
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute top-3 left-3">
                  <StatusPill status={p.deletedAt ? 'archived' : p.status} />
                </div>
              </div>
              <div className="p-4">
                <p className="text-[10px] uppercase tracking-widest text-charcoal-400">
                  {p.category?.name}
                </p>
                <h3 className="font-display text-base text-midnight-900 truncate">
                  {p.name}
                </h3>
                <p className="text-sm text-midnight-900 font-medium mt-1">
                  ₹{(p.minPrice ?? 0).toLocaleString('en-IN')}
                </p>
                <p className="text-xs text-charcoal-400">Stock: {p.totalStock}</p>
                <div className="mt-3 flex items-center gap-2">
                  {p.deletedAt ? (
                    <Button
                      variant="ghost"
                      className="!py-1.5 !text-xs"
                      leftIcon={<Undo2 size={12} />}
                      onClick={async () => {
                        try {
                          await adminProductApi.restore(p.id);
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
                          setEditing(p);
                          setOpenForm(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        className="!py-1.5 !text-xs !text-red-600 !border-red-200 hover:!bg-red-50"
                        leftIcon={<Trash2 size={12} />}
                        onClick={async () => {
                          if (!confirm(`Move "${p.name}" to trash?`)) return;
                          try {
                            await adminProductApi.softDelete(p.id);
                            toast.success('Moved to trash');
                            await refresh();
                          } catch {
                            toast.error('Could not delete');
                          }
                        }}
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

      <ProductFormModal
        open={openForm}
        onClose={() => setOpenForm(false)}
        editing={editing}
        categories={categories}
        onSaved={async () => {
          setOpenForm(false);
          await refresh();
        }}
      />
    </div>
  );
}

/* ---------- Product form ---------- */
interface FormShape extends Omit<ProductFormData, 'newImageFiles' | 'sizeVariations' | 'removeImagePublicIds' | 'reorderPublicIds' | 'tags'> {
  sizeVariations: Array<{
    size: string;
    sku?: string;
    price: number;
    discountPercent?: number;
    stock: number;
    weightKg?: number;
    isPrimary?: boolean;
  }>;
  tagsText: string;
}

function ProductFormModal({
  open,
  onClose,
  editing,
  categories,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  editing: AdminProductRow | null;
  categories: AdminCategory[];
  onSaved: () => Promise<void> | void;
}): JSX.Element {
  const { register, control, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } =
    useForm<FormShape>({
      defaultValues: {
        categoryId: '',
        name: '',
        description: '',
        material: '',
        origin: '',
        shape: 'Rectangular',
        color: '',
        weightKg: 0,
        pileHeightMm: 0,
        knotDensity: '',
        construction: '',
        careInstructions: '',
        shippingInfo: '',
        warranty: '',
        status: 'available',
        featured: false,
        trending: false,
        newArrival: false,
        bestSeller: false,
        seoTitle: '',
        seoDescription: '',
        tagsText: '',
        sizeVariations: [{ size: '5x7 ft', price: 0, discountPercent: 0, stock: 0, weightKg: 0, isPrimary: true }],
      },
    });
  const { fields, append, remove } = useFieldArray({ control, name: 'sizeVariations' });
  const primaryIndex = watch('sizeVariations').findIndex((v) => v.isPrimary);

  const [existingImages, setExistingImages] = useState<Array<{ url: string; publicId: string; order: number }>>([]);
  const [removeIds, setRemoveIds] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);

  useEffect(() => {
    if (!open) return;
    reset({
      categoryId: editing?.categoryId ?? editing?.category?.id ?? categories[0]?.id ?? '',
      name: editing?.name ?? '',
      description: editing?.description ?? '',
      material: editing?.material ?? '',
      origin: editing?.origin ?? '',
      shape: editing?.shape ?? 'Rectangular',
      color: editing?.color ?? '',
      weightKg: editing?.weightKg ?? 0,
      pileHeightMm: editing?.pileHeightMm ?? 0,
      knotDensity: editing?.knotDensity ?? '',
      construction: editing?.construction ?? '',
      careInstructions: editing?.careInstructions ?? '',
      shippingInfo: editing?.shippingInfo ?? '',
      warranty: editing?.warranty ?? '',
      status: (editing?.status as ProductFormData['status']) ?? 'available',
      featured: !!editing?.featured,
      trending: !!editing?.trending,
      newArrival: !!editing?.newArrival,
      bestSeller: !!editing?.bestSeller,
      seoTitle: editing?.seoTitle ?? '',
      seoDescription: editing?.seoDescription ?? '',
      tagsText: (editing?.tags ?? []).join(', '),
      sizeVariations: editing?.sizeVariations?.length
        ? editing.sizeVariations.map((v) => ({
            size: v.size,
            price: v.price,
            discountPercent: v.discountPercent ?? 0,
            stock: v.stock,
            weightKg: v.weightKg ?? 0,
            isPrimary: !!v.isPrimary,
            sku: v.sku ?? '',
          }))
        : [{ size: '5x7 ft', price: 0, discountPercent: 0, stock: 0, weightKg: 0, isPrimary: true }],
    });
    setExistingImages(editing?.images ?? []);
    setRemoveIds([]);
    setNewFiles([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  function setPrimary(index: number): void {
    const vs = watch('sizeVariations').map((v, i) => ({ ...v, isPrimary: i === index }));
    setValue('sizeVariations', vs, { shouldDirty: true });
  }

  function addFiles(files: FileList | null): void {
    if (!files) return;
    const arr = Array.from(files);
    const currentCount = existingImages.length - removeIds.length + newFiles.length;
    const room = 7 - currentCount;
    if (room <= 0) {
      toast.error('Maximum of 7 images per product');
      return;
    }
    setNewFiles((prev) => [...prev, ...arr.slice(0, room)]);
  }

  async function onSubmit(values: FormShape): Promise<void> {
    const totalImages = existingImages.length - removeIds.length + newFiles.length;
    if (totalImages < 1) {
      toast.error('Add at least one image');
      return;
    }
    if (totalImages > 7) {
      toast.error('Maximum 7 images');
      return;
    }
    if (!values.categoryId) {
      toast.error('Choose a category');
      return;
    }
    if (values.sizeVariations.length < 1) {
      toast.error('Add at least one size variation');
      return;
    }
    // Ensure exactly one primary
    const primaries = values.sizeVariations.filter((v) => v.isPrimary).length;
    if (primaries === 0) values.sizeVariations[0].isPrimary = true;

    const payload: ProductFormData = {
      categoryId: values.categoryId,
      name: values.name,
      description: values.description,
      material: values.material,
      origin: values.origin,
      shape: values.shape,
      color: values.color,
      weightKg: Number(values.weightKg ?? 0),
      pileHeightMm: Number(values.pileHeightMm ?? 0),
      knotDensity: values.knotDensity,
      construction: values.construction,
      careInstructions: values.careInstructions,
      shippingInfo: values.shippingInfo,
      warranty: values.warranty,
      status: values.status,
      featured: !!values.featured,
      trending: !!values.trending,
      newArrival: !!values.newArrival,
      bestSeller: !!values.bestSeller,
      seoTitle: values.seoTitle,
      seoDescription: values.seoDescription,
      tags: values.tagsText
        ? values.tagsText.split(',').map((t) => t.trim()).filter(Boolean)
        : [],
      sizeVariations: values.sizeVariations.map((v) => ({
        size: v.size,
        sku: v.sku,
        price: Number(v.price),
        discountPercent: Number(v.discountPercent ?? 0),
        stock: Number(v.stock),
        weightKg: Number(v.weightKg ?? 0),
        isPrimary: !!v.isPrimary,
      })),
      newImageFiles: newFiles,
      removeImagePublicIds: removeIds,
    };

    try {
      if (editing) {
        await adminProductApi.update(editing.id, payload);
        toast.success('Product updated');
      } else {
        await adminProductApi.create(payload);
        toast.success('Product created');
      }
      await onSaved();
    } catch (e: unknown) {
      toast.error(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Could not save',
      );
    }
  }

  const visibleExisting = existingImages.filter((i) => !removeIds.includes(i.publicId));
  const totalImages = visibleExisting.length + newFiles.length;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit product' : 'Add product'}
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        {/* Images */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-midnight-900">
              Images ({totalImages}/7)
            </p>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mb-3">
            {visibleExisting.map((img) => (
              <div key={img.publicId} className="relative aspect-square rounded-lg overflow-hidden bg-ivory">
                <img src={img.url} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setRemoveIds((s) => [...s, img.publicId])}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-midnight-900/70 text-ivory inline-flex items-center justify-center"
                  aria-label="Remove"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            {newFiles.map((f, i) => (
              <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-ivory">
                <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setNewFiles((prev) => prev.filter((_, j) => j !== i))}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-midnight-900/70 text-ivory inline-flex items-center justify-center"
                  aria-label="Remove"
                >
                  <X size={12} />
                </button>
                <span className="absolute bottom-1 left-1 text-[9px] tracking-widest bg-emerald-500 text-ivory px-1.5 py-0.5 rounded-full">
                  NEW
                </span>
              </div>
            ))}
            {totalImages < 7 && (
              <label className="aspect-square rounded-lg border-2 border-dashed border-line flex items-center justify-center cursor-pointer hover:border-midnight-900/40 text-charcoal-400">
                <Upload size={16} />
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={(e) => addFiles(e.target.files)}
                />
              </label>
            )}
          </div>
          <p className="text-xs text-charcoal-400">
            Between 1 and 7 images per product. JPG, PNG, WEBP up to 8 MB each.
          </p>
        </section>

        {/* Core */}
        <section className="grid sm:grid-cols-2 gap-4">
          <Input
            label="Name"
            error={errors.name?.message}
            {...register('name', { required: 'Required', maxLength: 160 })}
          />
          <label className="block">
            <span className="block mb-1.5 text-sm font-medium text-charcoal-500">
              Category
            </span>
            <select
              {...register('categoryId', { required: true })}
              className="w-full rounded-xl border border-line bg-pearl px-3 py-3 outline-none focus:border-midnight-900"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="block mb-1.5 text-sm font-medium text-charcoal-500">
              Status
            </span>
            <select
              {...register('status')}
              className="w-full rounded-xl border border-line bg-pearl px-3 py-3 outline-none focus:border-midnight-900"
            >
              <option value="available">Available</option>
              <option value="hidden">Hidden</option>
              <option value="coming_soon">Coming soon</option>
              <option value="discontinued">Discontinued</option>
            </select>
          </label>
          <label className="block">
            <span className="block mb-1.5 text-sm font-medium text-charcoal-500">
              Shape
            </span>
            <select
              {...register('shape')}
              className="w-full rounded-xl border border-line bg-pearl px-3 py-3 outline-none focus:border-midnight-900"
            >
              <option>Rectangular</option>
              <option>Runner</option>
              <option>Round</option>
              <option>Square</option>
              <option>Oval</option>
            </select>
          </label>
          <Input label="Material" {...register('material')} />
          <Input label="Origin" {...register('origin')} />
          <Input label="Color" {...register('color')} />
          <Input label="Knot density" {...register('knotDensity')} />
          <Input label="Weight (kg)" type="number" step="0.1" {...register('weightKg')} />
          <Input label="Pile height (mm)" type="number" step="0.1" {...register('pileHeightMm')} />
          <Input label="Construction" {...register('construction')} />
          <Input label="Warranty" {...register('warranty')} />
        </section>

        <section>
          <label className="block">
            <span className="block mb-1.5 text-sm font-medium text-charcoal-500">
              Description
            </span>
            <textarea
              {...register('description', { maxLength: 8000 })}
              rows={3}
              className="w-full rounded-xl border border-line bg-pearl px-3 py-3 outline-none focus:border-midnight-900"
            />
          </label>
        </section>

        <section className="grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="block mb-1.5 text-sm font-medium text-charcoal-500">
              Care instructions
            </span>
            <textarea
              {...register('careInstructions', { maxLength: 3000 })}
              rows={3}
              className="w-full rounded-xl border border-line bg-pearl px-3 py-3 outline-none focus:border-midnight-900"
            />
          </label>
          <label className="block">
            <span className="block mb-1.5 text-sm font-medium text-charcoal-500">
              Shipping info
            </span>
            <textarea
              {...register('shippingInfo', { maxLength: 3000 })}
              rows={3}
              className="w-full rounded-xl border border-line bg-pearl px-3 py-3 outline-none focus:border-midnight-900"
            />
          </label>
        </section>

        {/* Size variations */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-midnight-900">
              Size variations ({fields.length})
            </p>
            <Button
              type="button"
              variant="ghost"
              className="!py-1.5 !text-xs"
              leftIcon={<Plus size={12} />}
              onClick={() =>
                append({
                  size: '',
                  price: 0,
                  discountPercent: 0,
                  stock: 0,
                  weightKg: 0,
                  isPrimary: fields.length === 0,
                })
              }
            >
              Add size
            </Button>
          </div>
          <div className="space-y-2">
            {fields.map((f, i) => (
              <div
                key={f.id}
                className="grid grid-cols-2 sm:grid-cols-[1fr_1fr_100px_100px_100px_44px_44px] gap-2 items-end p-3 rounded-xl bg-ivory border border-line"
              >
                <Input
                  label={i === 0 ? 'Size' : ''}
                  placeholder="5x7 ft"
                  {...register(`sizeVariations.${i}.size` as const, { required: true })}
                />
                <Input
                  label={i === 0 ? 'SKU' : ''}
                  placeholder="Optional"
                  {...register(`sizeVariations.${i}.sku` as const)}
                />
                <Input
                  label={i === 0 ? 'Price ₹' : ''}
                  type="number"
                  min={0}
                  {...register(`sizeVariations.${i}.price` as const, { valueAsNumber: true })}
                />
                <Input
                  label={i === 0 ? 'Discount %' : ''}
                  type="number"
                  min={0}
                  max={90}
                  {...register(`sizeVariations.${i}.discountPercent` as const, { valueAsNumber: true })}
                />
                <Input
                  label={i === 0 ? 'Stock' : ''}
                  type="number"
                  min={0}
                  {...register(`sizeVariations.${i}.stock` as const, { valueAsNumber: true })}
                />
                <button
                  type="button"
                  onClick={() => setPrimary(i)}
                  className={
                    'w-10 h-10 rounded-xl inline-flex items-center justify-center border transition-colors ' +
                    (primaryIndex === i
                      ? 'bg-gold-500 border-gold-600 text-midnight-900'
                      : 'border-line text-charcoal-400 hover:border-midnight-900')
                  }
                  aria-label="Make primary"
                  title="Make primary"
                >
                  <Star size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="w-10 h-10 rounded-xl inline-flex items-center justify-center border border-line text-red-500 hover:bg-red-50"
                  aria-label="Remove"
                  disabled={fields.length === 1}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="grid sm:grid-cols-4 gap-3">
          <Toggle label="Featured" name="featured" register={register} />
          <Toggle label="Trending" name="trending" register={register} />
          <Toggle label="New arrival" name="newArrival" register={register} />
          <Toggle label="Bestseller" name="bestSeller" register={register} />
        </section>

        <section className="grid sm:grid-cols-2 gap-4">
          <Input label="SEO title" {...register('seoTitle')} />
          <Input label="Tags (comma-separated)" {...register('tagsText')} />
          <div className="sm:col-span-2">
            <label className="block">
              <span className="block mb-1.5 text-sm font-medium text-charcoal-500">
                SEO description
              </span>
              <textarea
                {...register('seoDescription', { maxLength: 500 })}
                rows={2}
                className="w-full rounded-xl border border-line bg-pearl px-3 py-3 outline-none focus:border-midnight-900"
              />
            </label>
          </div>
        </section>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={isSubmitting}>
            {editing ? 'Save changes' : 'Create product'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function Toggle({
  label,
  name,
  register,
}: {
  label: string;
  name: 'featured' | 'trending' | 'newArrival' | 'bestSeller';
  register: ReturnType<typeof useForm<FormShape>>['register'];
}): JSX.Element {
  return (
    <label className="flex items-center gap-2 rounded-xl bg-ivory border border-line px-3 py-2.5 text-sm cursor-pointer">
      <input type="checkbox" {...register(name)} />
      {label}
    </label>
  );
}
