"use client";

import { useState } from "react";
import { ArrowUpRight, FileText, Plus } from "lucide-react";

import ErrorBanner from "@/features/shared/components/ErrorBanner";
import {
  PD_BTN_DTXT_SM,
  PD_BTN_PRI_SM,
  PD_BTN_SEC_SM,
  PdEmpty,
} from "@/features/parent/components/courses/pdUi";
import { useTeacherEnrollments } from "@/features/teacher/hooks/useEnrollments";
import {
  useResourcesOverview,
  type ResourceOverviewItem,
} from "@/features/teacher/hooks/useResourcesOverview";
import ShareResourceDialog from "./ShareResourceDialog";
import { ActionBar, ConfirmDialog, TD_ROW, dShort, useNotice } from "./TeacherUi";

/** My classes > Resources: files and links shared with students, with Delete for corrections. */
export default function ResourcesTab() {
  const { resources, loading, error, share, remove } = useResourcesOverview();
  const { enrollments } = useTeacherEnrollments();
  const [sharing, setSharing] = useState(false);
  const [deleting, setDeleting] = useState<ResourceOverviewItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const notice = useNotice();

  async function confirmDelete() {
    if (!deleting) return;

    setBusy(true);
    setDeleteError("");

    const result = await remove(deleting.id);

    setBusy(false);

    if (result.ok) {
      setDeleting(null);
      notice.show("Resource deleted");
    } else {
      setDeleteError(result.message ?? "Failed to delete resource.");
    }
  }

  return (
    <div>
      <ActionBar
        text="Share a file or link with one course. Parents are notified."
        action={
          <button type="button" className={PD_BTN_PRI_SM} onClick={() => setSharing(true)}>
            <Plus size={14} />
            Share resource
          </button>
        }
      />
      {notice.node}
      {error && <div className="mt-3"><ErrorBanner>{error}</ErrorBanner></div>}

      <div className="mt-3 overflow-hidden rounded-2xl border border-pd-line bg-white">
        {loading ? (
          <div aria-busy="true" aria-label="Loading" className="h-[160px] animate-pulse bg-[#eeeaf7]" />
        ) : resources.length === 0 ? (
          <PdEmpty icon={FileText} title="Nothing shared" text="Resources you share appear here." />
        ) : (
          resources.map((r) => {
            const isLink = r.type === "LINK";
            const href = isLink ? r.externalUrl : r.fileUrl;

            return (
              <article key={r.id} className={`${TD_ROW} gap-3.5 py-3.5`}>
                <span
                  className={`grid size-11 shrink-0 place-items-center rounded-xl ${
                    isLink ? "bg-[#e8f1fd] text-[#1d4ed8]" : "bg-pd-b50 text-pd-brand"
                  }`}
                >
                  {isLink ? <ArrowUpRight size={20} /> : <FileText size={20} />}
                </span>

                <div className="min-w-0 flex-1 basis-[200px]">
                  <b className="block text-[15px] font-semibold text-pd-ink">{r.title}</b>
                  <small className="block truncate text-xs text-pd-ink3">
                    {r.courseTitle ?? r.subject ?? "Course"} · {r.studentName} · {dShort(r.createdAt)}
                  </small>
                  {r.description && <p className="mt-1 line-clamp-2 text-sm text-pd-ink2">{r.description}</p>}
                </div>

                <div className="flex items-center gap-1">
                  {href && (
                    <a href={href} target="_blank" rel="noopener noreferrer" className={PD_BTN_SEC_SM}>
                      Open
                    </a>
                  )}
                  <button type="button" className={PD_BTN_DTXT_SM} onClick={() => { setDeleteError(""); setDeleting(r); }}>
                    Delete
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>

      {sharing && (
        <ShareResourceDialog
          enrollments={enrollments}
          onClose={() => setSharing(false)}
          onShare={async (input) => {
            const result = await share(input);
            if (result.ok) notice.show(result.message ?? "Shared — parents notified");
            return result;
          }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete resource?"
          confirmLabel="Delete"
          danger
          busy={busy}
          error={deleteError}
          onConfirm={confirmDelete}
          onClose={() => setDeleting(null)}
        >
          “{deleting.title}” will be removed for {deleting.studentName}.
        </ConfirmDialog>
      )}
    </div>
  );
}
