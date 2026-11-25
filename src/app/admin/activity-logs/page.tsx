"use client";

import { useState, type FormEvent } from "react";
import { Download } from "lucide-react";

import { ADMIN_CARD, ADMIN_CONTROL, adminBtn, adminTag } from "@/features/admin/components/ui/adminStyles";
import {
  AdminDataTable,
  AdminEmptyState,
  AdminErrorNote,
  AdminField,
  AdminHead,
  AdminLoadingState,
  AdminPagination,
  AdminStack,
} from "@/features/admin/components/ui/design";
import {
  EMPTY_FILTERS,
  useActivityLogs,
  type ActivityLogFiltersState,
} from "@/features/admin/hooks/useActivityLogs";
import {
  actorRoleLabel,
  activityTagColor,
  formatActivityDateTime,
} from "@/features/admin/utils/activityLog";

/**
 * Admin Activity log (design 24): major platform events, filterable and
 * exportable. Data comes from `GET /api/admin/activity-logs` (verified
 * Admin auth) and the CSV from `/api/admin/activity-logs/export`.
 * Filters only apply on "Apply filters" (or Enter), not on every keystroke.
 */
export default function AdminActivityLogsPage() {
  const {
    filters,
    applyFilters,
    resetFilters,
    page,
    setPage,
    totalPages,
    total,
    filterOptions,
    items,
    loading,
    error,
    downloadUrl,
  } = useActivityLogs();

  const [draft, setDraft] = useState<ActivityLogFiltersState>(filters);

  function handleApply(event: FormEvent) {
    event.preventDefault();
    applyFilters(draft);
  }

  function handleReset() {
    setDraft(EMPTY_FILTERS);
    resetFilters();
  }

  return (
    <AdminStack>
      <AdminHead
        crumbs={[{ label: "Overview", href: "/admin" }, { label: "Records" }]}
        title="Activity log"
        description={`Major platform events: logins, payments, approvals, and more. ${total} total.`}
        actions={
          <a href={downloadUrl()} className={adminBtn("pri")}>
            <Download size={18} aria-hidden="true" />
            Download CSV
          </a>
        }
      />

      <form
        aria-label="Filter activity"
        onSubmit={handleApply}
        className={`${ADMIN_CARD} flex flex-col gap-4 p-5`}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <AdminField id="la" label="Action">
            <select
              id="la"
              value={draft.action}
              onChange={(event) => setDraft((d) => ({ ...d, action: event.target.value }))}
              className={ADMIN_CONTROL}
            >
              <option value="">All actions</option>
              {filterOptions.actions.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>
          </AdminField>

          <AdminField id="lr" label="Role">
            <select
              id="lr"
              value={draft.actorRole}
              onChange={(event) => setDraft((d) => ({ ...d, actorRole: event.target.value }))}
              className={ADMIN_CONTROL}
            >
              <option value="">All roles</option>
              {filterOptions.actorRoles.map((role) => (
                <option key={role} value={role}>
                  {actorRoleLabel(role)}
                </option>
              ))}
            </select>
          </AdminField>

          <AdminField id="lfr" label="From">
            <input
              id="lfr"
              type="date"
              value={draft.from}
              max={draft.to || undefined}
              onChange={(event) => setDraft((d) => ({ ...d, from: event.target.value }))}
              className={ADMIN_CONTROL}
            />
          </AdminField>

          <AdminField id="lto" label="To">
            <input
              id="lto"
              type="date"
              value={draft.to}
              min={draft.from || undefined}
              onChange={(event) => setDraft((d) => ({ ...d, to: event.target.value }))}
              className={ADMIN_CONTROL}
            />
          </AdminField>

          <AdminField id="lq" label="Search">
            <input
              id="lq"
              type="text"
              value={draft.q}
              placeholder="Name, email, description…"
              onChange={(event) => setDraft((d) => ({ ...d, q: event.target.value }))}
              className={ADMIN_CONTROL}
            />
          </AdminField>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={handleReset} className={adminBtn("out")}>
            Reset
          </button>
          <button type="submit" className={adminBtn("pri")}>
            Apply filters
          </button>
        </div>
      </form>

      <AdminErrorNote>{error}</AdminErrorNote>

      {loading ? (
        <AdminLoadingState message="Loading activity log…" />
      ) : items.length === 0 ? (
        !error && <AdminEmptyState message="No activity matches these filters." />
      ) : (
        <AdminDataTable
          rows={items}
          rowKey={(row) => row.id}
          columns={[
            {
              label: "Date and time",
              block: true,
              render: (row) => (
                <span className="whitespace-nowrap">{formatActivityDateTime(row.createdAt)}</span>
              ),
            },
            {
              label: "Action",
              render: (row) => (
                <span className={adminTag(activityTagColor(row.action))}>{row.action}</span>
              ),
            },
            {
              label: "Actor",
              render: (row) =>
                row.actorName ? (
                  <>
                    <b className="block font-semibold">{row.actorName}</b>
                    <small className="block text-xs text-pd-ink3">
                      {actorRoleLabel(row.actorRole)}
                      {row.actorEmail ? ` · ${row.actorEmail}` : ""}
                    </small>
                  </>
                ) : (
                  actorRoleLabel(row.actorRole)
                ),
            },
            { label: "Description", render: (row) => row.description },
          ]}
        />
      )}

      <AdminPagination page={page} totalPages={totalPages} onChange={setPage} />
    </AdminStack>
  );
}
