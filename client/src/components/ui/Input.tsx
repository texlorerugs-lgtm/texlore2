import { forwardRef, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  passwordToggle?: boolean;
}

/**
 * Reusable input with luxury styling, error state, optional password reveal.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, leftIcon, passwordToggle, type, className, id, ...rest },
  ref,
) {
  const [reveal, setReveal] = useState(false);
  const inputId = id ?? rest.name ?? Math.random().toString(36).slice(2);
  const inputType = passwordToggle ? (reveal ? 'text' : 'password') : type ?? 'text';
  const hasError = !!error;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block mb-1.5 text-sm font-medium text-charcoal-500"
        >
          {label}
        </label>
      )}
      <div
        className={
          'relative flex items-center rounded-xl border transition-all bg-pearl ' +
          (hasError
            ? 'border-red-400 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-200'
            : 'border-line focus-within:border-midnight-900 focus-within:ring-2 focus-within:ring-midnight-900/10')
        }
      >
        {leftIcon && (
          <span className="pl-3 text-charcoal-400 flex items-center">{leftIcon}</span>
        )}
        <input
          {...rest}
          id={inputId}
          ref={ref}
          type={inputType}
          className={
            'w-full bg-transparent outline-none px-3 py-3 text-charcoal-500 placeholder:text-charcoal-400/50 rounded-xl ' +
            (className ?? '')
          }
        />
        {passwordToggle && (
          <button
            type="button"
            onClick={() => setReveal((v) => !v)}
            className="pr-3 text-charcoal-400 hover:text-midnight-900 transition-colors"
            aria-label={reveal ? 'Hide password' : 'Show password'}
            tabIndex={-1}
          >
            {reveal ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {hasError ? (
        <p className="mt-1.5 text-xs text-red-500">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-charcoal-400">{hint}</p>
      ) : null}
    </div>
  );
});
