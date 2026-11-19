"use client";

import { useCallback, useEffect, useState } from "react";

import { useAutoRefresh } from "@/features/shared/hooks/useAutoRefresh";
import { isBackgroundRefresh } from "@/lib/refreshBus";
import { uploadFileToS3 } from "@/lib/uploadFileToS3";

export interface HomeworkOverviewItem {
  id: string;
  enrollmentId: string;
  title: string;
  instructions: string | null;
  attachmentUrl: string | null;
  dueDate: string | null;
  createdAt: string;
  studentName: string;
  courseId: string;
  courseTitle: string | null;
  subject: string | null;
  submission: {
    id: string;
    status: "SUBMITTED" | "REVIEWED";
    note: string | null;
    feedback: string | null;
    submittedAt: string;
    reviewedAt: string | null;
    fileUrl: string;
  } | null;
}

export interface AssignHomeworkInput {
  enrollmentIds: string[];
  title: string;
  instructions?: string;
  dueDate?: string;
  file?: File | null;
}

/** All homework this teacher assigned (every course/student) + assign, review, delete. */
export function useHomeworkOverview() {
  const [homeworks, setHomeworks] = useState<HomeworkOverviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      if (!isBackgroundRefresh()) setLoading(true);

      const res = await fetch("/api/teacher/homework/overview", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to load homework.");

      setHomeworks(data.homeworks ?? []);
      setError("");
    } catch (err) {
      console.error("Load homework overview error:", err);
      setError(err instanceof Error ? err.message : "Failed to load homework.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useAutoRefresh(() => load(), { paths: ["/api/teacher/homework"] });

  /** Homework is stored per student, so a course-wide assignment is one POST per enrollment. */
  async function assign(input: AssignHomeworkInput): Promise<{ ok: boolean; message?: string }> {
    try {
      const attachmentKey = input.file
        ? await uploadFileToS3({ file: input.file, folder: "homework" })
        : undefined;

      const results = await Promise.allSettled(
        input.enrollmentIds.map(async (enrollmentId) => {
          const res = await fetch("/api/teacher/homework", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              enrollmentId,
              title: input.title,
              instructions: input.instructions || undefined,
              dueDate: input.dueDate || undefined,
              attachmentKey,
            }),
          });
          const data = await res.json();

          if (!res.ok) throw new Error(data.error || "Failed to assign homework.");
        }),
      );

      await load();

      const failed = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];

      if (failed.length === results.length) {
        return { ok: false, message: failed[0].reason?.message || "Failed to assign homework." };
      }

      if (failed.length > 0) {
        return {
          ok: true,
          message: `Assigned to ${results.length - failed.length} of ${results.length} students.`,
        };
      }

      return { ok: true };
    } catch (err) {
      console.error("Assign homework error:", err);
      return { ok: false, message: err instanceof Error ? err.message : "Failed to assign homework." };
    }
  }

  async function review(homeworkId: string, feedback?: string): Promise<{ ok: boolean; message?: string }> {
    try {
      const res = await fetch(`/api/teacher/homework/${homeworkId}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback: feedback || undefined }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to mark as reviewed.");

      await load();
      return { ok: true };
    } catch (err) {
      console.error("Review homework error:", err);
      return { ok: false, message: err instanceof Error ? err.message : "Failed to mark as reviewed." };
    }
  }

  return { homeworks, loading, error, assign, review, reload: load };
}
