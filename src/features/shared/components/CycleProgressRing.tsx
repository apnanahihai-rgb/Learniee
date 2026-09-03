"use client";

/**
 * Small circular "sessions done this cycle" indicator. Used on both
 * the Parent and Teacher enrollment lists (03-DATA-MODEL.md's
 * `Enrollment.sessionsCompletedInCycle` / `sessionsPerMonth`).
 * Deliberately dumb/presentational — no fetching, no color logic
 * beyond "done vs. remaining".
 */

interface Props {
  completed: number;
  total: number;
  size?: number;
  strokeWidth?: number;
  colorClassName?: string;
  label?: string;
}

export default function CycleProgressRing({
  completed,
  total,
  size = 44,
  strokeWidth = 4,
  colorClassName = "text-brand",
  label,
}: Props) {
  // Defensive: if either value ever arrives as undefined/null/NaN
  // (e.g. a stale Prisma client from before this feature's migration
  // ran, or a not-yet-refreshed client cache), fall back to 0 rather
  // than feeding NaN into the SVG's strokeDashoffset.
  const safeCompleted = Number.isFinite(completed) ? completed : 0;
  const safeTotal = Number.isFinite(total) && total > 0 ? total : 1;
  const pct = Math.min(1, Math.max(0, safeCompleted / safeTotal));

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - pct);

  return (
    <div className="flex items-center gap-2" title={`${completed} of ${total} sessions this cycle`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-gray-200"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className={colorClassName}
          stroke="currentColor"
        />
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          className="fill-gray-700 font-bold"
          style={{ fontSize: size * 0.26 }}
        >
          {safeCompleted}/{total ?? "?"}
        </text>
      </svg>
      {label && <span className="text-xs text-gray-500">{label}</span>}
    </div>
  );
}
