import { Link } from 'react-router-dom';

interface Props {
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
}

export function Logo({ variant = 'dark', size = 'md' }: Props): JSX.Element {
  const sizes = { sm: 'text-xl', md: 'text-2xl', lg: 'text-4xl' } as const;
  const color = variant === 'light' ? 'text-ivory' : 'text-midnight-900';
  return (
    <Link
      to="/"
      className={`font-display tracking-wide leading-none ${sizes[size]} ${color}`}
    >
      Texlore
    </Link>
  );
}
