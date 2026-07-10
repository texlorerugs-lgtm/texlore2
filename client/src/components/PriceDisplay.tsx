import { useCurrency } from '@/context/CurrencyContext';

interface Props {
  /** Base INR amount. */
  amount: number;
  /** Optional original amount (before discount) — shown struck-through. */
  original?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Currency-aware price. Handles the strikethrough for discounts and pads
 * a small label with the discount percentage when relevant.
 */
export function PriceDisplay({
  amount,
  original,
  size = 'md',
  className = '',
}: Props): JSX.Element {
  const { format } = useCurrency();
  const showDiscount = original != null && original > amount;
  const pct = showDiscount
    ? Math.round(((original - amount) / original) * 100)
    : 0;

  const sizes = {
    sm: { main: 'text-sm', old: 'text-xs' },
    md: { main: 'text-base', old: 'text-xs' },
    lg: { main: 'text-2xl', old: 'text-sm' },
  } as const;

  return (
    <div className={`inline-flex items-baseline gap-2 ${className}`}>
      <span className={`font-semibold text-midnight-900 ${sizes[size].main}`}>
        {format(amount)}
      </span>
      {showDiscount && (
        <>
          <span className={`text-charcoal-400 line-through ${sizes[size].old}`}>
            {format(original)}
          </span>
          <span
            className={`text-emerald-600 font-medium ${sizes[size].old}`}
          >
            −{pct}%
          </span>
        </>
      )}
    </div>
  );
}
