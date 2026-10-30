"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

import {
  initialOf,
  kidColor,
} from "@/features/parent/components/dashboard/dashboardUtils";
import type { DashboardKid } from "@/features/parent/types/dashboard";

export type DashboardLearner = "all" | string;

interface Props {
  firstName: string;
  kids: DashboardKid[];
  active: DashboardLearner;
  onSelect: (id: DashboardLearner) => void;
  todayCount: number;
  activeClasses: number;
  homeworkDue: number;
  now: Date;
}

/** Greeting, today's numbers and the learner chips ("All" / one child). */
export default function DashboardHeader({
  firstName,
  kids,
  active,
  onSelect,
  todayCount,
  activeClasses,
  homeworkDue,
  now,
}: Props) {
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const stats = [
    { n: todayCount, label: "today" },
    { n: activeClasses, label: "active classes" },
    { n: homeworkDue, label: "homework due" },
  ];

  return (
    <header>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-[28px] font-semibold leading-tight text-[#1c1833]">
            {greeting}
            {firstName ? (
              <>
                ,{" "}
                <span className="bg-gradient-to-r from-[#5931a2] to-[#c026d3] bg-clip-text text-transparent">
                  {firstName}
                </span>
              </>
            ) : null}
          </h1>
          <p className="text-[15px] text-[#7d7998]">
            {now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2" aria-label="Today at a glance">
          {stats.map((s) => (
            <span
              key={s.label}
              className="rounded-full border border-[#ebe8f3] bg-white/80 px-3 py-1.5 text-[13px] text-[#55516e]"
            >
              <b className="mr-1 font-semibold text-[#1f1a30]">{s.n}</b>
              {s.label}
            </span>
          ))}
        </div>
      </div>

      <div
        role="group"
        aria-label="Choose a learner"
        className="mt-4 flex items-center gap-2 overflow-x-auto p-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <button
          type="button"
          onClick={() => onSelect("all")}
          aria-pressed={active === "all"}
          className="h-11 shrink-0 rounded-full border border-[#ebe8f3] bg-white px-4 text-sm font-semibold text-[#55516e] transition hover:border-brand aria-pressed:border-brand aria-pressed:bg-brand aria-pressed:text-white"
        >
          All
        </button>

        {kids.map((k) => (
          <button
            key={k.id}
            type="button"
            onClick={() => onSelect(k.id)}
            aria-pressed={active === k.id}
            className="group flex h-11 shrink-0 items-center gap-2 rounded-full border border-[#ebe8f3] bg-white py-0 pl-1.5 pr-4 text-sm font-semibold text-[#55516e] transition hover:border-brand aria-pressed:border-brand aria-pressed:bg-brand aria-pressed:text-white"
          >
            <span
              className="grid size-8 place-items-center rounded-full text-sm font-semibold text-white group-aria-pressed:bg-white/25!"
              style={{ backgroundColor: kidColor(kids, k.id) }}
            >
              {initialOf(k.name)}
            </span>
            {k.name}
            {k.grade !== null && (
              <small className="font-semibold text-[#7d7998] group-aria-pressed:text-white/80">
                Gr {k.grade}
              </small>
            )}
          </button>
        ))}

        <Link
          href="/parent/students/new"
          className="flex h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-brand hover:bg-[#f6f1ff]"
        >
          <Plus size={16} />
          Add learner
        </Link>
      </div>
    </header>
  );
}
