import { useMemo } from 'react';

interface Point {
  date: string;
  revenue: number;
  orders: number;
}

interface Props {
  data: Point[];
  height?: number;
  metric?: 'revenue' | 'orders';
}

/**
 * Compact SVG area chart — no external library. Renders both a gradient
 * area fill and a line, plus a subtle horizontal grid.
 */
export function RevenueChart({ data, height = 240, metric = 'revenue' }: Props): JSX.Element {
  const values = data.map((d) => (metric === 'revenue' ? d.revenue : d.orders));

  const { path, areaPath, ticks, max } = useMemo(() => {
    const w = 800;
    const h = height;
    const padX = 24;
    const padY = 20;
    const max = Math.max(1, ...values);
    const stepX = (w - padX * 2) / Math.max(1, values.length - 1);
    const points = values.map((v, i) => [
      padX + i * stepX,
      padY + (h - padY * 2) * (1 - v / max),
    ]);
    let path = '';
    if (points.length > 0) {
      path = points
        .map((p, i) => (i === 0 ? `M ${p[0]},${p[1]}` : `L ${p[0]},${p[1]}`))
        .join(' ');
    }
    let areaPath = '';
    if (points.length > 0) {
      const first = points[0];
      const last = points[points.length - 1];
      areaPath = `M ${first[0]},${h - padY} ${path.replace('M', 'L')} L ${last[0]},${h - padY} Z`;
    }
    // 4 horizontal ticks
    const ticks = [0.25, 0.5, 0.75].map((t) => padY + (h - padY * 2) * t);
    return { path, areaPath, ticks, max };
  }, [values, height]);

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-charcoal-400 text-sm">
        No data yet — orders will appear here as they arrive.
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 800 ${height}`}
        preserveAspectRatio="none"
        className="w-full block"
        style={{ minWidth: 400 }}
        role="img"
        aria-label="Revenue chart"
      >
        <defs>
          <linearGradient id="rev-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#D4AF37" stopOpacity="0.35" />
            <stop offset="1" stopColor="#D4AF37" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Grid */}
        {ticks.map((y, i) => (
          <line key={i} x1="24" x2="776" y1={y} y2={y} stroke="#E7E1D3" strokeDasharray="4 4" />
        ))}
        {/* Area */}
        <path d={areaPath} fill="url(#rev-grad)" />
        {/* Line */}
        <path d={path} fill="none" stroke="#0B1B3A" strokeWidth="2" strokeLinejoin="round" />
      </svg>
      <div className="flex justify-between text-[11px] text-charcoal-400 mt-1 px-1">
        <span>{data[0]?.date}</span>
        <span>Peak: {metric === 'revenue' ? `₹${max.toLocaleString('en-IN')}` : max}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  );
}
