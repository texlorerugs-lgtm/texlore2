import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'gold' | 'ghost';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  variant?: Variant;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const variantClass: Record<Variant, string> = {
  primary: 'btn-primary',
  gold: 'btn-gold',
  ghost: 'btn-ghost',
};

export function Button({
  loading,
  variant = 'primary',
  fullWidth,
  leftIcon,
  rightIcon,
  children,
  disabled,
  className,
  ...rest
}: Props): JSX.Element {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={
        variantClass[variant] +
        (fullWidth ? ' w-full' : '') +
        (className ? ' ' + className : '')
      }
    >
      {loading ? (
        <>
          <Loader2 size={18} className="animate-spin" />
          Please wait
        </>
      ) : (
        <>
          {leftIcon}
          {children}
          {rightIcon}
        </>
      )}
    </button>
  );
}
