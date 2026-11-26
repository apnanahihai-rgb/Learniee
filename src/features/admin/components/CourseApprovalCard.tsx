"use client";

import { ImageOff } from "lucide-react";
import type { ReactNode } from "react";

import { adminBtn, adminTag } from "@/features/admin/components/ui/adminStyles";
import {
  AdminDecisionBar,
  AdminGoldNote,
  AdminProps,
  AdminReviewCard,
  AdminText,
  AdminTwoCols,
} from "@/features/admin/components/ui/queue";
import type { AdminCourse } from "@/features/admin/types/course";
import { isGroupType } from "@/features/courses/utils/groupClass";

interface Props {
  course: AdminCourse;
  open: boolean;
  onToggle: () => void;
  /** "Waiting N days" tag from the queue. */
  waitingTag?: ReactNode;
  /** True while this course's decision is being saved. */
  busy: boolean;
  onApprove: (courseId: string) => void;
  onReject: (courseId: string) => void;
}

/** One course waiting for approval, as a collapsible review card (Admin design 03). */
export default function CourseApprovalCard({
  course,
  open,
  onToggle,
  waitingTag,
  busy,
  onApprove,
  onReject,
}: Props) {
  const price = course.price ? `₹${course.price}` : "-";
  const group = isGroupType(course.type);

  return (
    <AdminReviewCard
      id={`course-${course.id}`}
      open={open}
      onToggle={onToggle}
      lead={
        <div className="grid h-[62px] w-[84px] shrink-0 place-content-center justify-items-center gap-0.5 overflow-hidden rounded-[10px] border border-dashed border-pd-line2 bg-pd-bg text-center text-[11px] text-pd-ink3">
          {course.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={course.thumbnailUrl}
              alt={course.courseTitle || "Course thumbnail"}
              className="size-full object-cover"
            />
          ) : (
            <>
              <ImageOff size={18} aria-hidden="true" />
              No thumbnail
            </>
          )}
        </div>
      }
      title={course.courseTitle || "Untitled course"}
      meta={`${course.teacher.firstName} ${course.teacher.lastName} · ${course.teacher.email}`}
      keyLabel="Price"
      keyValue={price}
      tags={
        <>
          {waitingTag}
          {group && <span className={adminTag("violet")}>Group class</span>}
          <span className={adminTag("amber")}>Under review</span>
        </>
      }
      footer={
        <AdminDecisionBar>
          <button
            type="button"
            disabled={busy}
            onClick={() => onReject(course.id)}
            className={adminBtn("dtx")}
          >
            Reject course
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onApprove(course.id)}
            className={adminBtn("pri")}
          >
            {busy ? "Saving…" : "Approve course"}
          </button>
        </AdminDecisionBar>
      }
    >
      <AdminProps
        items={[
          { label: "Subject", value: course.subject || "-" },
          { label: "Grade", value: course.grade || "-" },
          { label: "Board", value: course.board || "-" },
          { label: "Type", value: course.type || "-" },
          ...(group
            ? [{ label: "Max students", value: String(course.groupMaxStudents ?? "-") }]
            : []),
          { label: "Duration", value: course.duration || "-" },
          { label: "Language", value: course.language || "-" },
          { label: "Frequency", value: course.frequency || "-" },
          { label: "Price", value: price, highlight: true },
        ]}
      />

      {course.isPriceCustomized && (
        <AdminGoldNote title="Non-standard price">
          The standard rate{course.isIITian ? " (IITian listing)" : ""} is ₹{course.standardPrice} a
          session, but the teacher set ₹{course.price}.
        </AdminGoldNote>
      )}

      {(course.objective || course.description) && (
        <AdminTwoCols>
          {course.objective && <AdminText title="Objective">{course.objective}</AdminText>}
          {course.description && <AdminText title="Description">{course.description}</AdminText>}
        </AdminTwoCols>
      )}
    </AdminReviewCard>
  );
}
