import type { Request, Response } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import { ok, created } from '@/utils/apiResponse';
import { ApiError } from '@/utils/ApiError';
import {
  listAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from '@/services/address.service';

function uid(req: Request): string {
  if (!req.user) throw ApiError.unauthorized();
  return req.user.id;
}

export const getAddresses = asyncHandler(async (req: Request, res: Response) => {
  const items = await listAddresses(uid(req));
  ok(res, { addresses: items }, 'OK');
});

export const postAddress = asyncHandler(async (req: Request, res: Response) => {
  const items = await createAddress(uid(req), req.body);
  created(res, { addresses: items }, 'Address added.');
});

export const patchAddress = asyncHandler(async (req: Request, res: Response) => {
  const items = await updateAddress(uid(req), req.params.id, req.body);
  ok(res, { addresses: items }, 'Address updated.');
});

export const deleteAddressCtl = asyncHandler(async (req: Request, res: Response) => {
  const items = await deleteAddress(uid(req), req.params.id);
  ok(res, { addresses: items }, 'Address removed.');
});

export const postSetDefaultAddress = asyncHandler(async (req: Request, res: Response) => {
  const items = await setDefaultAddress(uid(req), req.params.id);
  ok(res, { addresses: items }, 'Default address updated.');
});
