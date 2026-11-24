"use client";

import { useState } from "react";

import AdminReasonDialog from "@/features/admin/components/ui/AdminReasonDialog";
import { adminBtn, adminTag } from "@/features/admin/components/ui/adminStyles";
import {
  AdminDataTable,
  AdminEmptyState,
  AdminErrorNote,
  AdminHead,
  AdminLoadingState,
  AdminStack,
  AdminStats,
} from "@/features/admin/components/ui/design";
import { useTeacherStrikes, type AdminTeacherStrike } from "@/features/admin/hooks/useTeacherStrikes";
import { usePdToast } from "@/features/parent/components/courses/usePdToast";
import { formatPlatformTime } from "@/lib/platformTime";

const REASON_LABEL: Record<AdminTeacherStrike["reason"], string> = {
  TEACHER_NO_SHOW: "Teacher no-show",
  TEACHER_CANCELLED: "Teacher cancelled",
};

function at(iso: string | null) {
  return iso ? formatPlatformTime(new Date(iso), true) : "—";
}

export default function AdminTeacherStrikesPage() {
  // Data: GET /api/admin/teacher-strikes, waiver: POST
  // /api/admin/teacher-strikes/[strikeId] (verified Admin auth, reason
  // 5 to 500 characters, Activity Log entry, live refresh).
  const { strikes, loading, error, waive } = useTeacherStrikes();
  const [showWaived, setShowWaived] = useState(false);
  const [waiving, setWaiving] = useState<AdminTeacherStrike | null>(null);
  const { toast, toastNode } = usePdToast();

  const active = strikes.filter((s) => !s.waivedAt);
  const visible = showWaived ? strikes : active;

  // Active strikes per teacher, for the tag under each name.
  const activeCount = new Map<string, number>();

  for (const s of active) activeCount.set(s.teacherId, (activeCount.get(s.teacherId) ?? 0) + 1);

  return (
    <AdminStack>
      <AdminHead
        crumbs={[{ label: "Overview", href: "/admin" }, { label: "Classes and safety" }]}
        title="Teacher strikes"
        description={`${active.length} active strike${active.length === 1 ? "" : "s"}. Waive one for a good reason, for example an emergency, and it stops counting.`}
        actions={
          <button
            type="button"
            aria-pressed={showWaived}
            onClick={() => setShowWaived((value) => !value)}
            className={`${adminBtn("out")}`}
          >
            {showWaived ? "Hide waived" : "Show waived too"}
          </button>
        }
      />

      <AdminStats
        items={[
          { label: "Active", value: active.length },
          { label: "Waived", value: strikes.length - active.length },
        ]}
      />

      <AdminErrorNote>{error}</AdminErrorNote>

      {loading ? (
        <AdminLoadingState message="Loading strikes…" />
      ) : visible.length === 0 ? (
        <AdminEmptyState message="No strikes to show." />
      ) : (
        <AdminDataTable
          rows={visible}
          rowKey={(s) => s.id}
          columns={[
            {
              label: "Teacher",
              block: true,
              render: (s) => {
                const count = activeCount.get(s.teacherId) ?? 0;

                return (
                  <div className="flex flex-col items-start gap-0.5">
                    <b className="font-semibold">{s.teacherName}</b>
                    <span className={adminTag(count > 0 ? "amber" : "gray")}>{count} active</span>
                  </div>
                );
              },
            },
            {
              label: "What happened",
              render: (s) => (
                <div className="text-left">
                  <b className="font-semibold">{REASON_LABEL[s.reason]}</b>
                  {s.courseTitle && <small className="block text-xs text-pd-ink3">{s.courseTitle}</small>}
                  {s.waivedAt && (
                    <small className="block text-xs text-pd-ink3">
                      Waived {at(s.waivedAt)}
                      {s.waivedByName ? ` by ${s.waivedByName}` : ""}: {s.waiveReason}
                    </small>
                  )}
                </div>
              ),
            },
            { label: "Class time", nowrap: true, render: (s) => at(s.classStartsAt) },
            { label: "Recorded", nowrap: true, render: (s) => at(s.recordedAt) },
            {
              label: "Action",
              right: true,
              block: true,
              render: (s) =>
                s.waivedAt ? (
                  <span className={adminTag("gray")}>Waived</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setWaiving(s)}
                    aria-label={`Waive strike for ${s.teacherName}`}
                    className={adminBtn("pri", "sm")}
                  >
                    Waive
                  </button>
                ),
            },
          ]}
        />
      )}

      {waiving && (
        <AdminReasonDialog
          title="Waive this strike"
          description={`Waiving ${waiving.teacherName}’s strike keeps it on record but it stops counting.`}
          confirmLabel="Waive strike"
          onCancel={() => setWaiving(null)}
          onSubmit={async (reason) => {
            const result = await waive(waiving.id, reason);

            if (!result.ok) return result.error ?? "Failed to waive this strike.";

            setWaiving(null);
            toast("Strike waived");

            return null;
          }}
        />
      )}

      {toastNode}
    </AdminStack>
  );
}
