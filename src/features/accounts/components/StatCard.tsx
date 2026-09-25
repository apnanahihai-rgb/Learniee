import type { LucideIcon } from "lucide-react";

type Tone = "brand" | "positive" | "negative" | "neutral";

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: Tone;
  sublabel?: string;
}

const TONE_STYLES: Record<Tone, { bg: string; text: string }> = {
  brand: { bg: "bg-violet-50", text: "text-violet-700" },
  positive: { bg: "bg-emerald-50", text: "text-emerald-700" },
  negative: { bg: "bg-rose-50", text: "text-rose-700" },
  neutral: { bg: "bg-gray-100", text: "text-gray-700" },
};

/**
 * Small KPI tile — icon, big number, short label. Used across the top
 * of the Accounts Analytics tab for an at-a-glance visual summary
 * instead of having to read it out of a ledger table.
 */
export default function StatCard({ label, value, icon: Icon, tone = "neutral", sublabel }: StatCardProps) {
  const t = TONE_STYLES[tone];
  return (
    <div className="bg-white rounded-xl border shadow-sm p-4 flex items-start gap-3">
      <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${t.bg} ${t.text}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-400">{label}</p>
        <p className="text-xl font-bold text-gray-800 tabular-nums truncate">{value}</p>
        {sublabel && <p className="text-[11px] text-gray-400 mt-0.5">{sublabel}</p>}
      </div>
    </div>
  );
}
