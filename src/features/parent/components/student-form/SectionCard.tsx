import type { LucideIcon } from "lucide-react";

interface Props {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}

/**
 * A visually distinct, softly-tinted card for one section of the
 * student form (Basic info / Academic info / Additional info).
 * Introduced to declutter the form — previously each section was
 * just a small gray uppercase label directly above its fields with
 * no boundary, so everything blended into one long undifferentiated
 * block. Wrapping each section in its own card gives clear visual
 * chunking without adding more copy or steps.
 */
export default function SectionCard({ icon: Icon, title, children }: Props) {
  return (
    <div className="rounded-2xl border border-violet-100 bg-violet-50/40 p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-7 h-7 rounded-lg bg-white text-brand flex items-center justify-center flex-shrink-0 shadow-sm">
          <Icon size={14} />
        </span>
        <h2 className="text-xs font-bold text-gray-600 uppercase tracking-wide">
          {title}
        </h2>
      </div>

      {children}
    </div>
  );
}
