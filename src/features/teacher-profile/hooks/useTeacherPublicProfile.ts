"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useAutoRefresh } from "@/features/shared/hooks/useAutoRefresh";
import { isBackgroundRefresh } from "@/lib/refreshBus";

import type { TeacherPublicProfileResponse } from "../types";

export function useTeacherPublicProfile(teacherId: string) {
  const [data, setData] = useState<TeacherPublicProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Bumped on every load and on cleanup so a slow response for an old
  // teacher (or an unmounted page) is ignored.
  const requestRef = useRef(0);

  const load = useCallback(async () => {
    const request = ++requestRef.current;
    // Silent when run by the live-update refresh: no spinner, and a
    // failed refresh keeps what is already on screen.
    const background = isBackgroundRefresh();

    try {
      if (!background) {
        setLoading(true);
        setError("");
      }

      const res = await fetch(`/api/teacher-profiles/${teacherId}`, { cache: "no-store" });

      if (res.status === 404) throw new Error("This teacher profile isn't available.");
      if (!res.ok) throw new Error("Failed to load the teacher profile.");

      const json = await res.json();

      if (request !== requestRef.current) return;

      setData({ teacher: json.teacher, courses: json.courses ?? [] });
      setError("");
    } catch (err) {
      if (request !== requestRef.current || background) return;
      setData(null);
      setError(err instanceof Error ? err.message : "Unable to load the teacher profile.");
    } finally {
      if (request === requestRef.current) setLoading(false);
    }
  }, [teacherId]);

  useEffect(() => {
    void load();

    return () => {
      requestRef.current += 1;
    };
  }, [load]);

  useAutoRefresh(() => load(), { paths: [`/api/teacher-profiles/${teacherId}`] });

  return { data, loading, error };
}
