import { Router } from 'express';
import { requireAdmin, requirePermission } from '@/middlewares/admin';
import {
  adminDashboardSummary,
  adminRevenueSeries,
  adminTopProducts,
  adminLowStock,
  adminRecentOrders,
  adminListCustomers,
  adminBlockCustomer,
} from '@/controllers/admin-analytics.controller';

export const adminAnalyticsRouter = Router();
adminAnalyticsRouter.use(requireAdmin, requirePermission('analytics:view'));

adminAnalyticsRouter.get('/summary', adminDashboardSummary);
adminAnalyticsRouter.get('/revenue-series', adminRevenueSeries);
adminAnalyticsRouter.get('/top-products', adminTopProducts);
adminAnalyticsRouter.get('/low-stock', adminLowStock);
adminAnalyticsRouter.get('/recent-orders', adminRecentOrders);

export const adminCustomersRouter = Router();
adminCustomersRouter.use(requireAdmin, requirePermission('customer:manage'));
adminCustomersRouter.get('/', adminListCustomers);
adminCustomersRouter.post('/:id/block', adminBlockCustomer);
