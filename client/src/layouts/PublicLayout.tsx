import { Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

/**
 * Public layout wrapping every non-admin storefront page.
 * On route change:
 *   - scroll to top (unless the URL has a hash — allow anchor scrolling)
 *   - the sticky header handles its own transparent/solid state
 */
export default function PublicLayout(): JSX.Element {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) return; // let the browser handle #contact etc.
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname, hash]);

  const isHome = pathname === '/';
  return (
    <div className="min-h-screen flex flex-col bg-ivory">
      <Header />
      {/* Home hero renders under the transparent header; other pages need padding */}
      <div className={isHome ? '' : 'pt-16 sm:pt-20'}>
        <Outlet />
      </div>
      <Footer />
    </div>
  );
}
