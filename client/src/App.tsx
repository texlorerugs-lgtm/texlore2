import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { persistor, store, useAppDispatch, useAppSelector } from '@/store';
import { authApi } from '@/services/auth.service';
import { adminAuthApi } from '@/services/admin-auth.service';
import { clearAdmin, clearUser, setAdmin, setUser } from '@/store/auth.slice';
import { cartApi } from '@/services/cart.service';
import { setSnapshot as setCartSnapshot, clearCartState } from '@/store/cart.slice';
import { CurrencyProvider } from '@/context/CurrencyContext';

// Layout
import PublicLayout from '@/layouts/PublicLayout';

// Public
const HomePage = lazy(() => import('@/pages/HomePage'));
const CategoryPage = lazy(() => import('@/pages/CategoryPage'));
const ProductDetailPage = lazy(() => import('@/pages/ProductDetailPage'));
const AboutPage = lazy(() => import('@/pages/AboutPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

// Auth
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const SignupPage = lazy(() => import('@/pages/auth/SignupPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'));

// User account
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const CartPage = lazy(() => import('@/pages/CartPage'));
const AddressBookPage = lazy(() => import('@/pages/AddressBookPage'));
const CheckoutPage = lazy(() => import('@/pages/CheckoutPage'));
const OrderSuccessPage = lazy(() => import('@/pages/OrderSuccessPage'));
const MyOrdersPage = lazy(() => import('@/pages/MyOrdersPage'));
const OrderDetailPage = lazy(() => import('@/pages/OrderDetailPage'));

// Admin
const AdminLoginPage = lazy(() => import('@/pages/admin/AdminLoginPage'));
const AdminLayout = lazy(() => import('@/layouts/AdminLayout'));
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage'));
const AdminCategoriesPage = lazy(() => import('@/pages/admin/AdminCategoriesPage'));
const AdminProductsPage = lazy(() => import('@/pages/admin/AdminProductsPage'));
const AdminOrdersPage = lazy(() => import('@/pages/admin/AdminOrdersPage'));
const AdminOrderDetailPage = lazy(() => import('@/pages/admin/AdminOrderDetailPage'));
const AdminCouponsPage = lazy(() => import('@/pages/admin/AdminCouponsPage'));
const AdminCustomersPage = lazy(() => import('@/pages/admin/AdminCustomersPage'));
const AdminMessagesPage = lazy(() => import('@/pages/admin/AdminMessagesPage'));
const AdminAnalyticsPage = lazy(() => import('@/pages/admin/AdminAnalyticsPage'));
const AdminSettingsPage = lazy(() => import('@/pages/admin/AdminSettingsPage'));
const AdminProfilePage = lazy(() => import('@/pages/admin/AdminProfilePage'));

/**
 * On mount, if we previously had a session we try a silent refresh so the user
 * (and admin) stays logged in across reloads. Failure is silent.
 */
function BootAuth(): null {
  const dispatch = useAppDispatch();
  const hasUserSession = useAppSelector((s) => s.auth.hasUserSession);
  const hasAdminSession = useAppSelector((s) => s.auth.hasAdminSession);

  useEffect(() => {
    if (hasUserSession) {
      (async () => {
        try {
          const { accessToken } = await authApi.refresh();
          const { user } = await authApi.me();
          dispatch(setUser({ user, accessToken }));
          try {
            const { cart } = await cartApi.get();
            dispatch(setCartSnapshot(cart));
          } catch {
            /* ignore */
          }
        } catch {
          dispatch(clearUser());
          dispatch(clearCartState());
        }
      })();
    }
    if (hasAdminSession) {
      (async () => {
        try {
          const { accessToken } = await adminAuthApi.refresh();
          const { admin } = await adminAuthApi.me();
          dispatch(setAdmin({ admin, accessToken }));
        } catch {
          dispatch(clearAdmin());
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

function RequireAdmin({ children }: { children: JSX.Element }): JSX.Element {
  const admin = useAppSelector((s) => s.auth.admin);
  const location = useLocation();
  if (!admin) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}

function PageFallback(): JSX.Element {
  return (
    <div className="min-h-screen flex items-center justify-center bg-ivory">
      <div className="animate-pulse text-charcoal-400 tracking-widest text-sm">
        LOADING…
      </div>
    </div>
  );
}

function Router(): JSX.Element {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        {/* Public storefront */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/shop" element={<CategoryPage />} />
          <Route path="/category/:slug" element={<CategoryPage />} />
          <Route path="/product/:slug" element={<ProductDetailPage />} />
          <Route path="/about" element={<AboutPage />} />

          {/* User account (still inside the public layout so header/footer show) */}
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/addresses" element={<AddressBookPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/order-success/:orderNumber" element={<OrderSuccessPage />} />
          <Route path="/orders" element={<MyOrdersPage />} />
          <Route path="/orders/:orderNumber" element={<OrderDetailPage />} />

          <Route path="*" element={<NotFoundPage />} />
        </Route>

        {/* Auth pages have their own two-panel layout, so they live OUTSIDE PublicLayout */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Admin */}
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route
          element={
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          }
        >
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
          <Route path="/admin/categories" element={<AdminCategoriesPage />} />
          <Route path="/admin/products" element={<AdminProductsPage />} />
          <Route path="/admin/orders" element={<AdminOrdersPage />} />
          <Route path="/admin/orders/:id" element={<AdminOrderDetailPage />} />
          <Route path="/admin/coupons" element={<AdminCouponsPage />} />
          <Route path="/admin/customers" element={<AdminCustomersPage />} />
          <Route path="/admin/messages" element={<AdminMessagesPage />} />
          <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
          <Route path="/admin/settings" element={<AdminSettingsPage />} />
          <Route path="/admin/profile" element={<AdminProfilePage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default function App(): JSX.Element {
  return (
    <Provider store={store}>
      <PersistGate loading={<PageFallback />} persistor={persistor}>
        <CurrencyProvider>
          <BootAuth />
          <Router />
        </CurrencyProvider>
      </PersistGate>
    </Provider>
  );
}
