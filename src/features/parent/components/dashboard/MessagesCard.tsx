"use client";

import Link from "next/link";

import {
  initialOf,
  kidFirstName,
  shortSubject,
} from "@/features/parent/components/dashboard/dashboardUtils";
import type { DashboardChat, DashboardKid } from "@/features/parent/types/dashboard";

interface Props {
  kids: DashboardKid[];
  chats: DashboardChat[];
}

/** The latest chats with teachers; each row opens that conversation. */
export default function MessagesCard({ kids, chats }: Props) {
  if (chats.length === 0) return null;

  return (
    <section
      aria-labelledby="dash-messages"
      className="rounded-[18px] border border-[#ebe8f3] bg-white px-2 pb-2 pt-4"
    >
      <h2
        id="dash-messages"
        className="flex items-center justify-between px-2.5 pb-1.5 font-heading text-[15px] font-semibold"
      >
        Messages
        <Link
          href="/parent/chat"
          className="rounded-lg px-2 py-1 font-sans text-sm font-semibold text-brand hover:bg-[#f6f1ff]"
        >
          All
        </Link>
      </h2>

      <ul>
        {chats.slice(0, 3).map((c) => (
          <li key={c.roomId}>
            <Link
              href={`/parent/chat/${c.roomId}`}
              className="flex items-center gap-3 rounded-xl p-2.5 text-left hover:bg-[#f8f7fc]"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#ebe9f5] text-sm font-semibold text-[#4b4575]">
                {initialOf(c.teacherName)}
              </span>
              <span className="flex min-w-0 flex-1 flex-col leading-snug">
                <b className="truncate text-sm font-semibold">{c.teacherName}</b>
                <small className="truncate text-xs text-[#7d7998]">
                  {shortSubject(c.subject)} · {kidFirstName(kids, c.studentId)}
                </small>
              </span>
              {c.lastMessageAt && (
                <span className="text-xs text-[#7d7998]">
                  {new Date(c.lastMessageAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
