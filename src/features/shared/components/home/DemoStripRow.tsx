import Link from "next/link";
import { Lock, Video } from "lucide-react";

import { BTN_PRI } from "@/features/parent/components/home/HomeBits";

/** The disabled button shown until a demo's join window opens. */
export function LockedDemoButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      disabled
      aria-disabled="true"
      title="Opens 10 minutes before the demo"
      className={`${BTN_PRI} shrink-0 !bg-pd-b100 !text-pd-brand-d !opacity-75`}
    >
      <Lock size={14} />
      {label}
    </button>
  );
}

/**
 * Compact line for the next demo when it isn't the hero — shared by the Parent
 * and Teacher Home screens. `action` is the role-specific Join / Start button.
 */
export default function DemoStripRow({
  href,
  title,
  subtitle,
  action,
}: {
  href: string;
  title: string;
  subtitle: React.ReactNode;
  action: React.ReactNode;
}) {
  return (
    <div className="mt-3 flex items-center gap-3 rounded-xl border border-pd-line bg-white px-3.5 py-2.5 transition-colors hover:border-pd-line2">
      <Link href={href} aria-label="Open demos" className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <span className="grid size-[34px] shrink-0 place-items-center rounded-full bg-pd-b50 text-pd-brand">
          <Video size={18} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <b className="truncate text-sm font-medium">{title}</b>
          <small className="truncate text-xs font-bold text-pd-ink2">{subtitle}</small>
        </span>
      </Link>
      {action}
    </div>
  );
}
