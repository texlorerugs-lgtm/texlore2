import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface Props {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** When true, use midnight background (used for Admin login). */
  darkTheme?: boolean;
}

/**
 * Two-panel auth layout: luxury brand panel on the left, form on the right.
 * Collapses to single column on mobile. Ships from Milestone 2.
 */
export function AuthShell({ title, subtitle, children, footer, darkTheme }: Props): JSX.Element {
  return (
    <div className="min-h-screen bg-ivory grid lg:grid-cols-2">
      <aside
        className={
          'relative overflow-hidden hidden lg:flex flex-col justify-between p-12 text-ivory ' +
          (darkTheme
            ? 'bg-gradient-to-br from-charcoal-700 via-midnight-900 to-charcoal-700'
            : 'bg-midnight-gradient')
        }
      >
        <div
          className="absolute inset-0 opacity-25 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, rgba(212,175,55,0.28), transparent 45%), radial-gradient(circle at 80% 70%, rgba(31,122,77,0.28), transparent 45%)',
          }}
        />
        <Link
          to="/"
          className="relative z-10 font-display text-4xl text-gold-500 tracking-wide"
        >
          Texlore
        </Link>
        <div className="relative z-10 max-w-md">
          <h2 className="font-display text-4xl text-ivory leading-tight mb-4">
            Handwoven luxury,
            <br />
            delivered to your door.
          </h2>
          <p className="text-ivory/70">
            Persian classics, contemporary minimalism, custom weaves — sourced
            from master ateliers and shipped worldwide.
          </p>
        </div>
        <p className="relative z-10 text-xs text-ivory/50 tracking-widest">
          © {new Date().getFullYear()} TEXLORE — ALL RIGHTS RESERVED
        </p>
      </aside>

      <main className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md animate-fade-in-up">
          <Link to="/" className="lg:hidden inline-block mb-8 font-display text-3xl text-midnight-900">
            Texlore
          </Link>
          <h1 className="font-display text-3xl sm:text-4xl text-midnight-900 mb-2">{title}</h1>
          {subtitle && <p className="text-charcoal-400 mb-8">{subtitle}</p>}
          {children}
          {footer && <div className="mt-6 text-sm text-charcoal-400 text-center">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
