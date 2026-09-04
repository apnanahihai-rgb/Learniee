"use client";

import { useEffect, useState } from "react";

import { uploadFileToS3 } from "@/lib/uploadFileToS3";

export interface HomeworkSubmission {
  id: string;
  fileKey: string;
  fileUrl: string;
  note: string | null;
  status: "SUBMITTED" | "REVIEWED";
  feedback: string | null;
  submittedAt: string;
  reviewedAt: string | null;
}

export interface Homework {
  id: string;
  title: string;
  instructions: string | null;
  attachmentKey: string | null;
  attachmentUrl: string | null;
  dueDate: string | null;
  createdAt: string;
  submission: HomeworkSubmission | null;
}

/** Parent-side homework list + submit for one enrollment. */
export function useParentHomework(enrollmentId: string) {
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  useEffect(() => {
    if (enrollmentId) load();
  }, [enrollmentId]);

  async function load() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`/api/parent/homework?enrollmentId=${enrollmentId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load homework.");
      }

      setHomeworks(data.homeworks);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Unable to load homework.");
    } finally {
      setLoading(false);
    }
  }

  /** Uploads the file to S3, then submits (or resubmits) it for this homework. */
  async function submit(homeworkId: string, file: File, note?: string) {
    setError("");
    setSubmittingId(homeworkId);

    try {
      const fileKey = await uploadFileToS3({ file, folder: "homework" });

      const res = await fetch(`/api/parent/homework/${homeworkId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileKey, note }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit homework.");
      }

      await load();
      return true;
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to submit homework.");
      return false;
    } finally {
      setSubmittingId(null);
    }
  }

  return { homeworks, loading, error, submit, submittingId, reload: load };
}
