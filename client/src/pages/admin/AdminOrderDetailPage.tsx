import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Download, Save } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatusPill } from '@/components/admin/StatusPill';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { adminOrdersApi } from '@/services/admin-orders.service';
import type { Order, OrderStatus } from '@/types/order';

const STATUSES: OrderStatus[] = [
  'pending',
  'confirmed',
  'preparing',
  'packed',
  'shipped',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'returned',
  'refunded',
];

function inr(n: number): string {
  return `₹${(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export default function AdminOrderDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<OrderStatus>('confirmed');
  const [note, setNote] = useState('');
  const [tracking, setTracking] = useState('');
  const [courier, setCourier] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const { order: o } = await adminOrdersApi.get(id);
        setOrder(o);
        setStatus(o.orderStatus);
        setTracking(o.trackingNumber ?? '');
        setCourier(o.courier ?? '');
      } catch {
        toast.error('Order not found');
        navigate('/admin/orders');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, navigate]);

  async function save(): Promise<void> {
    if (!order) return;
    setSaving(true);
    try {
      const { order: updated } = await adminOrdersApi.updateStatus(order.id, {
        status,
        note: note || undefined,
        trackingNumber: tracking || undefined,
        courier: courier || undefined,
      });
      setOrder(updated);
      setNote('');
      toast.success('Order updated');
    } catch (e: unknown) {
      toast.error(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Could not update',
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading || !order) {
    return (
      <div>
        <div className="skeleton h-6 w-40 mb-6" />
        <div className="skeleton h-64 rounded-xl2" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={order.orderNumber}
        subtitle={`Placed ${new Date(order.createdAt).toLocaleString('en-IN')} · ${order.userEmail}`}
        actions={
          <a
            href={adminOrdersApi.invoiceUrl(order.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost !text-xs !py-1.5"
          >
            <Download size={12} /> Invoice
          </a>
        }
      />

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-6">
          <section className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg text-midnight-900">Items</h2>
              <StatusPill status={order.orderStatus} />
            </div>
            <ul className="divide-y divide-line/60">
              {order.items.map((it, i) => (
                <li key={i} className="py-3 flex gap-3">
                  <div className="w-14 h-14 rounded-lg bg-ivory overflow-hidden shrink-0">
                    <img src={it.primaryImage} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-midnight-900 truncate">
                      {it.productName}
                    </p>
                    <p className="text-xs text-charcoal-400">
                      {it.size} · Qty {it.quantity} · {inr(it.netUnitPrice)} each
                    </p>
                  </div>
                  <div className="text-sm font-semibold text-midnight-900">
                    {inr(it.lineTotal)}
                  </div>
                </li>
              ))}
            </ul>

            <div className="grid sm:grid-cols-2 gap-6 mt-6 pt-6 border-t border-line/60">
              <dl className="space-y-1 text-sm">
                <Row k="Subtotal" v={inr(order.subtotal)} />
                {order.discount > 0 && (
                  <Row
                    k={`Discount${order.coupon.code ? ` (${order.coupon.code})` : ''}`}
                    v={'−' + inr(order.discount)}
                    green
                  />
                )}
                <Row k="Shipping" v={order.shipping === 0 ? 'Free' : inr(order.shipping)} />
                {order.tax > 0 && <Row k="Tax" v={inr(order.tax)} />}
                <Row k="Total" v={inr(order.grandTotal)} bold />
                <p className="text-[11px] text-charcoal-400 mt-2 break-all">
                  Payment ID: {order.gatewayPaymentId}
                </p>
              </dl>
              <div>
                <p className="text-xs uppercase tracking-widest text-charcoal-400 mb-1">
                  Ship to
                </p>
                <p className="font-medium text-midnight-900">{order.address.fullName}</p>
                <p className="text-sm">
                  {order.address.line1}
                  {order.address.line2 ? `, ${order.address.line2}` : ''}
                </p>
                <p className="text-sm">
                  {order.address.city}, {order.address.state} {order.address.zip}
                </p>
                <p className="text-sm">{order.address.country}</p>
                <p className="text-sm mt-1">
                  {order.address.countryCode} {order.address.phone}
                </p>
              </div>
            </div>
          </section>

          {order.timeline.length > 0 && (
            <section className="card p-6">
              <h2 className="font-display text-lg text-midnight-900 mb-4">Timeline</h2>
              <ol className="space-y-3">
                {[...order.timeline].reverse().map((t, i) => (
                  <li key={i} className="flex gap-3 items-start">
                    <div className="mt-1.5 w-2 h-2 rounded-full bg-gold-500 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-midnight-900 capitalize">
                        {t.status.replace(/_/g, ' ')}{' '}
                        <span className="text-[10px] text-charcoal-400 uppercase tracking-widest">
                          by {t.actorType}
                        </span>
                      </p>
                      <p className="text-xs text-charcoal-400">
                        {new Date(t.at).toLocaleString('en-IN')}
                      </p>
                      {t.note && <p className="text-sm text-charcoal-500 mt-1">{t.note}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>

        <aside className="card p-6 h-fit">
          <h2 className="font-display text-lg text-midnight-900 mb-4">Update status</h2>
          <label className="block mb-3">
            <span className="text-sm text-charcoal-500 mb-1 block">Status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as OrderStatus)}
              className="w-full rounded-xl border border-line bg-pearl px-3 py-2.5 outline-none focus:border-midnight-900 text-sm capitalize"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </label>
          <Input
            label="Courier"
            placeholder="BlueDart, DHL, …"
            value={courier}
            onChange={(e) => setCourier(e.target.value)}
          />
          <div className="mt-3">
            <Input
              label="Tracking number"
              placeholder="AWB / tracking code"
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
            />
          </div>
          <label className="block mt-3">
            <span className="text-sm text-charcoal-500 mb-1 block">Note (optional)</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-line bg-pearl px-3 py-2.5 outline-none focus:border-midnight-900 text-sm"
              placeholder="Shown to customer on status transition emails"
            />
          </label>
          <Button
            variant="primary"
            fullWidth
            className="mt-4"
            loading={saving}
            leftIcon={<Save size={14} />}
            onClick={save}
          >
            Save changes
          </Button>
          <p className="text-xs text-charcoal-400 mt-3">
            Customer receives an email for meaningful transitions. Cancelling a
            pre-shipping order restores stock automatically.
          </p>
          <div className="mt-4 pt-4 border-t border-line/60 text-xs text-charcoal-400">
            <Link to="/admin/orders" className="hover:text-midnight-900">
              ← Back to all orders
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({
  k,
  v,
  green,
  bold,
}: {
  k: string;
  v: string;
  green?: boolean;
  bold?: boolean;
}): JSX.Element {
  return (
    <div
      className={
        'flex justify-between ' +
        (bold ? 'text-base font-semibold border-t border-line/60 pt-2 mt-2 text-midnight-900' : '') +
        (green ? ' text-emerald-700' : '')
      }
    >
      <dt className={bold ? '' : 'text-charcoal-400'}>{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}
