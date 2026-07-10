/**
 * Auth slice — holds the current user + admin session.
 * Access tokens are NOT persisted (memory only for security).
 * Refresh tokens live in httpOnly cookies handled by the server.
 * We persist only the "have I logged in?" flag so we can attempt a silent
 * refresh on page reload (see App.tsx bootAuth effect).
 */
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AdminProfile, UserProfile } from '@/types/auth';
import { setAccessToken } from '@/lib/http';

export interface AuthState {
  user: UserProfile | null;
  admin: AdminProfile | null;
  /** Non-sensitive flags used only to gate a silent refresh on page load. */
  hasUserSession: boolean;
  hasAdminSession: boolean;
}

const initialState: AuthState = {
  user: null,
  admin: null,
  hasUserSession: false,
  hasAdminSession: false,
};

const slice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<{ user: UserProfile; accessToken: string }>) {
      state.user = action.payload.user;
      state.hasUserSession = true;
      setAccessToken('user', action.payload.accessToken);
    },
    updateUser(state, action: PayloadAction<UserProfile>) {
      state.user = action.payload;
    },
    clearUser(state) {
      state.user = null;
      state.hasUserSession = false;
      setAccessToken('user', null);
    },
    setAdmin(state, action: PayloadAction<{ admin: AdminProfile; accessToken: string }>) {
      state.admin = action.payload.admin;
      state.hasAdminSession = true;
      setAccessToken('admin', action.payload.accessToken);
    },
    updateAdmin(state, action: PayloadAction<AdminProfile>) {
      state.admin = action.payload;
    },
    clearAdmin(state) {
      state.admin = null;
      state.hasAdminSession = false;
      setAccessToken('admin', null);
    },
  },
});

export const { setUser, updateUser, clearUser, setAdmin, updateAdmin, clearAdmin } = slice.actions;
export default slice.reducer;
