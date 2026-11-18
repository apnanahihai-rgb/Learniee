"use client";

import { useEffect, useMemo, useState } from "react";

import { useTeacherCourses } from "@/features/courses/hooks/useTeacherCourses";
import type { AttentionItem } from "@/features/parent/components/home/homeLogic";
import { displayNameFor } from "@/features/shared/types/rescheduleRequest";
import { isPendingOnViewer } from "@/features/shared/utils/rescheduleStatus";
import { useBankAccount } from "@/features/teacher/hooks/useBankAccount";
import { useTeacherCalendar } from "@/features/teacher/hooks/useCalendar";
import { useTeacherDemoBookings } from "@/features/teacher/hooks/useDemoBookings";
import { useTeacherEnrollments } from "@/features/teacher/hooks/useEnrollments";
import { useProfile } from "@/features/teacher/hooks/useProfile";
import { useTeacherRescheduleRequests } from "@/features/teacher/hooks/useRescheduleRequests";
import { useTeacherCertificates } from "@/features/teacher/hooks/useTeacherCertificates";
import { useTeacherEarnings } from "@/features/teacher/hooks/useTeacherEarnings";
import {
  defaultEnd,
  parseLocalSlot,
} from "@/features/teacher/components/home/teacherHomeLogic";
import type {
  TeacherHomeCourse,
  TeacherHomeData,
  TeacherHomeEarnings,
  TeacherHomeSession,
} from "@/features/teacher/components/home/teacherHomeTypes";

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const first = (name: string) => name.split(" ")[0];

/** Number of the teacher's own blog posts (for the "write your first post" setup step). */
function useBlogPostCount() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/teacher/blogs")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d && Array.isArray(d.posts)) setCount(d.posts.length);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return count;
}

/**
 * Everything the redesigned Teacher Home shows, assembled from the hooks the
 * other teacher pages already use (so the numbers never drift from them).
 * No new endpoints: anything that still needs one (e.g. a homework-to-review
 * count) is left out until the backend step.
 */
