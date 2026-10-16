import { currency } from "@/features/accounts/utils/format";

export interface PieChartSlice {
  label: string;
  value: number;
  color: string;
}

interface PieChartProps {
  slices: PieChartSlice[];
  /** Shown only for the empty state; the Accounts design keeps the donut hole clear. */
  emptyLabel?: string;
  size?: number;
  /** Used for the accessible name of the chart. */
  ariaLabel: string;
}

/**
 * Plain SVG donut + legend, no charting library. Each slice is a stroked arc
 * on one circle. Zero-value slices stay in the legend (so the list is stable)
 * but draw nothing; an all-zero chart draws a grey ring.
 */
export default function PieChart({ slices, emptyLabel = "No data yet", size = 160, ariaLabel }: PieChartProps) {
  const total = slices.reduce((sum, s) => sum + Math.max(0, s.value), 0);
  const radius = 40;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;
  const arcs =
    total > 0
      ? slices
          .filter((s) => s.value > 0)
          .map((s) => {
            const length = (s.value / total) * circumference;
            const arc = { ...s, length, offset };
            offset += length;
            return arc;
          })
      : [];

  return (
    <div className="flex flex-wrap items-center gap-6 p-5">
      <svg width={size} height={size} viewBox="0 0 120 120" role="img" aria-label={ariaLabel} className="shrink-0">
        {total > 0 ? (
          arcs.map((a) => (
            <circle
              key={a.label}
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke={a.color}
              strokeWidth="22"
              strokeDasharray={`${a.length.toFixed(2)} ${(circumference - a.length).toFixed(2)}`}
              strokeDashoffset={(-a.offset).toFixed(2)}
              transform="rotate(-90 60 60)"
            >
              <title>{`${a.label}: ${currency.format(a.value)}`}</title>
            </circle>
          ))
        ) : (
          <>
            <circle cx="60" cy="60" r={radius} fill="none" stroke="#e9e3f6" strokeWidth="22" />
            <text x="60" y="64" textAnchor="middle" fontSize="9" fill="#5f5675">
              {emptyLabel}
            </text>
          </>
        )}
      </svg>

      <ul className="grid min-w-[200px] flex-1 gap-2.5 text-[14px]">
        {slices.map((s) => {
          const pct = total > 0 ? Math.round((s.value / total) * 1000) / 10 : 0;

          return (
            <li key={s.label} className="flex items-center gap-2.5">
              <span aria-hidden="true" className="size-3 shrink-0 rounded-[3px]" style={{ backgroundColor: s.color }} />
              <span className="min-w-0 flex-1">{s.label}</span>
              <span className="whitespace-nowrap font-extrabold tabular-nums">
                {currency.format(s.value)}
                <span className="ml-1 font-semibold text-admin-muted">({pct}%)</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
