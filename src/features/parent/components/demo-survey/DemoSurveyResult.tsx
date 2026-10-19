"use client";

import Link from "next/link";
import { ArrowRight, Gift, LifeBuoy } from "lucide-react";

import type { DemoSurveyRouting } from "@/features/parent/hooks/useDemoSurvey";

interface Props {
  routing: DemoSurveyRouting;
  teacherName: string;
}

const primaryBtn =
  "inline-flex items-center justify-center gap-1.5 bg-brand hover:bg-brand-dark text-white text-sm font-bold px-6 py-3 rounded-full transition-colors";
const ghostBtn =
  "inline-flex items-center justify-center gap-1.5 bg-white border border-gray-200 hover:border-brand text-gray-700 text-sm font-bold px-6 py-3 rounded-full transition-colors";

/**
 * What happens after the survey, by outcome:
 *  POSITIVE  → straight to the pre-filled Enroll page
 *  UNDECIDED → saved on the dashboard (+ nudges) and a counsellor offer
 *  NEGATIVE  → 3 similar courses, another free demo, one-tap complaint
 */
export default function DemoSurveyResult({ routing, teacherName }: Props) {
  if (routing.outcome === "POSITIVE" && routing.enrollHref) {
    return (
      <div>
        <h2 className="font-heading text-xl font-bold text-gray-800 mb-1">
          Glad it went well! 🎉
        </h2>
        <p className="text-sm text-gray-500 mb-5">
          We&apos;ve filled in the course and your child — just pick a plan
          (monthly or weekly) and a start date.
        </p>

        <Link href={routing.enrollHref} className={primaryBtn}>
          Enroll with {teacherName}
          <ArrowRight size={14} />
        </Link>

        <p className="flex items-center gap-2 text-xs text-gray-500 mt-6">
          <Gift size={14} className="text-brand" />
          Know another parent?{" "}
          <Link href="/parent/referral" className="font-semibold text-brand underline">
            Refer a friend
          </Link>
        </p>
      </div>
    );
  }

  if (routing.outcome === "UNDECIDED") {
    return (
      <div>
        <h2 className="font-heading text-xl font-bold text-gray-800 mb-1">
          Saved for you
        </h2>
        <p className="text-sm text-gray-500 mb-5">
          Take your time — this course stays on your dashboard, and we&apos;ll
          send a gentle reminder. Want to talk it through first?
        </p>

        <div className="flex flex-wrap gap-3">
          <Link href="/counselling/career" className={primaryBtn}>
            Talk to a counsellor
          </Link>
          <Link href="/parent" className={ghostBtn}>
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-heading text-xl font-bold text-gray-800 mb-1">
        Thanks — sorry it wasn&apos;t a fit
      </h2>
      <p className="text-sm text-gray-500 mb-5">
        Here are a few other courses you might like
        {routing.remainingFreeDemos > 0
          ? `, and you still have ${routing.remainingFreeDemos} free demo${routing.remainingFreeDemos === 1 ? "" : "s"} to try another teacher.`
          : "."}
      </p>

      {routing.similarCourses.length > 0 && (
        <ul className="grid gap-3 mb-5">
          {routing.similarCourses.map((course) => (
            <li key={course.id}>
              <Link
                href={`/parent/courses/${course.id}`}
                className="flex items-center justify-between gap-3 bg-white border border-violet-100 hover:border-brand rounded-2xl p-4 transition-colors"
              >
                <span className="min-w-0">
                  <span className="block font-bold text-gray-800 truncate">
                    {course.courseTitle ?? "Untitled course"}
                  </span>
                  <span className="block text-xs text-gray-500 truncate">
                    with {course.teacherName}
                    {course.grade ? ` · Grade ${course.grade}` : ""}
                  </span>
                </span>
                <ArrowRight size={16} className="text-brand flex-shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-3">
        <Link href="/parent/courses" className={primaryBtn}>
          {routing.remainingFreeDemos > 0 ? "Use another free demo" : "Browse courses"}
        </Link>
        {routing.offerComplaint && (
          <Link href="/parent/complain" className={ghostBtn}>
            <LifeBuoy size={14} />
            Raise a complaint
          </Link>
        )}
      </div>
    </div>
  );
}
