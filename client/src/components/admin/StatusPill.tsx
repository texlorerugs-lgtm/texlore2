interface Props {
  status: string;
  variant?: 'order' | 'contact' | 'coupon' | 'customer' | 'product';
}

const STYLES: Record<string, string> = {
  // orders
  pending: 'bg-amber-500/10 text-amber-700',
  confirmed: 'bg-emerald-500/10 text-emerald-700',
  preparing: 'bg-emerald-500/10 text-emerald-700',
  packed: 'bg-emerald-500/10 text-emerald-700',
  shipped: 'bg-midnight-900/10 text-midnight-900',
  out_for_delivery: 'bg-midnight-900/10 text-midnight-900',
  delivered: 'bg-emerald-500/15 text-emerald-800',
  cancelled: 'bg-red-500/10 text-red-700',
  returned: 'bg-red-500/10 text-red-700',
  refunded: 'bg-red-500/10 text-red-700',
  // contact
  new: 'bg-amber-500/10 text-amber-700',
  read: 'bg-midnight-900/10 text-midnight-900',
  replied: 'bg-emerald-500/10 text-emerald-700',
  resolved: 'bg-emerald-500/15 text-emerald-800',
  archived: 'bg-charcoal-400/10 text-charcoal-500',
  // product
  available: 'bg-emerald-500/10 text-emerald-700',
  out_of_stock: 'bg-red-500/10 text-red-700',
  hidden: 'bg-charcoal-400/10 text-charcoal-500',
  coming_soon: 'bg-amber-500/10 text-amber-700',
  discontinued: 'bg-red-500/10 text-red-700',
  // categories
  active: 'bg-emerald-500/10 text-emerald-700',
  // customer / generic
  blocked: 'bg-red-500/10 text-red-700',
  verified: 'bg-emerald-500/10 text-emerald-700',
  unverified: 'bg-amber-500/10 text-amber-700',
};

export function StatusPill({ status, variant }: Props): JSX.Element {
  void variant;
  const cls = STYLES[status] ?? 'bg-charcoal-400/10 text-charcoal-500';
  return (
    <span
      className={
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-widest ' +
        cls
      }
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}
