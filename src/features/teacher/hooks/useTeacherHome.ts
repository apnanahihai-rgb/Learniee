"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  TeacherHomeData,
  TeacherHomeSession,
} from "@/features/teacher/components/home/teacherHomeTypes";
import type { TeacherHomeDto } from "@/features/teacher/types/home";
import { useAutoRefresh } from "@/features/shared/hooks/useAutoRefresh";
import { isBackgroundRefresh } from "@/lib/refreshBus";

const EMPTY: TeacherHomeData = {
  firstName: "",
  sessions: [],
  courses: [],
  studentNames: [],
  activeStudentCount: 0,
  reviewCount: 0,
  attention: [],
  earnings: { paid: 0, onTheWay: 0, rows: [] },
  setup: null,
  meetEnabled: false,
};

/** API shape (ISO strings) → what the Home components use (`Date`s). */
function toHomeData(dto: TeacherHomeDto): TeacherHomeData {
  const sessions: TeacherHomeSession[] = dto.sessions.map((s) => ({
    id: s.id,
    kind: s.kind,
    title: s.title,
    studentName: s.studentName,
    courseId: s.courseId,
    subject: s.subject,
    start: new Date(s.startsAt),
    end: new Date(s.endsAt),
    href: s.href,
    demo: s.demo,
  }));

  return {
    firstName: dto.firstName,
    sessions,
    courses: dto.courses,
    studentNames: dto.studentNames,
    activeStudentCount: dto.activeStudentCount,
    reviewCount: dto.reviewCount,
    attention: dto.attention,
    earnings: dto.earnings,
    setup: dto.setup,
    meetEnabled: dto.meetEnabled,
  };
}

/**
 * Loads the Teacher Home screen (GET /api/teacher/home) — one request, no
 * client-side assembly. Refetches in the background whenever something it
 * shows changes: classes and sessions, demos, enrollments, reschedules,
 * homework, certificates, earnings, courses, bank account, blogs or profile.
 *
 * `skewMs` is the server clock minus this device's clock, so the "Starts in
 * 12m" countdown and the Join buttons follow the server even if the device
 * clock is wrong.
 */
export function useTeacherHome() {
  const [dto, setDto] = useState<TeacherHomeDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [skewMs, setSkewMs] = useState(0);

  const reload = useCallback(async () => {
    try {
      if (!isBackgroundRefresh()) setLoading(true);
      setError("");

      const res = await fetch("/api/teacher/home", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.home) {
        throw new Error(json.error || "Failed to load your dashboard.");
      }

      const home = json.home as TeacherHomeDto;

      setSkewMs(new Date(home.serverNow).getTime() - Date.now());
      setDto(home);
    } catch (err) {
      console.error("Load teacher home error:", err);
      setError(err instanceof Error ? err.message : "Failed to load your dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  useAutoRefresh(() => reload(), {
    paths: [
      "/api/teacher/home",
      "/api/teacher/calendar",
      "/api/teacher/class-sessions",
      "/api/teacher/enrollments",
      "/api/teacher/course",
      "/api/teacher/demo-bookings",
      "/api/teacher/reschedule-requests",
      "/api/teacher/homework",
      "/api/teacher/certificates",
      "/api/teacher/earnings",
      "/api/teacher/bank-account",
      "/api/teacher/blogs",
      "/api/teacher/profile",
    ],
  });

  const data = useMemo(() => (dto ? toHomeData(dto) : EMPTY), [dto]);

  return { data, loading, error, skewMs, reload };
}
