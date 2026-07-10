/**
 * Cart slice. All mutations happen server-side; we mirror the returned
 * snapshot into state. We keep only a lightweight persisted count so the
 * header badge doesn't flash on reload.
 */
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { CartSnapshot } from '@/types/commerce';

interface CartState {
  snapshot: CartSnapshot | null;
  loading: boolean;
  /** Persisted so the header cart badge is instantly correct on reload. */
  cachedItemCount: number;
}

const initialState: CartState = {
  snapshot: null,
  loading: false,
  cachedItemCount: 0,
};

const slice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setSnapshot(state, action: PayloadAction<CartSnapshot | null>) {
      state.snapshot = action.payload;
      state.cachedItemCount = action.payload?.itemCount ?? 0;
      state.loading = false;
    },
    clear(state) {
      state.snapshot = null;
      state.cachedItemCount = 0;
    },
  },
});

export const { setLoading, setSnapshot, clear: clearCartState } = slice.actions;
export default slice.reducer;
