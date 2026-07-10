/**
 * Analytics aggregations for the admin dashboard.
 *
 * All numbers exclude cancelled/refunded orders from revenue but include
 * their counts in the status breakdown. Currency is normalised to INR at
 * write time (M5's payment quote is always INR in v1), so we can sum
 * `grandTotal` directly.
 */
import { Types } from 'mongoose';
import { Order } from '@/models/Order.model';
import { Product } from '@/models/Product.model';
import { Category } from '@/models/Category.model';
import { User } from '@/models/User.model';
import { Coupon } from '@/models/Coupon.model';
import { ContactMessage } from '@/models/ContactMessage.model';

const REVENUE_STATUSES = [
  'confirmed',
  'preparing',
  'packed',
  'shipped',
  'out_for_delivery',
  'delivered',
] as const;

const startOfToday = (): Date => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export interface DashboardSummary {
  revenue: {
    total: number;
    today: number;
    last30Days: number;
    averageOrderValue: number;
  };
  orders: {
    total: number;
    today: number;
    pending: number;
    delivered: number;
    cancelled: number;
    byStatus: Record<string, number>;
  };
  catalog: {
    products: number;
    categories: number;
    lowStockCount: number;
  };
  customers: {
    total: number;
    verified: number;
    blocked: number;
    newLast30Days: number;
  };
  coupons: {
    active: number;
    total: number;
  };
  messages: {
    total: number;
    new: number;
  };
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const today = startOfToday();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const revFilter = { orderStatus: { $in: REVENUE_STATUSES as unknown as string[] } };

  const [
    revenueAgg,
    todayRevenueAgg,
    last30Agg,
    ordersTotal,
    ordersToday,
    statusCountsAgg,
    productsCount,
    categoriesCount,
    lowStockAgg,
    usersAgg,
    newUsersCount,
    activeCoupons,
    totalCoupons,
    messagesTotal,
    messagesNew,
  ] = await Promise.all([
    Order.aggregate([
      { $match: revFilter },
      { $group: { _id: null, sum: { $sum: '$grandTotal' } } },
    ]),
    Order.aggregate([
      { $match: { ...revFilter, createdAt: { $gte: today } } },
      { $group: { _id: null, sum: { $sum: '$grandTotal' } } },
    ]),
    Order.aggregate([
      { $match: { ...revFilter, createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: null, sum: { $sum: '$grandTotal' } } },
    ]),
    Order.countDocuments({}),
    Order.countDocuments({ createdAt: { $gte: today } }),
    Order.aggregate([{ $group: { _id: '$orderStatus', count: { $sum: 1 } } }]),
    Product.countDocuments({ deletedAt: null }),
    Category.countDocuments({ deletedAt: null }),
    Product.countDocuments({
      deletedAt: null,
      totalStock: { $gt: 0, $lte: 5 },
    }),
    User.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          verified: {
            $sum: { $cond: [{ $eq: ['$isVerified', true] }, 1, 0] },
          },
          blocked: {
            $sum: { $cond: [{ $eq: ['$isBlocked', true] }, 1, 0] },
          },
        },
      },
    ]),
    User.countDocuments({
      isVerified: true,
      createdAt: { $gte: thirtyDaysAgo },
    }),
    Coupon.countDocuments({ deletedAt: null, isActive: true }),
    Coupon.countDocuments({ deletedAt: null }),
    ContactMessage.countDocuments({}),
    ContactMessage.countDocuments({ status: 'new' }),
  ]);

  const totalRev = revenueAgg[0]?.sum ?? 0;
  const revenueOrders = await Order.countDocuments(revFilter);
  const byStatus: Record<string, number> = {};
  for (const row of statusCountsAgg) byStatus[row._id] = row.count;

  return {
    revenue: {
      total: round2(totalRev),
      today: round2(todayRevenueAgg[0]?.sum ?? 0),
      last30Days: round2(last30Agg[0]?.sum ?? 0),
      averageOrderValue: revenueOrders > 0 ? round2(totalRev / revenueOrders) : 0,
    },
    orders: {
      total: ordersTotal,
      today: ordersToday,
      pending: (byStatus.pending ?? 0) + (byStatus.confirmed ?? 0) + (byStatus.preparing ?? 0),
      delivered: byStatus.delivered ?? 0,
      cancelled: (byStatus.cancelled ?? 0) + (byStatus.refunded ?? 0),
      byStatus,
    },
    catalog: {
      products: productsCount,
      categories: categoriesCount,
      lowStockCount: lowStockAgg,
    },
    customers: {
      total: usersAgg[0]?.total ?? 0,
      verified: usersAgg[0]?.verified ?? 0,
      blocked: usersAgg[0]?.blocked ?? 0,
      newLast30Days: newUsersCount,
    },
    coupons: {
      active: activeCoupons,
      total: totalCoupons,
    },
    messages: {
      total: messagesTotal,
      new: messagesNew,
    },
  };
}

