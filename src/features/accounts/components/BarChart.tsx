export interface BarDatum {
  label: string;
  value: number;
  color: string;
  /** Optional small text after the value, e.g. a row count like "(4)". */
  sublabel?: string;
}

interface BarChartProps {
  data: BarDatum[];
  valueFormatter?: (value: number) => string;
  /** Share one scale across multiple bar charts instead of each auto-scaling to its own max. */
  maxValue?: number;
}

/**
 * Plain horizontal bar chart — no charting library dependency, same
 * "no external chart lib" convention as PieChart.tsx. Each row is a
 * label, a bar proportional to the largest value in the set (or an
 * explicit `maxValue` so two charts share one scale), and a
 * right-aligned value. Meant to replace plain data-table rows with
 * something scannable at a glance.
 */
export default function BarChart({ data, valueFormatter, maxValue }: BarChartProps) {
  const format = valueFormatter ?? ((n: number) => n.toLocaleString("en-IN"));
  const max = maxValue ?? Math.max(1, ...data.map((d) => Math.max(0, d.value)));

  if (data.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-6">No data for this period.</p>;
  }

  return (
    <div className="flex flex-col gap-3.5">
      {data.map((d) => {
        const pct = max > 0 ? Math.min(100, (Math.max(0, d.value) / max) * 100) : 0;
        return (
          <div key={d.label} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 text-gray-600 min-w-0">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: d.color }}
                />
                <span className="truncate">{d.label}</span>
              </span>
              <span className="font-semibold text-gray-800 tabular-nums shrink-0">
                {format(d.value)}
                {d.sublabel && <span className="text-gray-400 font-normal ml-1">{d.sublabel}</span>}
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full transition-[width] duration-300"
                style={{ width: `${pct}%`, backgroundColor: d.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export interface StackedBarSegment {
  label: string;
  value: number;
  color: string;
}

/**
 * A single composition bar (e.g. Revenue split into Tuition + Demo) with
 * a colored-dot legend and percentage underneath — for showing how one
 * total breaks down without a table.
 */
export function StackedBar({
  segments,
  valueFormatter,
}: {
  segments: StackedBarSegment[];
  valueFormatter?: (value: number) => string;
}) {
  const format = valueFormatter ?? ((n: number) => n.toLocaleString("en-IN"));
  const total = segments.reduce((sum, s) => sum + Math.max(0, s.value), 0);
  const positive = segments.filter((s) => s.value > 0);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="h-3 w-full rounded-full overflow-hidden bg-gray-100 flex">
        {total > 0 ? (
          positive.map((s) => (
            <div
              key={s.label}
              style={{ width: `${(s.value / total) * 100}%`, backgroundColor: s.color }}
              title={`${s.label}: ${format(s.value)}`}
            />
          ))
        ) : (
          <div className="w-full h-full" />
        )}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {segments.map((s) => {
          const pct = total > 0 ? Math.round((s.value / total) * 1000) / 10 : 0;
          return (
            <span key={s.label} className="flex items-center gap-1.5 text-xs text-gray-600">
              <span
                className="inline-block w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: s.color }}
              />
              {s.label}
              <span className="text-gray-400">
                {format(s.value)} ({pct}%)
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
