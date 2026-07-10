import { http } from '@/lib/http';
import type { ApiSuccess } from '@/types/api';

async function unwrap<T>(p: Promise<{ data: ApiSuccess<T> }>): Promise<T> {
  return (await p).data.data;
}

export interface DashboardSummary {
  revenue: { total: number; today: number; last30Days: number; averageOrderValue: number };
  orders: {
    total: number;
    today: number;
    pending: number;
    delivered: number;
    cancelled: number;
    byStatus: Record<string, number>;
  };
  catalog: { products: number; categories: number; lowStockCount: number };
  customers: { total: number; verified: number; blocked: number; newLast30Days: number };
  coupons: { active: number; total: number };
  messages: { total: number; new: number };
}

export interface RevenuePoint {
  date: string;
  revenue: number;
  orders: number;
}

export interface TopProduct {
  productId: string;
  productName: string;
  productSlug: string;
  unitsSold: number;
  revenue: number;
}

export interface LowStockProduct {
  id: string;
  name: string;
  slug: string;
  totalStock: number;
  primaryImage: string;
  status: string;
}

export interface RecentOrder {
  id: string;
  orderNumber: string;
  userName: string;
  userEmail: string;
  grandTotal: number;
  currency: string;
  orderStatus: string;
  itemCount: number;
  createdAt: string;
}

export const adminAnalyticsApi = {
  summary: () =>
    unwrap<DashboardSummary>(
      http.get('/admin/analytics/summary', { audience: 'admin' }),
    ),
  revenueSeries: (days = 30) =>
    unwrap<{ series: RevenuePoint[] }>(
      http.get('/admin/analytics/revenue-series', {
        audience: 'admin',
        params: { days },
      }),
    ),
  topProducts: (limit = 5) =>
    unwrap<{ products: TopProduct[] }>(
      http.get('/admin/analytics/top-products', {
        audience: 'admin',
        params: { limit },
      }),
    ),
  lowStock: (limit = 10) =>
    unwrap<{ products: LowStockProduct[] }>(
      http.get('/admin/analytics/low-stock', {
        audience: 'admin',
        params: { limit },
      }),
    ),
  recentOrders: (limit = 5) =>
    unwrap<{ orders: RecentOrder[] }>(
      http.get('/admin/analytics/recent-orders', {
        audience: 'admin',
        params: { limit },
      }),
    ),
};