export function useTeacherHome() {
  // Today's and this week's classes can cross into next month, so load both.
  const months = useMemo(() => {
    const d = new Date();
    return [monthKey(d), monthKey(new Date(d.getFullYear(), d.getMonth() + 1, 1))];
  }, []);

  const profileQ = useProfile();
  const coursesQ = useTeacherCourses();
  const enrollQ = useTeacherEnrollments();
  const calA = useTeacherCalendar(months[0]);
  const calB = useTeacherCalendar(months[1]);
  const demosQ = useTeacherDemoBookings();
  const reschedQ = useTeacherRescheduleRequests();
  const certsQ = useTeacherCertificates();
  const earnQ = useTeacherEarnings();
  const bankQ = useBankAccount();
  const blogCount = useBlogPostCount();

  const { profile } = profileQ;
  const { enrollments } = enrollQ;

  const data = useMemo<TeacherHomeData>(() => {
    const active = enrollments.filter((e) => e.status === "ACTIVE" || e.status === "LAPSED");
    const review = enrollments.filter((e) => e.status === "PENDING_TEACHER_APPROVAL");

    const nameOf = (s: { firstName: string; visibleName: string | null }) =>
      s.visibleName || s.firstName;
    const studentNames = Array.from(new Set(enrollments.map((e) => nameOf(e.student))));
    const activeStudentCount = new Set(active.map((e) => e.student.id)).size;

    /* ---- sessions: classes + confirmed demos ---- */
    const seen = new Set<string>();
    const sessions: TeacherHomeSession[] = [];

    for (const o of [...calA.occurrences, ...calB.occurrences]) {
      if (o.status !== "SCHEDULED" || seen.has(o.id)) continue;
      seen.add(o.id);
      const start = o.startsAt ? new Date(o.startsAt) : parseLocalSlot(o.date, o.time);
      sessions.push({
        id: o.id,
        kind: "class",
        title: o.courseTitle || o.subject || "Class",
        studentName: o.studentName,
        courseId: o.courseId,
        subject: o.subject,
        start,
        end: o.endsAt ? new Date(o.endsAt) : defaultEnd(start),
        href: `/teacher/classes/${o.id}/start`,
      });
    }

    for (const b of demosQ.bookings) {
      if (b.status !== "CONFIRMED" || !b.scheduledAt) continue;
      const start = new Date(b.scheduledAt);
      sessions.push({
        id: `demo-${b.id}`,
        kind: "demo",
        title: `Demo: ${b.course.courseTitle || "Demo session"}`,
        studentName: nameOf(b.student),
        courseId: b.course.id,
        subject: b.subject,
        start,
        end: b.joinWindow?.closesAt ? new Date(b.joinWindow.closesAt) : defaultEnd(start),
        href: "/teacher/demo",
        demo: { bookingId: b.id, joinWindow: b.joinWindow },
      });
    }
    sessions.sort((a, b) => a.start.getTime() - b.start.getTime());

    /* ---- courses ---- */
    const courses: TeacherHomeCourse[] = coursesQ.courses.map((c) => {
      const mine = active.filter((e) => e.course.id === c.id);
      const progress = mine.length
        ? Math.round(
            (mine.reduce(
              (n, e) => n + (e.sessionsPerMonth ? e.sessionsCompletedInCycle / e.sessionsPerMonth : 0),
              0,
            ) /
              mine.length) *
              100,
          )
        : 0;
      return {
        id: c.id,
        title: c.courseTitle || "Untitled course",
        subject: c.subject,
        grade: c.grade,
        price: c.price ? Number(c.price) : null,
        approved: c.status === "APPROVED",
        activeStudents: mine.length,
        progress: Math.min(100, progress),
      };
    });

    /* ---- needs your attention ---- */
    const attention: AttentionItem[] = [];

    if (review.length) {
      attention.push({
        key: "review",
        priority: 1,
        title: `${review.length} enrollment${review.length > 1 ? "s" : ""} waiting for your review`,
        sub: `${review.map((e) => first(nameOf(e.student))).join(", ")} · approve, propose a change or reject.`,
        button: "Review",
        href: "/teacher/requests?tab=enrollments",
        primary: true,
        tone: "amber",
      });
    }

    const pendingResched = reschedQ.requests.filter((r) => isPendingOnViewer(r, "TEACHER"));
    if (pendingResched.length) {
      attention.push({
        key: "reschedule",
        priority: 2,
        title: "Reschedule needs your response",
        sub: `${displayNameFor(pendingResched[0].parent)} asked to move a class.`,
        button: "Respond",
        href: "/teacher/requests?tab=reschedules",
        tone: "amber",
      });
    }

    if (certsQ.eligible.length) {
      attention.push({
        key: "certificate",
        priority: 4,
        title:
          certsQ.eligible.length > 1
            ? `${certsQ.eligible.length} certificates are ready to issue`
            : "A certificate is ready to issue",
        sub: `${first(certsQ.eligible[0].studentName)} completed all sessions. Your decision is final.`,
        button: "Decide",
        href: "/teacher/my-classes?tab=certificates",
        tone: "violet",
      });
    }

    /* ---- earnings ---- */
    const ledger = earnQ.ledgerEntries;
    const OUTSTANDING = ["PROCESSING", "QUEUED_FOR_PAYMENT", "APPROVED"];
    const earnings: TeacherHomeEarnings = {
      paid: ledger.filter((e) => e.payoutStatus === "PAID").reduce((n, e) => n + e.monthlyTeacherPay, 0),
      onTheWay: ledger
        .filter((e) => OUTSTANDING.includes(e.payoutStatus))
        .reduce((n, e) => n + e.monthlyTeacherPay, 0),
      rows: ledger
        .filter((e) => OUTSTANDING.includes(e.payoutStatus))
        .slice(0, 4)
        .map((e) => ({
          id: e.id,
          name: e.childName,
          cycle: e.cycleNumber,
          processing: e.payoutStatus === "PROCESSING",
          amount: e.monthlyTeacherPay,
        })),
    };

    /* ---- finish-setup card ---- */
    const steps = [
      { label: "Add your bank account", done: !!bankQ.bankAccount, href: "/teacher/earnings?tab=bank" },
      {
        label: "Complete your profile",
        done: !!(profile?.aboutMe?.trim() && profile.phone?.trim() && profile.city?.trim() && profile.address?.trim()),
        href: "/teacher/account?tab=profile",
      },
      { label: "Write your first blog post", done: (blogCount ?? 0) > 0, href: "/teacher/blogs" },
    ];
    const left = steps.filter((s) => !s.done);
    // Hold the card back until its inputs have loaded so it never flashes the wrong step.
    const setupReady = !bankQ.loading && !profileQ.loading && blogCount !== null;
    const setup =
      setupReady && left.length
        ? { href: left[0].href, done: steps.length - left.length, total: steps.length, nextLabel: left[0].label }
        : null;

    return {
      firstName: profile?.visibleName?.trim().split(" ")[0] || profile?.firstName || "",
      sessions,
      courses,
      studentNames,
      activeStudentCount,
      reviewCount: review.length,
      attention,
      earnings,
      setup,
      meetEnabled: demosQ.meetEnabled,
    };
  }, [
    enrollments,
    calA.occurrences,
    calB.occurrences,
    demosQ.bookings,
    demosQ.meetEnabled,
    coursesQ.courses,
    reschedQ.requests,
    certsQ.eligible,
    earnQ.ledgerEntries,
    bankQ.bankAccount,
    bankQ.loading,
    profile,
    profileQ.loading,
    blogCount,
  ]);

  // Only the data the hero / stats / courses cannot render without blocks the page.
  const loading = enrollQ.loading || calA.loading || coursesQ.loading;
  const error = enrollQ.error || calA.error || coursesQ.error || "";

  const reload = () => {
    enrollQ.reload();
    coursesQ.reloadCourses();
    calA.reload();
    calB.reload();
  };

  return { data, loading, error, skewMs: demosQ.skewMs, reload };
}
