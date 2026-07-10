/**
 * Currency context — INR (base) with optional USD display conversion.
 *
 * Notes on scope:
 *   - The server prices in INR and Razorpay orders are created in INR by
 *     default. Toggling USD here converts the DISPLAY price using a fixed
 *     hardcoded rate for v1. When we're ready to actually charge USD via
 *     Razorpay International, the checkout flow will pass USD → server and
 *     the same helpers here will format correctly.
 *   - The chosen currency is persisted in localStorage.
 */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type Currency = 'INR' | 'USD';

interface CurrencyContextValue {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  /** Rate: 1 INR = X USD. */
  usdRate: number;
  /** Format a price given in INR base into the current display currency. */
  format: (inr: number) => string;
  /** Convert INR → current display currency numeric value. */
  convert: (inr: number) => number;
  symbol: string;
}

const STORAGE_KEY = 'texlore.currency';
// Static display rate. Update when the FX pipeline is wired in a later milestone.
const DEFAULT_USD_RATE = 0.012;

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }): JSX.Element {
  const supported = (import.meta.env.VITE_SUPPORTED_CURRENCIES ?? 'INR,USD')
    .split(',')
    .map((s: string) => s.trim().toUpperCase()) as Currency[];
  const defaultCurrency = (import.meta.env.VITE_DEFAULT_CURRENCY ?? 'INR') as Currency;

  const [currency, setCurrencyState] = useState<Currency>(() => {
    if (typeof window === 'undefined') return defaultCurrency;
    const stored = window.localStorage.getItem(STORAGE_KEY) as Currency | null;
    if (stored && supported.includes(stored)) return stored;
    return defaultCurrency;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, currency);
  }, [currency]);

  const value = useMemo<CurrencyContextValue>(() => {
    const symbol = currency === 'USD' ? '$' : '₹';
    const convert = (inr: number): number => {
      if (currency === 'INR') return inr;
      return Math.round(inr * DEFAULT_USD_RATE * 100) / 100;
    };
    const format = (inr: number): string => {
      const n = convert(inr ?? 0);
      if (currency === 'USD') {
        return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
      return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
    };
    return {
      currency,
      setCurrency: (c) => supported.includes(c) && setCurrencyState(c),
      usdRate: DEFAULT_USD_RATE,
      convert,
      format,
      symbol,
    };
    // supported is derived from env once — keep deps minimal
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currency]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used inside CurrencyProvider');
  return ctx;
}
