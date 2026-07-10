import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  ShoppingBag,
  User as UserIcon,
  Menu,
  X,
  Package,
  MapPin,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import { Logo } from './Logo';
import { useAppDispatch, useAppSelector } from '@/store';
import { clearUser } from '@/store/auth.slice';
import { clearCartState } from '@/store/cart.slice';
import { authApi } from '@/services/auth.service';
import { useCart } from '@/hooks/useCart';
import { useCurrency, type Currency } from '@/context/CurrencyContext';
import toast from 'react-hot-toast';

const NAV = [
  { to: '/', label: 'Home' },
  { to: '/shop', label: 'Shop' },
  { to: '/about', label: 'About Us' },
] as const;

/**
 * Sticky header.
 *  - Transparent + light text over the hero (route === '/', not scrolled)
 *  - Solid ivory + dark text as soon as the user scrolls
 *  - Same solid variant on every non-home route
 *
 * Contains: logo, main nav, search icon, currency selector, cart badge,
 * user dropdown (or Join Us when unauthed). Mobile: full drawer.
 */
export function Header(): JSX.Element {
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const { itemCount } = useCart();
  const { currency, setCurrency } = useCurrency();
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const isHome = location.pathname === '/';
  const overHero = isHome && !scrolled;

  useEffect(() => {
    const onScroll = (): void => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setDrawerOpen(false), [location.pathname]);

  useEffect(() => {
    function onDoc(e: MouseEvent): void {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  async function handleLogout(): Promise<void> {
    try {
      await authApi.logout();
    } catch {
      /* ignore */
    }
    dispatch(clearUser());
    dispatch(clearCartState());
    setDropdownOpen(false);
    toast.success('Signed out');
    navigate('/', { replace: true });
  }

  const headerClass = overHero
    ? 'bg-transparent text-ivory'
    : 'bg-ivory/85 backdrop-blur-md border-b border-line/60 text-midnight-900';

  const linkBase = 'text-sm tracking-wide transition-colors';
  const linkColor = overHero
    ? 'text-ivory/85 hover:text-gold-500'
    : 'text-charcoal-500 hover:text-midnight-900';

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${headerClass}`}
    >
      <div className="container-lux flex items-center justify-between h-16 sm:h-20">
        {/* Left: mobile menu + logo */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="lg:hidden inline-flex items-center justify-center w-9 h-9 rounded-full hover:bg-white/10"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <Logo variant={overHero ? 'light' : 'dark'} size="md" />
        </div>

        {/* Center: nav */}
        <nav className="hidden lg:flex items-center gap-8">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `${linkBase} ${linkColor} ${isActive ? 'text-gold-500' : ''}`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>

        {/* Right: actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => navigate('/shop')}
            aria-label="Search"
            className={`inline-flex items-center justify-center w-9 h-9 rounded-full transition-colors ${
              overHero ? 'hover:bg-white/10' : 'hover:bg-midnight-900/5'
            }`}
          >
            <Search size={18} />
          </button>
          <CurrencySelector
            value={currency}
            onChange={setCurrency}
            variant={overHero ? 'light' : 'dark'}
          />
          <Link
            to={user ? '/cart' : '/login'}
            state={user ? undefined : { from: '/cart' }}
            className={`relative inline-flex items-center justify-center w-9 h-9 rounded-full transition-colors ${
              overHero ? 'hover:bg-white/10' : 'hover:bg-midnight-900/5'
            }`}
            aria-label="Cart"
          >
            <ShoppingBag size={18} />
            {itemCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-gold-500 text-midnight-900 text-[10px] font-semibold inline-flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </Link>

          {user ? (
            <div ref={dropdownRef} className="relative">
              <button
                onClick={() => setDropdownOpen((v) => !v)}
                className={`inline-flex items-center gap-2 rounded-full pl-1 pr-3 py-1 transition-colors ${
                  overHero ? 'hover:bg-white/10' : 'hover:bg-midnight-900/5'
                }`}
              >
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gold-gradient text-midnight-900 font-semibold text-sm">
                  {user.name?.[0]?.toUpperCase() ?? 'U'}
                </span>
                <span className="hidden md:inline text-sm">
                  {user.name?.split(' ')[0] ?? 'Account'}
                </span>
                <ChevronDown size={14} className="hidden md:inline opacity-70" />
              </button>
              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.98 }}
                    transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute right-0 mt-2 w-64 rounded-2xl bg-pearl shadow-luxury border border-line/60 overflow-hidden"
                  >
                    <div className="px-4 py-3 border-b border-line/60">
                      <p className="font-medium text-midnight-900 truncate">
                        {user.name}
                      </p>
                      <p className="text-xs text-charcoal-400 truncate">{user.email}</p>
                    </div>
                    <DropdownLink to="/profile" icon={<UserIcon size={16} />}>
                      Profile
                    </DropdownLink>
                    <DropdownLink to="/orders" icon={<Package size={16} />}>
                      My orders
                    </DropdownLink>
                    <DropdownLink to="/cart" icon={<ShoppingBag size={16} />}>
                      My cart
                    </DropdownLink>
                    <DropdownLink to="/addresses" icon={<MapPin size={16} />}>
                      Saved addresses
                    </DropdownLink>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50/60"
                    >
                      <LogOut size={16} /> Logout
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <Link
              to="/signup"
              className={`hidden sm:inline-flex items-center rounded-full px-4 py-2 text-sm font-medium transition-all ${
                overHero
                  ? 'bg-ivory text-midnight-900 hover:bg-gold-500'
                  : 'bg-midnight-900 text-ivory hover:bg-midnight-800'
              }`}
            >
              Join Us
            </Link>
          )}
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-midnight-900/40 z-40"
              onClick={() => setDrawerOpen(false)}
            />
            <motion.aside
              key="drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="lg:hidden fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] bg-ivory text-charcoal-500 shadow-luxury"
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-line/60">
                <Logo />
                <button
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close menu"
                  className="w-9 h-9 rounded-full inline-flex items-center justify-center hover:bg-midnight-900/5"
                >
                  <X size={20} />
                </button>
              </div>
              <nav className="p-6 space-y-1">
                {NAV.map((n) => (
                  <Link
                    key={n.to}
                    to={n.to}
                    className="block rounded-xl px-4 py-3 text-lg font-display text-midnight-900 hover:bg-midnight-900/5"
                  >
                    {n.label}
                  </Link>
                ))}
                <div className="h-px bg-line my-3" />
                {user ? (
                  <>
                    <Link
                      to="/profile"
                      className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm hover:bg-midnight-900/5"
                    >
                      <UserIcon size={16} /> Profile
                    </Link>
                    <Link
                      to="/orders"
                      className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm hover:bg-midnight-900/5"
                    >
                      <Package size={16} /> My orders
                    </Link>
                    <Link
                      to="/addresses"
                      className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm hover:bg-midnight-900/5"
                    >
                      <MapPin size={16} /> Saved addresses
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm text-red-600 hover:bg-red-50/60"
                    >
                      <LogOut size={16} /> Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/login" className="btn-ghost w-full justify-center">
                      Sign in
                    </Link>
                    <Link to="/signup" className="btn-primary w-full justify-center mt-2">
                      Create account
                    </Link>
                  </>
                )}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}

function DropdownLink({
  to,
  icon,
  children,
}: {
  to: string;
  icon: ReactNodeIcon;
  children: string;
}): JSX.Element {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 px-4 py-2.5 text-sm text-charcoal-500 hover:bg-midnight-900/5"
    >
      {icon}
      {children}
    </Link>
  );
}

type ReactNodeIcon = React.ReactNode;

function CurrencySelector({
  value,
  onChange,
  variant,
}: {
  value: Currency;
  onChange: (c: Currency) => void;
  variant: 'light' | 'dark';
}): JSX.Element {
  const supported = (import.meta.env.VITE_SUPPORTED_CURRENCIES ?? 'INR,USD')
    .split(',')
    .map((s: string) => s.trim().toUpperCase()) as Currency[];
  if (supported.length <= 1) return <></>;
  return (
    <div
      className={`hidden md:inline-flex items-center gap-0.5 rounded-full p-0.5 text-xs ${
        variant === 'light' ? 'bg-white/10' : 'bg-midnight-900/5'
      }`}
    >
      {supported.map((c) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className={`px-2.5 py-1 rounded-full transition-colors ${
            c === value
              ? variant === 'light'
                ? 'bg-ivory text-midnight-900'
                : 'bg-midnight-900 text-ivory'
              : ''
          }`}
        >
          {c}
        </button>
      ))}
    </div>
  );
}
