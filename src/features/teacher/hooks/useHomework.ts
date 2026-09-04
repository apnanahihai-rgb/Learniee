"use client";

import { useEffect, useState } from "react";

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

/** Teacher-side homework list + actions for one enrollment. */
export function useTeacherHomework(enrollmentId: string) {
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (enrollmentId) load();
  }, [enrollmentId]);

  async function load() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`/api/teacher/homework?enrollmentId=${enrollmentId}`);
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

  async function create(input: {
    title: string;
    instructions?: string;
    attachmentKey?: string;
    dueDate?: string;
  }) {
    setError("");

    const res = await fetch("/api/teacher/homework", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enrollmentId, ...input }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Failed to assign homework.");
      return false;
    }

    await load();
    return true;
  }

  async function remove(homeworkId: string) {
    setError("");

    const res = await fetch(`/api/teacher/homework/${homeworkId}`, { method: "DELETE" });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Failed to delete homework.");
      return false;
    }

    await load();
    return true;
  }

  async function review(homeworkId: string, feedback?: string) {
    setError("");

    const res = await fetch(`/api/teacher/homework/${homeworkId}/review`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feedback }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Failed to review submission.");
      return false;
    }

    await load();
    return true;
  }

  return { homeworks, loading, error, create, remove, review, reload: load };
}
