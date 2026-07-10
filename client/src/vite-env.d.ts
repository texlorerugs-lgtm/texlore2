/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_APP_NAME?: string;
  readonly VITE_DEFAULT_CURRENCY?: string;
  readonly VITE_SUPPORTED_CURRENCIES?: string;
  readonly VITE_RAZORPAY_KEY_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/**
 * React 19 removes the global JSX namespace by default. Re-expose it so
 * component return types stay concise (`JSX.Element` vs `React.JSX.Element`).
 */
import type { JSX as ReactJSX } from 'react';
// eslint-disable-next-line @typescript-eslint/no-namespace
declare global {
  namespace JSX {
    type Element = ReactJSX.Element;
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface IntrinsicElements extends ReactJSX.IntrinsicElements {}
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface ElementClass extends ReactJSX.ElementClass {}
  }
}
