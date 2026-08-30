"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

/**
 * The dashed "Add child" tile shown at the end of the "Your
 * Children" grid on the parent dashboard. Pulled out of page.tsx
 * so its min-height/hover treatment can be tuned in one place and
 * stays visually matched to StudentCard.
 */
export default function AddChildCard() {
  return (
    <Link
      href="/parent/students/new"
      className="group flex flex-col items-center justify-center gap-2 border-2 border-dashed border-violet-200 rounded-3xl p-4 min-h-[13.5rem] text-violet-300 hover:text-brand hover:border-brand-light hover:bg-violet-50/60 transition-colors"
    >
      <span className="w-11 h-11 rounded-full bg-violet-50 group-hover:bg-violet-100 flex items-center justify-center transition-colors">
        <Plus size={22} />
      </span>
      <span className="text-sm font-bold">Add child</span>
    </Link>
  );
}
