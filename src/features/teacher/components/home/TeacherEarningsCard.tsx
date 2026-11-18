import Link from "next/link";

import { BTN_TXT, KidAvatar } from "@/features/parent/components/home/HomeBits";
import { inr } from "@/features/parent/components/home/homeLogic";
import { TEACHER_SHARE } from "@/features/shared/utils/teacherRateShare";

import { studentColor } from "./teacherHomeLogic";
import type { TeacherHomeEarnings } from "./teacherHomeTypes";

export default function TeacherEarningsCard({
  earnings,
  studentNames,
}: {
  earnings: TeacherHomeEarnings;
  studentNames: string[];
}) {
  return (
    <section
      aria-label="Earnings"
      className="flex flex-col gap-1.5 rounded-[18px] border border-pd-line bg-white p-[18px]"
    >
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold text-pd-ink3">Earnings</span>
        <span className="rounded-full bg-pd-b50 px-2.5 py-0.5 text-xs font-semibold text-pd-brand-d">
          {Math.round(TEACHER_SHARE * 100)}% share
        </span>
      </div>

      <div className="text-[30px] font-bold leading-[1.15] tracking-[-0.02em]">{inr(earnings.paid)}</div>
      <p className="mt-2.5 text-xs font-semibold text-pd-ink3">
        Paid · {inr(earnings.onTheWay)} on the way
      </p>

      {earnings.rows.length > 0 && (
        <ul className="flex flex-col">
          {earnings.rows.map((r) => (
            <li
              key={r.id}
              className="flex items-center gap-2.5 border-t border-pd-line py-[9px] text-[13px] first:border-t-0"
            >
              <KidAvatar name={r.name} color={studentColor(studentNames, r.name)} size="xs" />
              <span className="flex min-w-0 flex-1 flex-col leading-[1.3]">
                <b className="font-semibold">{r.name.split(" ")[0]}</b>
                <small className="text-xs text-pd-ink3">
                  Cycle {r.cycle} · {r.processing ? "Processing" : "Queued"}
                </small>
              </span>
              <em className="font-semibold not-italic">{inr(r.amount)}</em>
            </li>
          ))}
        </ul>
      )}

      <Link href="/teacher/earnings" className={`${BTN_TXT} -ml-2 self-start`}>
        View earnings
      </Link>
    </section>
  );
}
