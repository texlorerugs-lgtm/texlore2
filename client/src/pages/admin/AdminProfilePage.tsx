import { PageHeader } from '@/components/admin/PageHeader';
import { StatusPill } from '@/components/admin/StatusPill';
import { useAppSelector } from '@/store';

export default function AdminProfilePage(): JSX.Element {
  const admin = useAppSelector((s) => s.auth.admin);
  if (!admin) return <></>;

  return (
    <div>
      <PageHeader title="Admin profile" />

      <section className="card p-8 flex flex-col sm:flex-row items-start gap-6">
        <div className="w-20 h-20 rounded-full bg-gold-gradient text-midnight-900 inline-flex items-center justify-center text-3xl font-display font-semibold shrink-0">
          {admin.name?.[0]?.toUpperCase() ?? 'A'}
        </div>
        <div className="flex-1">
          <p className="font-display text-2xl text-midnight-900">{admin.name}</p>
          <p className="text-sm text-charcoal-400">{admin.email}</p>
          <p className="text-xs text-charcoal-400 mt-1 uppercase tracking-widest">
            Role: {admin.role}
          </p>
          <p className="text-xs text-charcoal-400 mt-1">
            Last login: {admin.lastLoginAt ? new Date(admin.lastLoginAt).toLocaleString('en-IN') : '—'}
          </p>
        </div>
      </section>

      <section className="card p-6 mt-6">
        <h2 className="font-display text-xl text-midnight-900 mb-4">Permissions</h2>
        <div className="flex flex-wrap gap-2">
          {(admin.permissions ?? []).map((p) => (
            <StatusPill key={p} status={p.replace(':', '-')} />
          ))}
        </div>
      </section>

      <section className="card p-6 mt-6">
        <h2 className="font-display text-xl text-midnight-900 mb-3">Account controls</h2>
        <p className="text-sm text-charcoal-500 leading-relaxed">
          Password and Secret Key rotation is intentionally not exposed inside
          the console. Update via the server\u2019s <code>ADMIN_*</code> env
          vars and run <code>npm run seed</code> — the seed script upserts
          admin credentials safely.
        </p>
      </section>
    </div>
  );
}
