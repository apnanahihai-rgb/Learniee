"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import DemoSurveyForm from "@/features/parent/components/demo-survey/DemoSurveyForm";
import DemoSurveyResult from "@/features/parent/components/demo-survey/DemoSurveyResult";
import { useDemoSurvey } from "@/features/parent/hooks/useDemoSurvey";

/**
 * Post-demo survey (/parent/demo-feedback/[bookingId]). Reached from the
 * "How was the demo?" notification, the dashboard next-step card, or a
 * one-time redirect from the dashboard. Three taps, then routed by
 * outcome (see DemoSurveyResult).
 */
export default function DemoFeedbackPage() {
  const params = useParams<{ bookingId: string }>();
  const { survey, routing, loading, submitting, error, submit } = useDemoSurvey(
    params.bookingId,
  );

  const teacher = survey?.booking.teacher;
  const teacherName = teacher
    ? teacher.visibleName || `${teacher.firstName} ${teacher.lastName}`.trim()
    : "your teacher";

  return (
    <div className="max-w-xl mx-auto p-4 sm:p-8">
      <Link
        href="/parent"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-5"
      >
        <ArrowLeft size={16} /> Back to dashboard
      </Link>

      <div className="bg-white border border-violet-100 rounded-3xl shadow-sm p-5 sm:p-8">
        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-6 w-2/3 bg-violet-100 rounded-full" />
            <div className="h-24 bg-violet-50 rounded-2xl" />
          </div>
        ) : !survey ? (
          <p className="text-red-600 text-sm">{error || "This demo couldn't be found."}</p>
        ) : routing ? (
          <DemoSurveyResult routing={routing} teacherName={teacherName} />
        ) : survey.submitted ? (
          <div>
            <h2 className="font-heading text-xl font-bold text-gray-800 mb-1">
              Thanks — you&apos;ve already answered
            </h2>
            <p className="text-sm text-gray-500 mb-5">
              Your feedback for this demo is saved.
            </p>
            <Link href="/parent" className="text-sm font-semibold text-brand underline">
              Back to dashboard
            </Link>
          </div>
        ) : !survey.ended ? (
          <div>
            <h2 className="font-heading text-xl font-bold text-gray-800 mb-1">
              The demo hasn&apos;t ended yet
            </h2>
            <p className="text-sm text-gray-500">
              This survey opens as soon as the demo is over.
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs font-bold uppercase tracking-wider text-brand mb-1">
              {survey.booking.course.courseTitle ?? "Demo"} · {teacherName}
            </p>
            <h1 className="font-heading text-xl sm:text-2xl font-bold text-gray-800 mb-6">
              How was the demo?
            </h1>
            <DemoSurveyForm submitting={submitting} error={error} onSubmit={submit} />
          </>
        )}
      </div>
    </div>
  );
}
