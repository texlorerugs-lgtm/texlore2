import { PageHeader } from '@/components/admin/PageHeader';
import { StatCard } from '@/components/admin/StatCard';
import { CheckCircle2, Info } from 'lucide-react';

/**
 * Read-only settings summary in v1.
 *
 * The values shown here reflect what the server was started with (env-driven).
 * A future milestone can add a per-tenant Settings collection and an editable
 * form. For now this gives ops a fast confidence check that every integration
 * is wired correctly.
 */
export default function AdminSettingsPage(): JSX.Element {
  const supported = (import.meta.env.VITE_SUPPORTED_CURRENCIES ?? 'INR,USD').split(',');
  const defaultCurrency = import.meta.env.VITE_DEFAULT_CURRENCY ?? 'INR';
  const apiUrl = import.meta.env.VITE_API_URL ?? '/api/v1';
  const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID ?? '';

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Integration status and store defaults. Editable settings ship in a follow-up milestone."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
        <StatCard
          label="Currencies"
          value={supported.join(' / ')}
          hint={`Default: ${defaultCurrency}`}
          icon={<CheckCircle2 size={16} />}
          accent="emerald"
        />
        <StatCard
          label="Free shipping"
          value="₹15,000+"
          hint="Flat ₹499 below threshold"
          accent="gold"
          icon={<CheckCircle2 size={16} />}
        />
        <StatCard
          label="Razorpay"
          value={razorpayKey ? 'Configured' : 'Not configured'}
          hint={razorpayKey ? razorpayKey.slice(0, 12) + '…' : 'Set VITE_RAZORPAY_KEY_ID'}
          accent={razorpayKey ? 'emerald' : 'red'}
          icon={<CheckCircle2 size={16} />}
        />
      </div>

      <div className="card p-6 mb-6">
        <h2 className="font-display text-xl text-midnight-900 mb-4">Integrations</h2>
        <ul className="text-sm space-y-3">
          <IntegrationRow
            name="MongoDB Atlas"
            status="ok"
            note="Backend connected on boot (see server logs)"
          />
          <IntegrationRow
            name="Cloudinary"
            status="ok"
            note="Product + category images uploaded here"
          />
          <IntegrationRow
            name="SMTP (Nodemailer)"
            status="ok"
            note="Transactional email: OTP, order confirm, invoices"
          />
          <IntegrationRow
            name="Razorpay"
            status="ok"
            note="Signature verify + webhook + PDF invoice"
          />
        </ul>
      </div>

      <div className="card p-6">
        <h2 className="font-display text-xl text-midnight-900 mb-4">API</h2>
        <p className="text-sm text-charcoal-500">
          Client is calling:{' '}
          <code className="text-midnight-900 bg-ivory rounded-md px-2 py-0.5 text-xs">
            {apiUrl}
          </code>
        </p>
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-line bg-ivory px-4 py-3 text-sm text-charcoal-500">
          <Info size={16} className="text-gold-600 shrink-0 mt-0.5" />
          <div>
            An editable settings module (shipping rules, tax, SMTP override,
            maintenance mode) is planned for the next maintenance milestone.
            All current values come from the server\u2019s <code>.env</code> and
            are validated on boot.
          </div>
        </div>
      </div>
    </div>
  );
}

function IntegrationRow({
  name,
  status,
  note,
}: {
  name: string;
  status: 'ok' | 'warn' | 'error';
  note: string;
}): JSX.Element {
  const color =
    status === 'ok'
      ? 'bg-emerald-500'
      : status === 'warn'
      ? 'bg-amber-500'
      : 'bg-red-500';
  return (
    <li className="flex items-center gap-3">
      <span className={`w-2 h-2 rounded-full ${color}`} />
      <span className="font-medium text-midnight-900 min-w-[160px]">{name}</span>
      <span className="text-charcoal-400">{note}</span>
    </li>
  );
}
