import type { ReactNode } from 'react';

interface Props {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
  accent?: 'gold' | 'emerald' | 'red' | 'midnight';
}

const ACCENTS: Record<NonNullable<Props['accent']>, string> = {
  gold: 'bg-gold-gradient text-midnight-900',
  emerald: 'bg-emerald-500/15 text-emerald-700',
  red: 'bg-red-500/10 text-red-600',
  midnight: 'bg-midnight-900/10 text-midnight-900',
};

export function StatCard({
  label,
  value,
  hint,
  icon,
  accent = 'midnight',
}: Props): JSX.Element {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs uppercase tracking-widest text-charcoal-400">{label}</p>
        {icon && (
          <span
            className={`w-9 h-9 rounded-full inline-flex items-center justify-center ${ACCENTS[accent]}`}
          >
            {icon}
          </span>
        )}
      </div>
      <p className="font-display text-3xl text-midnight-900">{value}</p>
      {hint && <p className="text-xs text-charcoal-400 mt-1">{hint}</p>}
    </div>
  );
}
