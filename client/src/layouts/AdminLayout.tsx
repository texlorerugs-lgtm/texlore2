import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  LayoutDashboard,
  FolderTree,
  Package,
  ShoppingCart,
  Megaphone,
  Users,
  MessageSquare,
  BarChart3,
  Settings,
  User as UserIcon,
  LogOut,
  Menu,
  X,
  ExternalLink,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store';
import { clearAdmin } from '@/store/auth.slice';
import { adminAuthApi } from '@/services/admin-auth.service';
import { Logo } from '@/components/Logo';

const NAV = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/categories', label: 'Categories', icon: FolderTree },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { to: '/admin/coupons', label: 'Coupons', icon: Megaphone },
  { to: '/admin/customers', label: 'Customers', icon: Users },
  { to: '/admin/messages', label: 'Messages', icon: MessageSquare },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
] as const;

/**
 * Persistent sidebar admin layout. Collapsible drawer on mobile.
 * Guards its child routes: unauthenticated admins are redirected in
 * App.tsx via the RequireAdmin wrapper.
 */
export default function AdminLayout(): JSX.Element {
  const admin = useAppSelector((s) => s.auth.admin);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => setDrawerOpen(false), [location.pathname]);

  async function handleLogout(): Promise<void> {
    try {
      await adminAuthApi.logout();
    } catch {
      /* ignore */
    }
    dispatch(clearAdmin());
    toast.success('Signed out');
    navigate('/admin/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-ivory text-charcoal-500">
      {/* Sidebar (desktop) */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col bg-midnight-900 text-ivory">
        <SidebarInner admin={admin} onLogout={handleLogout} />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              key="bd"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-midnight-900/40 z-40"
              onClick={() => setDrawerOpen(false)}
            />
            <motion.aside
              key="dr"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="lg:hidden fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-midnight-900 text-ivory z-50"
            >
              <SidebarInner admin={admin} onLogout={handleLogout} onClose={() => setDrawerOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 bg-pearl/85 backdrop-blur border-b border-line/60">
          <div className="flex items-center justify-between px-4 sm:px-6 h-16">
            <button
              className="lg:hidden inline-flex items-center justify-center w-9 h-9 rounded-full hover:bg-midnight-900/5"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <div className="hidden lg:flex items-center gap-2 text-sm text-charcoal-400">
              <span>Admin Console</span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 text-xs text-charcoal-400 hover:text-midnight-900"
              >
                <ExternalLink size={12} /> View storefront
              </Link>
              <div className="flex items-center gap-2">
                <span className="w-9 h-9 rounded-full bg-gold-gradient text-midnight-900 inline-flex items-center justify-center text-sm font-semibold">
                  {admin?.name?.[0]?.toUpperCase() ?? 'A'}
                </span>
                <div className="hidden sm:block text-right">
                  <div className="text-sm font-medium text-midnight-900 leading-tight">
                    {admin?.name}
                  </div>
                  <div className="text-xs text-charcoal-400 leading-tight">
                    {admin?.email}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function SidebarInner({
  admin,
  onLogout,
  onClose,
}: {
  admin: { name?: string; email?: string } | null;
  onLogout: () => void;
  onClose?: () => void;
}): JSX.Element {
  return (
    <>
      <div className="flex items-center justify-between px-6 h-16 border-b border-ivory/10">
        <Link to="/ayan-khan/dashboard" className="flex items-center gap-2">
          <Logo variant="light" />
          <span className="text-[10px] tracking-widest text-gold-500 mt-1">ADMIN</span>
        </Link>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full inline-flex items-center justify-center hover:bg-ivory/10"
          >
            <X size={18} />
          </button>
        )}
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            className={({ isActive }) =>
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ' +
              (isActive
                ? 'bg-ivory/10 text-gold-500'
                : 'text-ivory/75 hover:bg-ivory/5 hover:text-ivory')
            }
          >
            <n.icon size={16} />
            {n.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-ivory/10 p-3">
        <NavLink
          to="/ayan-khan/profile"
          className={({ isActive }) =>
            'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ' +
            (isActive
              ? 'bg-ivory/10 text-gold-500'
              : 'text-ivory/75 hover:bg-ivory/5 hover:text-ivory')
          }
        >
          <UserIcon size={16} />
          Profile
        </NavLink>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-300 hover:bg-red-500/10"
        >
          <LogOut size={16} />
          Logout
        </button>
        <div className="mt-3 px-3 text-[11px] text-ivory/50 truncate">
          {admin?.name ? admin.email : ''}
        </div>
      </div>
    </>
  );
}
