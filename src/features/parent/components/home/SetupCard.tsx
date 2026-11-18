import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { ProgressRing } from "./HomeBits";
import type { HomeData } from "./homeTypes";

interface SetupProgressCardProps {
  href: string;
  done: number;
  total: number;
  nextLabel: string;
}

/** "Finish setting up" row with a progress ring; shared by the Parent and Teacher Home. */
export function SetupProgressCard({ href, done, total, nextLabel }: SetupProgressCardProps) {
  return (
    <Link
      href={href}
      className="flex w-full items-center gap-3 rounded-[14px] border border-pd-line bg-white px-3.5 py-3 text-left hover:border-pd-line2"
    >
      <ProgressRing percent={Math.round((done / total) * 100)} size={40} />
      <span className="flex min-w-0 flex-1 flex-col">
        <b className="text-sm font-semibold">{nextLabel}</b>
        <small className="text-xs text-pd-ink3">
          {done} of {total} steps done
        </small>
      </span>
      <ChevronRight size={18} className="text-pd-ink3" />
    </Link>
  );
}

export default function SetupCard({ data }: { data: HomeData }) {
  const setup = data.setup;
  if (!setup) return null;

  return (
    <SetupProgressCard
      href={setup.href}
      done={setup.done}
      total={setup.total}
      nextLabel={setup.nextLabel}
    />
  );
}
