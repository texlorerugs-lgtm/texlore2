import { useEffect, useRef, useState } from 'react';

interface Props {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
}

/**
 * Segmented OTP input. Supports paste + keyboard arrows.
 */
export function OtpInput({ length = 6, value, onChange, autoFocus }: Props): JSX.Element {
  const [digits, setDigits] = useState<string[]>(() =>
    Array.from({ length }, (_, i) => value[i] ?? ''),
  );
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    // Keep local state in sync when parent controls it programmatically
    setDigits(Array.from({ length }, (_, i) => value[i] ?? ''));
  }, [value, length]);

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  function updateAt(i: number, ch: string): void {
    const cleaned = ch.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[i] = cleaned;
    setDigits(next);
    onChange(next.join(''));
    if (cleaned && i < length - 1) refs.current[i + 1]?.focus();
  }

  function handleKey(i: number, e: React.KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus();
    if (e.key === 'ArrowRight' && i < length - 1) refs.current[i + 1]?.focus();
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>): void {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pasted) return;
    e.preventDefault();
    const next = Array.from({ length }, (_, i) => pasted[i] ?? '');
    setDigits(next);
    onChange(next.join(''));
    const focusIdx = Math.min(pasted.length, length - 1);
    refs.current[focusIdx]?.focus();
  }

  return (
    <div className="flex justify-center gap-2 sm:gap-3">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          inputMode="numeric"
          pattern="\d*"
          maxLength={1}
          value={d}
          onChange={(e) => updateAt(i, e.target.value)}
          onKeyDown={(e) => handleKey(i, e)}
          onPaste={handlePaste}
          className="w-11 h-14 sm:w-12 sm:h-16 text-center text-2xl font-semibold rounded-xl
                     border border-line bg-pearl text-midnight-900
                     focus:outline-none focus:border-midnight-900 focus:ring-2 focus:ring-midnight-900/10
                     transition-all"
        />
      ))}
    </div>
  );
}
