import type { Request, Response } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import { ok } from '@/utils/apiResponse';
import { ApiError } from '@/utils/ApiError';
import {
  getDashboardSummary,
  getRevenueSeries,
  getTopProducts,
  getLowStockProducts,
  getRecentOrders,
  listCustomers,
  setCustomerBlocked,
} from '@/services/analytics.service';

export const adminDashboardSummary = asyncHandler(async (_req: Request, res: Response) => {
  const data = await getDashboardSummary();
  ok(res, data, 'OK');
});

export const adminRevenueSeries = asyncHandler(async (req: Request, res: Response) => {
  const days = Number(req.query.days ?? 30);
  const data = await getRevenueSeries(days);
  ok(res, { series: data }, 'OK');
});

export const adminTopProducts = asyncHandler(async (req: Request, res: Response) => {
  const limit = Number(req.query.limit ?? 5);
  const data = await getTopProducts(limit);
  ok(res, { products: data }, 'OK');
});

export const adminLowStock = asyncHandler(async (req: Request, res: Response) => {
  const limit = Number(req.query.limit ?? 10);
  const data = await getLowStockProducts(limit);
  ok(res, { products: data }, 'OK');
});

export const adminRecentOrders = asyncHandler(async (req: Request, res: Response) => {
  const limit = Number(req.query.limit ?? 5);
  const data = await getRecentOrders(limit);
  ok(res, { orders: data }, 'OK');
});

// Customers
export const adminListCustomers = asyncHandler(async (req: Request, res: Response) => {
  const data = await listCustomers({
    q: req.query.q as string | undefined,
    status: req.query.status as never,
    sort: req.query.sort as string | undefined,
    page: req.query.page as unknown as number,
    limit: req.query.limit as unknown as number,
  });
  ok(res, data, 'OK');
});

export const adminBlockCustomer = asyncHandler(async (req: Request, res: Response) => {
  const blocked = req.body?.blocked !== false;
  try {
    await setCustomerBlocked(req.params.id, blocked);
  } catch {
    throw ApiError.badRequest('Invalid user id.');
  }
  ok(res, { blocked }, blocked ? 'Customer blocked.' : 'Customer unblocked.');
});
