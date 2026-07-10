/**
 * useCart — thin wrapper around the cart service that dispatches snapshots
 * into the Redux store and surfaces user-friendly toasts.
 */
import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '@/store';
import { setLoading, setSnapshot } from '@/store/cart.slice';
import { cartApi } from '@/services/cart.service';
import type { CartSnapshot } from '@/types/commerce';

function errorMessage(err: unknown, fallback: string): string {
  return (
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback
  );
}

export function useCart(): {
  snapshot: CartSnapshot | null;
  loading: boolean;
  itemCount: number;
  refresh: () => Promise<void>;
  add: (body: { productId: string; sizeVariationId: string; quantity: number }) => Promise<void>;
  updateQty: (itemId: string, quantity: number) => Promise<void>;
  remove: (itemId: string) => Promise<void>;
  clear: () => Promise<void>;
  applyCoupon: (code: string) => Promise<void>;
  removeCoupon: () => Promise<void>;
} {
  const dispatch = useAppDispatch();
  const { snapshot, loading, cachedItemCount } = useAppSelector((s) => s.cart);
  const isAuthed = useAppSelector((s) => !!s.auth.user);

  const refresh = useCallback(async () => {
    if (!isAuthed) {
      dispatch(setSnapshot(null));
      return;
    }
    dispatch(setLoading(true));
    try {
      const { cart } = await cartApi.get();
      dispatch(setSnapshot(cart));
      if (cart.autoCleaned) {
        toast('Some cart items were adjusted for stock or availability.', { icon: 'ℹ️' });
      }
    } catch (err) {
      dispatch(setLoading(false));
      toast.error(errorMessage(err, 'Could not load your cart.'));
    }
  }, [dispatch, isAuthed]);

  const add = useCallback(
    async (body: { productId: string; sizeVariationId: string; quantity: number }) => {
      if (!isAuthed) throw new Error('Login required');
      dispatch(setLoading(true));
      try {
        const { cart } = await cartApi.add(body);
        dispatch(setSnapshot(cart));
        toast.success('Added to cart');
      } catch (err) {
        dispatch(setLoading(false));
        toast.error(errorMessage(err, 'Could not add to cart.'));
        throw err;
      }
    },
    [dispatch, isAuthed],
  );

  const updateQty = useCallback(
    async (itemId: string, quantity: number) => {
      dispatch(setLoading(true));
      try {
        const { cart } = await cartApi.updateQty(itemId, quantity);
        dispatch(setSnapshot(cart));
      } catch (err) {
        dispatch(setLoading(false));
        toast.error(errorMessage(err, 'Could not update cart.'));
      }
    },
    [dispatch],
  );

  const remove = useCallback(
    async (itemId: string) => {
      dispatch(setLoading(true));
      try {
        const { cart } = await cartApi.remove(itemId);
        dispatch(setSnapshot(cart));
        toast.success('Removed');
      } catch (err) {
        dispatch(setLoading(false));
        toast.error(errorMessage(err, 'Could not remove item.'));
      }
    },
    [dispatch],
  );

  const clear = useCallback(async () => {
    dispatch(setLoading(true));
    try {
      const { cart } = await cartApi.clear();
      dispatch(setSnapshot(cart));
    } catch (err) {
      dispatch(setLoading(false));
      toast.error(errorMessage(err, 'Could not clear cart.'));
    }
  }, [dispatch]);

  const applyCoupon = useCallback(
    async (code: string) => {
      dispatch(setLoading(true));
      try {
        const { cart } = await cartApi.applyCoupon(code);
        dispatch(setSnapshot(cart));
        toast.success(`Coupon ${cart.coupon.code} applied`);
      } catch (err) {
        dispatch(setLoading(false));
        toast.error(errorMessage(err, 'Could not apply coupon.'));
      }
    },
    [dispatch],
  );

  const removeCoupon = useCallback(async () => {
    dispatch(setLoading(true));
    try {
      const { cart } = await cartApi.removeCoupon();
      dispatch(setSnapshot(cart));
    } catch (err) {
      dispatch(setLoading(false));
      toast.error(errorMessage(err, 'Could not remove coupon.'));
    }
  }, [dispatch]);

  return {
    snapshot,
    loading,
    itemCount: snapshot?.itemCount ?? cachedItemCount,
    refresh,
    add,
    updateQty,
    remove,
    clear,
    applyCoupon,
    removeCoupon,
  };
}
