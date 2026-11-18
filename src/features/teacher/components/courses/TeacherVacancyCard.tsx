import Link from "next/link";

import { PD_BTN_DTXT_SM, PD_BTN_PRI_SM, PD_BTN_SEC_SM } from "@/features/parent/components/courses/pdUi";
import { Tag } from "@/features/parent/components/home/HomeBits";
import type { TeacherVacancy } from "@/features/class-requests/hooks/useClassRequests";
import { formatClassRequestDate } from "@/features/shared/utils/classRequestStatus";
import { formatSchedule } from "@/features/shared/utils/weekdays";

import { formatPrice, gradeLabel } from "./courseDisplay";

const CHIP = "rounded-full bg-pd-bg px-2.5 py-[3px] text-xs font-semibold text-pd-ink2";

interface Props {
  vacancy: TeacherVacancy;
  busy: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

/** One class families asked for. Accept / Decline are final; accepting leads to a course listing. */
export default function TeacherVacancyCard({ vacancy: v, busy, onAccept, onDecline }: Props) {
  const mine = v.myResponse;
  const meta = [v.subject, gradeLabel(v.grade), v.board, v.language].filter(Boolean).join(" · ");
  const when =
    v.preferredDays.length > 0
      ? `${formatSchedule(v.preferredDays, v.preferredTime)} (IST)`
      : v.preferredSchedule
        ? `Timings: ${v.preferredSchedule}`
        : null;
  const price = formatPrice(v.pricePerSession);
  const posted = formatClassRequestDate(v.circulatedAt);

  return (
    <article className="flex flex-col gap-2.5 rounded-2xl border border-pd-line bg-white p-5">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-heading text-[17px] font-semibold leading-tight text-pd-ink">{v.title}</h3>
        {mine && (
          <Tag tone={mine.status === "ACCEPTED" ? "green" : "gray"}>
            {mine.status === "ACCEPTED" ? "Accepted" : "Declined"}
          </Tag>
        )}
      </div>

      {meta && <small className="text-[13px] text-pd-ink3">{meta}</small>}
      <p className="whitespace-pre-line text-sm text-pd-ink2">{v.description}</p>

      <div className="flex flex-wrap gap-1.5">
        {v.sessionsPerWeek ? <span className={CHIP}>{v.sessionsPerWeek} class(es) / week</span> : null}
        {when && <span className={CHIP}>{when}</span>}
        {price && <span className={CHIP}>{price} / hour</span>}
        {posted && <span className={CHIP}>Posted {posted}</span>}
      </div>

      {!mine && v.status === "OPEN" && (
        <>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={onAccept} className={PD_BTN_PRI_SM}>
              Accept
            </button>
            <button type="button" disabled={busy} onClick={onDecline} className={PD_BTN_DTXT_SM}>
              Decline
            </button>
          </div>
          <small className="text-[13px] text-pd-ink3">Your response is final.</small>
        </>
      )}

      {mine?.status === "ACCEPTED" &&
        (mine.course ? (
          <p className="text-[13px] text-pd-ink3">
            Listing created: <b className="font-semibold text-pd-ink2">{mine.course.courseTitle}</b> (
            {mine.course.status === "APPROVED" ? "live" : "awaiting approval"}).
          </p>
        ) : (
          <Link
            href={`/teacher/course-management/new?classRequestId=${v.id}`}
            className={`${PD_BTN_SEC_SM} self-start`}
          >
            Create course listing
          </Link>
        ))}

      {mine?.status === "DECLINED" && mine.note && (
        <p className="text-[13px] text-pd-ink3">Your note: {mine.note}</p>
      )}
    </article>
  );
}
