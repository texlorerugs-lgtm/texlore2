import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User as UserIcon, Package, MapPin, LogOut, ShieldCheck } from 'lucide-react';
import { BackButton } from '@/components/BackButton';
import { useAppDispatch, useAppSelector } from '@/store';
import { clearUser } from '@/store/auth.slice';
import { clearCartState } from '@/store/cart.slice';
import { authApi } from '@/services/auth.service';
import toast from 'react-hot-toast';

/**
 * Simple profile page. Edit forms (name/phone/photo/password) can be added
 * once we introduce the user-settings endpoints in a later maintenance
 * milestone. This page already exposes navigation to Orders / Addresses /
 * Cart plus session controls per spec.
 */
export default function ProfilePage(): JSX.Element {
  const user = useAppSelector((s) => s.auth.user);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) navigate('/login', { replace: true, state: { from: '/profile' } });
  }, [user, navigate]);

  if (!user) return <></>;

  async function handleLogout(): Promise<void> {
    try {
      await authApi.logout();
    } catch {
      /* ignore */
    }
    dispatch(clearUser());
    dispatch(clearCartState());
    toast.success('Signed out');
    navigate('/', { replace: true });
  }

  const joined = new Date(user.createdAt).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
  });

  return (
    <main className="min-h-screen bg-ivory">
      <div className="container-lux py-10 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <BackButton />
          <h1 className="font-display text-3xl text-midnight-900">Profile</h1>
          <div className="w-16" aria-hidden />
        </div>

        <section className="card p-8 flex flex-col sm:flex-row items-start gap-6">
          <div className="w-20 h-20 rounded-full bg-gold-gradient text-midnight-900 inline-flex items-center justify-center text-3xl font-display font-semibold shrink-0">
            {user.name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display text-2xl text-midnight-900">{user.name}</p>
            <p className="text-sm text-charcoal-400">{user.email}</p>
            <p className="text-sm text-charcoal-400">
              {user.countryCode} {user.phone}
            </p>
            <p className="text-xs text-charcoal-400 mt-2">
              Member since {joined}
              {user.isVerified && (
                <span className="inline-flex items-center gap-1 ml-2 text-emerald-600">
                  <ShieldCheck size={12} /> Verified
                </span>
              )}
            </p>
          </div>
        </section>

        <div className="grid sm:grid-cols-3 gap-4 mt-6">
          <ProfileLink
            to="/orders"
            icon={<Package size={18} />}
            title="Orders"
            subtitle="Track and manage"
          />
          <ProfileLink
            to="/addresses"
            icon={<MapPin size={18} />}
            title="Addresses"
            subtitle="Delivery locations"
          />
          <ProfileLink
            to="/cart"
            icon={<UserIcon size={18} />}
            title="Cart"
            subtitle="Continue shopping"
          />
        </div>

        <div className="card p-6 mt-6">
          <h2 className="font-display text-xl text-midnight-900 mb-4">Account</h2>
          <div className="flex flex-wrap gap-3">
            <Link to="/forgot-password" className="btn-ghost">
              Change password
            </Link>
            <button onClick={handleLogout} className="btn-ghost !text-red-600 !border-red-200 hover:!bg-red-50">
              <LogOut size={14} /> Logout
            </button>
          </div>
          <p className="mt-4 text-xs text-charcoal-400">
            Need to delete your account? Email us at{' '}
            <a href="mailto:texlorerugs@gmail.com" className="text-midnight-900 underline">
              texlorerugs@gmail.com
            </a>{' '}
            and we\u2019ll handle it within 48 hours.
          </p>
        </div>
      </div>
    </main>
  );
}

function ProfileLink({
  to,
  icon,
  title,
  subtitle,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}): JSX.Element {
  return (
    <Link
      to={to}
      className="card p-5 flex items-center gap-4 hover:-translate-y-0.5 hover:shadow-luxury transition-all"
    >
      <span className="w-10 h-10 rounded-full bg-midnight-900/5 text-midnight-900 inline-flex items-center justify-center">
        {icon}
      </span>
      <div>
        <p className="font-medium text-midnight-900">{title}</p>
        <p className="text-xs text-charcoal-400">{subtitle}</p>
      </div>
    </Link>
  );
}
