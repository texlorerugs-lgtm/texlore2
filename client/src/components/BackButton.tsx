import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

/**
 * Consistent back button used on every internal page (per Part 1 rule).
 * Falls back to Home when there is no history.
 */
export function BackButton({
  label = 'Back',
  fallback = '/',
}: {
  label?: string;
  fallback?: string;
}): JSX.Element {
  const navigate = useNavigate();
  function handleClick(): void {
    if (window.history.length > 1) navigate(-1);
    else navigate(fallback, { replace: true });
  }
  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center gap-2 text-sm text-charcoal-400 hover:text-midnight-900 transition-colors"
    >
      <ArrowLeft size={16} />
      {label}
    </button>
  );
}
