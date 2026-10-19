"use client";

import { useCallback, useEffect, useState } from "react";

import type {
  DemoFitValue,
  DemoIntentValue,
  DemoRatingValue,
  DemoReasonValue,
  DemoSurveyOutcomeValue,
} from "@/features/shared/utils/demoSurvey";

export interface DemoSurveyBooking {
  id: string;
  scheduledAt: string | null;
  subject: string;
  student: { id: string; firstName: string; visibleName: string | null };
  teacher: { id: string; firstName: string; lastName: string; visibleName: string | null };
  course: { id: string; courseTitle: string | null };
}

export interface DemoSurveyState {
  booking: DemoSurveyBooking;
  ended: boolean;
  submitted: boolean;
  outcome: DemoSurveyOutcomeValue | null;
}

export interface SimilarCourse {
  id: string;
  courseTitle: string | null;
  subject: string | null;
  grade: string | null;
  price: number | null;
  teacherName: string;
}

export interface DemoSurveyRouting {
  outcome: DemoSurveyOutcomeValue;
  enrollHref: string | null;
  similarCourses: SimilarCourse[];
  remainingFreeDemos: number;
  offerComplaint: boolean;
}

export interface DemoSurveyAnswers {
  overall: DemoRatingValue;
  levelFit: DemoFitValue;
  intent: DemoIntentValue;
  reason?: DemoReasonValue | null;
}

/** Loads one demo's survey and submits the answers (once). */
export function useDemoSurvey(bookingId: string) {
  const [survey, setSurvey] = useState<DemoSurveyState | null>(null);
  const [routing, setRouting] = useState<DemoSurveyRouting | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`/api/parent/demo-feedback/${bookingId}`, { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load the survey.");
      }

      setSurvey({
        booking: data.booking,
        ended: data.ended,
        submitted: data.submitted,
        outcome: data.outcome,
      });
    } catch (err) {
      console.error("Load demo survey error:", err);
      setError(err instanceof Error ? err.message : "Failed to load the survey.");
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = useCallback(
    async (answers: DemoSurveyAnswers) => {
      try {
        setSubmitting(true);
        setError("");

        const res = await fetch(`/api/parent/demo-feedback/${bookingId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(answers),
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to save your answers.");
        }

        setRouting(data.routing);
        setSurvey((current) =>
          current ? { ...current, submitted: true, outcome: data.routing.outcome } : current,
        );

        return true;
      } catch (err) {
        console.error("Submit demo survey error:", err);
        setError(err instanceof Error ? err.message : "Failed to save your answers.");

        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [bookingId],
  );

  return { survey, routing, loading, submitting, error, submit };
}
