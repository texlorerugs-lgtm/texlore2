import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export interface Crumb {
  label: string;
  to?: string;
}

export function Breadcrumb({ items }: { items: Crumb[] }): JSX.Element {
  return (
    <nav aria-label="Breadcrumb" className="text-xs text-charcoal-400">
      <ol className="flex items-center gap-1 flex-wrap">
        <li>
          <Link
            to="/"
            className="inline-flex items-center gap-1 hover:text-midnight-900"
            aria-label="Home"
          >
            <Home size={12} />
          </Link>
        </li>
        {items.map((c, i) => (
          <li key={i} className="inline-flex items-center gap-1">
            <ChevronRight size={12} className="opacity-50" />
            {c.to && i < items.length - 1 ? (
              <Link to={c.to} className="hover:text-midnight-900">
                {c.label}
              </Link>
            ) : (
              <span className="text-midnight-900">{c.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
