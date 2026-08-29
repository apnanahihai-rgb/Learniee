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
      className="group flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-2xl p-4 min-h-[13.5rem] text-gray-400 hover:text-violet-600 hover:border-violet-300 hover:bg-violet-50/40 transition-colors"
    >
      <span className="w-10 h-10 rounded-full bg-gray-100 group-hover:bg-violet-100 flex items-center justify-center transition-colors">
        <Plus size={20} />
      </span>
      <span className="text-sm font-medium">Add child</span>
    </Link>
  );
}
