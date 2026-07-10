import { Search } from 'lucide-react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChange, placeholder }: Props): JSX.Element {
  return (
    <div className="relative">
      <Search
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? 'Search…'}
        className="w-full sm:w-72 rounded-full border border-line bg-pearl pl-9 pr-4 py-2 text-sm text-midnight-900 outline-none focus:border-midnight-900"
      />
    </div>
  );
}