/**
 * Daily revenue + order-count series for the last N days.
 */
export async function getRevenueSeries(
  days = 30,
): Promise<Array<{ date: string; revenue: number; orders: number }>> {
  const since = new Date();
  since.setDate(since.getDate() - Math.max(1, Math.min(365, days)) + 1);
  since.setHours(0, 0, 0, 0);

  const rows = await Order.aggregate([
    {
      $match: {
        orderStatus: { $in: REVENUE_STATUSES as unknown as string[] },
        createdAt: { $gte: since },
      },
    },
    {
      $group: {
        _id: {
          y: { $year: '$createdAt' },
          m: { $month: '$createdAt' },
          d: { $dayOfMonth: '$createdAt' },
        },
        revenue: { $sum: '$grandTotal' },
        orders: { $sum: 1 },
      },
    },
    { $sort: { '_id.y': 1, '_id.m': 1, '_id.d': 1 } },
  ]);

  const byKey = new Map<string, { revenue: number; orders: number }>();
  for (const r of rows) {
    const key = `${r._id.y}-${String(r._id.m).padStart(2, '0')}-${String(r._id.d).padStart(2, '0')}`;
    byKey.set(key, { revenue: r.revenue ?? 0, orders: r.orders ?? 0 });
  }

  const out: Array<{ date: string; revenue: number; orders: number }> = [];
  const cursor = new Date(since);
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  while (cursor <= end) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
    const cell = byKey.get(key) ?? { revenue: 0, orders: 0 };
    out.push({ date: key, revenue: round2(cell.revenue), orders: cell.orders });
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

/**
 * Top-selling products (all-time).
 */
export async function getTopProducts(limit = 5): Promise<
  Array<{
    productId: string;
    productName: string;
    productSlug: string;
    unitsSold: number;
    revenue: number;
  }>
> {
  const rows = await Order.aggregate([
    { $match: { orderStatus: { $in: REVENUE_STATUSES as unknown as string[] } } },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.productId',
        productName: { $first: '$items.productName' },
        productSlug: { $first: '$items.productSlug' },
        unitsSold: { $sum: '$items.quantity' },
        revenue: { $sum: '$items.lineTotal' },
      },
    },
    { $sort: { unitsSold: -1 } },
    { $limit: Math.max(1, Math.min(50, limit)) },
  ]);
  return rows.map((r) => ({
    productId: String(r._id),
    productName: r.productName ?? 'Unknown',
    productSlug: r.productSlug ?? '',
    unitsSold: r.unitsSold ?? 0,
    revenue: round2(r.revenue ?? 0),
  }));
}

/**
 * Low-stock alert list (available products with 1..5 stock).
 */
export async function getLowStockProducts(limit = 10): Promise<unknown[]> {
  const rows = await Product.find({
    deletedAt: null,
    totalStock: { $gt: 0, $lte: 5 },
  })
    .sort({ totalStock: 1 })
    .limit(Math.max(1, Math.min(50, limit)))
    .select('name slug totalStock images sizeVariations status')
    .lean();
  return rows.map((p) => ({
    id: String(p._id),
    name: p.name,
    slug: p.slug,
    totalStock: p.totalStock,
    primaryImage:
      (p.images ?? []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0))[0]?.url ?? '',
    status: p.status,
  }));
}

