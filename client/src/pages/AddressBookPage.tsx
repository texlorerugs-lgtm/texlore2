import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { MapPin, Plus, Star, Pencil, Trash2 } from 'lucide-react';
import { BackButton } from '@/components/BackButton';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { addressApi } from '@/services/address.service';
import type { Address, AddressInput } from '@/types/commerce';
import { useAppSelector } from '@/store';

type FormValues = AddressInput;

export default function AddressBookPage(): JSX.Element {
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Address | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true, state: { from: '/addresses' } });
      return;
    }
    (async () => {
      try {
        const { addresses: list } = await addressApi.list();
        setAddresses(list);
      } catch {
        toast.error('Could not load addresses.');
      } finally {
        setLoading(false);
      }
    })();
  }, [user, navigate]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: emptyAddress(),
  });

  function openCreate(): void {
    setEditing(null);
    reset(emptyAddress());
    setShowForm(true);
  }

  function openEdit(addr: Address): void {
    setEditing(addr);
    reset({
      label: addr.label,
      fullName: addr.fullName,
      phone: addr.phone,
      countryCode: addr.countryCode,
      line1: addr.line1,
      line2: addr.line2 ?? '',
      landmark: addr.landmark ?? '',
      city: addr.city,
      state: addr.state,
      country: addr.country,
      zip: addr.zip,
      isDefault: addr.isDefault,
    });
    setShowForm(true);
  }

  async function onSubmit(values: FormValues): Promise<void> {
    try {
      const result = editing
        ? await addressApi.update(editing.id, values)
        : await addressApi.create(values);
      setAddresses(result.addresses);
      setShowForm(false);
      toast.success(editing ? 'Address updated' : 'Address saved');
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Could not save address',
      );
    }
  }

  async function handleDelete(id: string): Promise<void> {
    if (!confirm('Delete this address?')) return;
    try {
      const { addresses: list } = await addressApi.remove(id);
      setAddresses(list);
      toast.success('Address removed');
    } catch {
      toast.error('Could not remove address');
    }
  }

  async function handleSetDefault(id: string): Promise<void> {
    try {
      const { addresses: list } = await addressApi.setDefault(id);
      setAddresses(list);
    } catch {
      toast.error('Could not update default');
    }
  }

  return (
    <main className="min-h-screen bg-ivory">
      <div className="container-lux py-10 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <BackButton />
          <h1 className="font-display text-3xl text-midnight-900">Saved Addresses</h1>
          <div className="w-16" aria-hidden />
        </div>

        <div className="flex justify-end mb-4">
          <Button variant="gold" leftIcon={<Plus size={16} />} onClick={openCreate}>
            Add new address
          </Button>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[0, 1].map((i) => (
              <div key={i} className="card p-5 space-y-3">
                <div className="skeleton h-4 w-1/3" />
                <div className="skeleton h-3 w-2/3" />
                <div className="skeleton h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : addresses.length === 0 && !showForm ? (
          <div className="card p-10 text-center">
            <MapPin className="mx-auto text-charcoal-400 mb-3" size={30} />
            <p className="text-charcoal-400 mb-4">No addresses saved yet.</p>
            <Button variant="primary" onClick={openCreate}>
              Add your first address
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {addresses.map((a) => (
              <article key={a.id} className="card p-5">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase tracking-wider text-charcoal-400 px-2 py-0.5 rounded-full bg-ivory border border-line">
                      {a.label}
                    </span>
                    {a.isDefault && (
                      <span className="inline-flex items-center gap-1 text-xs text-gold-700">
                        <Star size={12} /> Default
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(a)}
                      className="p-1.5 text-charcoal-400 hover:text-midnight-900"
                      aria-label="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(a.id)}
                      className="p-1.5 text-charcoal-400 hover:text-red-500"
                      aria-label="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <p className="font-medium text-midnight-900">{a.fullName}</p>
                <p className="text-sm text-charcoal-400 mt-1">
                  {a.line1}
                  {a.line2 ? `, ${a.line2}` : ''}
                  {a.landmark ? ` (${a.landmark})` : ''}
                </p>
                <p className="text-sm text-charcoal-400">
                  {a.city}, {a.state} {a.zip}
                </p>
                <p className="text-sm text-charcoal-400">{a.country}</p>
                <p className="text-sm text-charcoal-500 mt-2">
                  {a.countryCode} {a.phone}
                </p>
                {!a.isDefault && (
                  <button
                    onClick={() => handleSetDefault(a.id)}
                    className="mt-3 text-xs text-midnight-900 hover:text-gold-600 font-medium"
                  >
                    Set as default
                  </button>
                )}
              </article>
            ))}
          </div>
        )}

        {showForm && (
          <div className="card p-6 mt-6">
            <h2 className="font-display text-2xl text-midnight-900 mb-4">
              {editing ? 'Edit address' : 'Add address'}
            </h2>
            <form onSubmit={handleSubmit(onSubmit)} className="grid sm:grid-cols-2 gap-4" noValidate>
              <Input
                label="Label"
                placeholder="Home / Office / Other"
                {...register('label', { maxLength: 40 })}
              />
              <Input
                label="Full name"
                error={errors.fullName?.message}
                {...register('fullName', { required: 'Required' })}
              />
              <div className="grid grid-cols-[100px_1fr] gap-2">
                <Input label="Code" placeholder="+91" {...register('countryCode')} />
                <Input
                  label="Phone"
                  error={errors.phone?.message}
                  {...register('phone', {
                    required: 'Required',
                    pattern: { value: /^\d{6,15}$/, message: '6–15 digits' },
                  })}
                />
              </div>
              <Input
                label="ZIP / postal code"
                error={errors.zip?.message}
                {...register('zip', { required: 'Required' })}
              />
              <div className="sm:col-span-2">
                <Input
                  label="Address line 1"
                  error={errors.line1?.message}
                  {...register('line1', { required: 'Required' })}
                />
              </div>
              <div className="sm:col-span-2">
                <Input label="Address line 2 (optional)" {...register('line2')} />
              </div>
              <Input label="Landmark (optional)" {...register('landmark')} />
              <Input label="City" error={errors.city?.message} {...register('city', { required: 'Required' })} />
              <Input label="State" error={errors.state?.message} {...register('state', { required: 'Required' })} />
              <Input label="Country" {...register('country')} />
              <div className="sm:col-span-2 flex items-center gap-2">
                <input type="checkbox" id="isDefault" {...register('isDefault')} />
                <label htmlFor="isDefault" className="text-sm text-charcoal-500">
                  Make this the default address
                </label>
              </div>
              <div className="sm:col-span-2 flex justify-end gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" loading={isSubmitting}>
                  {editing ? 'Save changes' : 'Save address'}
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}

function emptyAddress(): AddressInput {
  return {
    label: 'Home',
    fullName: '',
    phone: '',
    countryCode: '+91',
    line1: '',
    line2: '',
    landmark: '',
    city: '',
    state: '',
    country: 'India',
    zip: '',
    isDefault: false,
  };
}
