"use client";

import { ExternalLink, FileText, Link as LinkIcon } from "lucide-react";

import { adminBtn } from "@/features/admin/components/ui/adminStyles";
import {
  AdminDataTable,
  AdminEmptyState,
  AdminErrorNote,
  AdminHead,
  AdminIconTitle,
  AdminListMeta,
  AdminLoadingState,
  AdminStack,
} from "@/features/admin/components/ui/design";
import { formatAdminDate } from "@/features/admin/components/ui/primitives";
import { useAdminResources, type AdminResource } from "@/features/admin/hooks/useResources";
import { displayName } from "@/features/shared/utils/displayName";

const resourceHref = (r: AdminResource) => (r.type === "LINK" ? r.externalUrl : r.fileUrl);

/**
 * Admin oversight of the Resource Library (design 23): every resource shared
 * on the platform, newest first, with who shared it and who it belongs to.
 * Read-only: a Teacher's own delete button is the only edit path.
 * Data comes from `GET /api/admin/resources` (verified Admin auth).
 */
export default function AdminResourcesPage() {
  const { resources, loading, error } = useAdminResources();

  return (
    <AdminStack>
      <AdminHead
        crumbs={[{ label: "Overview", href: "/admin" }, { label: "Records" }]}
        title="Resource library"
        description="Everything shared by a teacher with a student, across every course. Read-only: only the teacher who shared a resource can delete it."
      />

      <AdminListMeta left="Newest first" right={`${resources.length} shared`} />

      <AdminErrorNote>{error}</AdminErrorNote>

      {loading ? (
        <AdminLoadingState />
      ) : resources.length === 0 ? (
        !error && (
          <AdminEmptyState title="Nothing shared yet" message="Resources teachers share will appear here." />
        )
      ) : (
        <AdminDataTable
          rows={resources}
          rowKey={(r) => r.id}
          columns={[
            {
              label: "Resource",
              block: true,
              render: (r) => (
                <AdminIconTitle
                  icon={r.type === "LINK" ? <LinkIcon size={20} /> : <FileText size={20} />}
                  title={r.title}
                  meta={r.type === "LINK" ? "Link" : "File"}
                />
              ),
            },
            {
              label: "Course",
              render: (r) => r.enrollment.course.courseTitle || r.enrollment.course.subject || "—",
            },
            { label: "Shared by (teacher)", render: (r) => displayName(r.teacher) },
            {
              label: "To (student, parent)",
              render: (r) => (
                <>
                  <b className="block font-semibold">{displayName(r.student)}</b>
                  <small className="block text-xs text-pd-ink3">Parent: {displayName(r.parent)}</small>
                </>
              ),
            },
            { label: "Shared", nowrap: true, render: (r) => formatAdminDate(r.createdAt) },
            {
              label: "Link",
              right: true,
              block: true,
              render: (r) => {
                const href = resourceHref(r);

                return href ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Open ${r.title}`}
                    className={adminBtn("out", "sm")}
                  >
                    Open
                    <ExternalLink size={14} aria-hidden="true" />
                  </a>
                ) : (
                  "—"
                );
              },
            },
          ]}
        />
      )}
    </AdminStack>
  );
}
