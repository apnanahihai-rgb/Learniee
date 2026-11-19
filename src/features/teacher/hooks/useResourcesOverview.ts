"use client";

import { useCallback, useEffect, useState } from "react";

import { useAutoRefresh } from "@/features/shared/hooks/useAutoRefresh";
import { isBackgroundRefresh } from "@/lib/refreshBus";
import { uploadFileToS3 } from "@/lib/uploadFileToS3";

export interface ResourceOverviewItem {
  id: string;
  enrollmentId: string;
  title: string;
  description: string | null;
  type: "FILE" | "LINK";
  fileName: string | null;
  fileUrl: string | null;
  externalUrl: string | null;
  createdAt: string;
  studentName: string;
  courseId: string;
  courseTitle: string | null;
  subject: string | null;
}

export interface ShareResourceInput {
  enrollmentIds: string[];
  title: string;
  description?: string;
  externalUrl?: string;
  file?: File | null;
}

/** All resources this teacher shared (every course/student) + share and delete. */
export function useResourcesOverview() {
  const [resources, setResources] = useState<ResourceOverviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      if (!isBackgroundRefresh()) setLoading(true);

      const res = await fetch("/api/teacher/resources/overview", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to load resources.");

      setResources(data.resources ?? []);
      setError("");
    } catch (err) {
      console.error("Load resources overview error:", err);
      setError(err instanceof Error ? err.message : "Failed to load resources.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useAutoRefresh(() => load(), { paths: ["/api/teacher/resources"] });

  /** Resources are stored per student, so sharing with a course is one POST per enrollment. */
  async function share(input: ShareResourceInput): Promise<{ ok: boolean; message?: string }> {
    try {
      const isLink = !input.file && Boolean(input.externalUrl?.trim());

      if (!isLink && !input.file) {
        return { ok: false, message: "Add a file or a link." };
      }

      const fileKey = input.file
        ? await uploadFileToS3({ file: input.file, folder: "resources" })
        : undefined;

      const results = await Promise.allSettled(
        input.enrollmentIds.map(async (enrollmentId) => {
          const res = await fetch("/api/teacher/resources", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              enrollmentId,
              title: input.title,
              description: input.description || undefined,
              type: isLink ? "LINK" : "FILE",
              fileKey,
              fileName: input.file?.name,
              externalUrl: isLink ? input.externalUrl?.trim() : undefined,
            }),
          });
          const data = await res.json();

          if (!res.ok) throw new Error(data.error || "Failed to share resource.");
        }),
      );

      await load();

      const failed = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];

      if (failed.length === results.length) {
        return { ok: false, message: failed[0].reason?.message || "Failed to share resource." };
      }

      if (failed.length > 0) {
        return {
          ok: true,
          message: `Shared with ${results.length - failed.length} of ${results.length} students.`,
        };
      }

      return { ok: true };
    } catch (err) {
      console.error("Share resource error:", err);
      return { ok: false, message: err instanceof Error ? err.message : "Failed to share resource." };
    }
  }

  async function remove(resourceId: string): Promise<{ ok: boolean; message?: string }> {
    try {
      const res = await fetch(`/api/teacher/resources/${resourceId}`, { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to delete resource.");

      await load();
      return { ok: true };
    } catch (err) {
      console.error("Delete resource error:", err);
      return { ok: false, message: err instanceof Error ? err.message : "Failed to delete resource." };
    }
  }

  return { resources, loading, error, share, remove, reload: load };
}
