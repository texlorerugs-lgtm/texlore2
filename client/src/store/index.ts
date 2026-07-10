/**
 * Redux Toolkit store with redux-persist.
 * Only non-sensitive fields are persisted (see auth slice comment).
 */
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import {
  persistReducer,
  persistStore,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux';

import authReducer from './auth.slice';
import cartReducer from './cart.slice';

const rootReducer = combineReducers({
  auth: authReducer,
  cart: cartReducer,
});

const persistedReducer = persistReducer(
  {
    key: 'texlore-root',
    version: 2,
    storage,
    whitelist: ['auth', 'cart'],
    // Explicitly do NOT persist tokens themselves — see auth.slice.ts
    // Cart persists only cachedItemCount for header hydration; the real
    // snapshot is refetched from server on load.
  },
  rootReducer,
);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefault) =>
    getDefault({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