/**
 * Most recent orders (any status) — used for the dashboard activity feed.
 */
export async function getRecentOrders(limit = 5): Promise<unknown[]> {
  const rows = await Order.find({})
    .sort({ createdAt: -1 })
    .limit(Math.max(1, Math.min(50, limit)))
    .select('orderNumber grandTotal orderStatus createdAt userName userEmail items currency')
    .lean();
  return rows.map((o) => ({
    id: String(o._id),
    orderNumber: o.orderNumber,
    userName: o.userName,
    userEmail: o.userEmail,
    grandTotal: o.grandTotal,
    currency: o.currency,
    orderStatus: o.orderStatus,
    itemCount: (o.items ?? []).length,
    createdAt: o.createdAt,
  }));
}

function round2(n: number): number {
  return Math.round((n ?? 0) * 100) / 100;
}

// ------------ Customers (admin) ------------

export interface AdminCustomerRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  countryCode: string;
  isVerified: boolean;
  isBlocked: boolean;
  createdAt: Date;
  lastLoginAt?: Date;
  orderCount: number;
  totalSpent: number;
}

export async function listCustomers(params: {
  q?: string;
  status?: 'all' | 'active' | 'blocked' | 'verified' | 'unverified';
  page?: number;
  limit?: number;
  sort?: string;
}): Promise<{
  items: AdminCustomerRow[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}> {
  const page = Math.max(1, Number(params.page ?? 1));
  const limit = Math.min(100, Math.max(1, Number(params.limit ?? 20)));
  const filter: Record<string, unknown> = {};
  if (params.status === 'blocked') filter.isBlocked = true;
  else if (params.status === 'active') filter.isBlocked = false;
  if (params.status === 'verified') filter.isVerified = true;
  else if (params.status === 'unverified') filter.isVerified = false;
  if (params.q?.trim()) {
    const rex = new RegExp(params.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: rex }, { email: rex }, { phone: rex }];
  }
  const sort = parseSort(params.sort) ?? { createdAt: -1 };

  const [users, total] = await Promise.all([
    User.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
    User.countDocuments(filter),
  ]);

  const ids = users.map((u) => u._id);
  const orderAgg = await Order.aggregate([
    {
      $match: {
        userId: { $in: ids },
        orderStatus: { $in: REVENUE_STATUSES as unknown as string[] },
      },
    },
    {
      $group: {
        _id: '$userId',
        orderCount: { $sum: 1 },
        totalSpent: { $sum: '$grandTotal' },
      },
    },
  ]);
  const byUser = new Map<string, { orderCount: number; totalSpent: number }>();
  for (const r of orderAgg) {
    byUser.set(String(r._id), {
      orderCount: r.orderCount ?? 0,
      totalSpent: r.totalSpent ?? 0,
    });
  }

  return {
    items: users.map((u) => ({
      id: String(u._id),
      name: u.name,
      email: u.email,
      phone: u.phone,
      countryCode: u.countryCode,
      isVerified: !!u.isVerified,
      isBlocked: !!u.isBlocked,
      createdAt: u.createdAt as Date,
      lastLoginAt: u.lastLoginAt as Date | undefined,
      orderCount: byUser.get(String(u._id))?.orderCount ?? 0,
      totalSpent: round2(byUser.get(String(u._id))?.totalSpent ?? 0),
    })),
    total,
    page,
    limit,
    pages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function setCustomerBlocked(userId: string, blocked: boolean): Promise<void> {
  if (!Types.ObjectId.isValid(userId)) throw new Error('Invalid user id');
  await User.updateOne({ _id: userId }, { $set: { isBlocked: blocked } });
}

function parseSort(sort?: string): Record<string, 1 | -1> | null {
  if (!sort) return null;
  const out: Record<string, 1 | -1> = {};
  for (const t of sort.split(',')) {
    const [f, d] = t.split(':');
    if (!f) continue;
    out[f.trim()] = d?.trim().toLowerCase() === 'asc' ? 1 : -1;
  }
  return Object.keys(out).length ? out : null;
}
