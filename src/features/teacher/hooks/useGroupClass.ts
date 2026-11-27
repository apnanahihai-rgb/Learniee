import { useCallback, useEffect, useState } from "react";

import { useAutoRefresh } from "@/features/shared/hooks/useAutoRefresh";
import { isBackgroundRefresh } from "@/lib/refreshBus";

export interface GroupStudent {
  enrollmentId: string;
  chatRoomId: string | null;
  studentName: string;
}

export interface GroupAnnouncement {
  id: string;
  body: string;
  createdAt: string;
}

/** One Teacher group class: students, recent announcements, and sending a new announcement. */
export function useGroupClass(courseId: string) {
  const [title, setTitle] = useState("");
  const [students, setStudents] = useState<GroupStudent[]>([]);
  const [announcements, setAnnouncements] = useState<GroupAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      if (!isBackgroundRefresh()) setLoading(true);
      setError("");

      const res = await fetch(`/api/teacher/group-classes/${courseId}`, { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to load the group class.");

      setTitle(data.course?.title ?? "");
      setStudents(data.students ?? []);
      setAnnouncements(data.announcements ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load the group class.");
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    load();
  }, [load]);

  useAutoRefresh(() => load(), { paths: [`/api/teacher/group-classes/${courseId}`] });

  /** Returns an error message, or "" on success. */
  async function broadcast(body: string): Promise<string> {
    try {
      const res = await fetch(`/api/teacher/group-classes/${courseId}/broadcast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await res.json();

      if (!res.ok) return data.error || "Failed to send the announcement.";

      await load();

      return "";
    } catch {
      return "Failed to send the announcement.";
    }
  }

  return { title, students, announcements, loading, error, broadcast, reload: load };
}
