import { useCallback, useEffect, useState } from "react";

import type { GroupContinueAction } from "@/features/courses/utils/groupContinue";
import { useAutoRefresh } from "@/features/shared/hooks/useAutoRefresh";
import { isBackgroundRefresh } from "@/lib/refreshBus";

export interface GroupContinuePrompt {
  id: string;
  courseId: string;
  courseTitle: string;
  batchStartDate: string;
  batchEndDate: string;
  mustAnswerBy: string;
  overdue: boolean;
  maxStudents: number | null;
  seatsTaken: number;
}

/**
 * The "Continue this group?" questions due for the Teacher (one group when
 * `courseId` is given), and answering them. `answer` returns an error
 * message, or "" on success.
 */
export function useGroupContinue(courseId?: string) {
  const [prompts, setPrompts] = useState<GroupContinuePrompt[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      if (!isBackgroundRefresh()) setLoading(true);

      const query = courseId ? `?courseId=${encodeURIComponent(courseId)}` : "";
      const res = await fetch(`/api/teacher/group-continue${query}`, { cache: "no-store" });
      const data = await res.json();

      if (res.ok) setPrompts(data.prompts ?? []);
    } catch {
      // A banner that can't load just stays hidden; the group page still works.
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    load();
  }, [load]);

  useAutoRefresh(() => load(), { paths: ["/api/teacher/group-continue"] });

  async function answer(
    id: string,
    action: GroupContinueAction,
    maxStudents?: number,
  ): Promise<string> {
    try {
      const res = await fetch(`/api/teacher/group-continue/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, maxStudents }),
      });
      const data = await res.json();

      if (!res.ok) return data.error || "Failed to save your answer.";

      await load();

      return "";
    } catch {
      return "Failed to save your answer.";
    }
  }

  return { prompts, loading, answer, reload: load };
}
