import { Button } from '@/components/ui/Button';

interface Props {
  page: number;
  pages: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, pages, onChange }: Props): JSX.Element {
  if (pages <= 1) return <></>;
  return (
    <div className="mt-6 flex items-center justify-center gap-2">
      <Button variant="ghost" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        ← Previous
      </Button>
      <span className="text-sm text-charcoal-400 px-3">
        Page {page} of {pages}
      </span>
      <Button
        variant="ghost"
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
      >
        Next →
      </Button>
    </div>
  );
}
