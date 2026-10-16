"use client";

import { useMemo, useState } from "react";

import { useAdminComplaints, type AdminComplaint } from "@/features/admin/hooks/useComplaints";
import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminPanel,
  AdminPill,
  adminButtonClass,
  adminTextareaClass,
  cx,
  type PillTone,
} from "@/features/admin/components/ui/primitives";
import {
  AccountsFilterBar,
  AccountsFilterField,
  AccountsPanelHeader,
  filterControlClass,
} from "@/features/accounts/components/ui/accountsUi";
import { formatDate } from "@/features/accounts/utils/format";
import { COMPLAINT_DEPARTMENT_LABELS } from "@/features/shared/utils/complaintDepartment";

type Status = AdminComplaint["status"];

const STATUS_TONE: Record<Status, PillTone> = {
  OPEN: "warn",
  IN_PROGRESS: "brand",
  RESOLVED: "good",
  CLOSED: "neutral",
};

const STATUS_LABEL: Record<Status, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

type Filter = "ALL" | Status;

/**
 * Accounts complaints (Accounts redesign, Oct 2026): a list on the left and the
 * selected complaint on the right. The API scopes the list to the Accounts
 * department by the verified role; this component only presents it.
 * Admin / HR / IT keep using the shared `ComplaintsBoard`.
 */
export default function AccountsComplaintsBoard({ apiBase }: { apiBase: string }) {
  const { complaints, loading, error, markInProgress, resolve, close } = useAdminComplaints(apiBase);
  const [filter, setFilter] = useState<Filter>("OPEN");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [nextStatus, setNextStatus] = useState<Status | "">("");
  const [note, setNote] = useState("");

  const visible = useMemo(
    () => (filter === "ALL" ? complaints : complaints.filter((c) => c.status === filter)),
    [complaints, filter],
  );

  // Fall back to the first visible complaint when nothing (or a filtered-out one) is selected.
  const selected = visible.find((c) => c.id === selectedId) ?? visible[0] ?? null;
  const editable = selected?.status === "OPEN" || selected?.status === "IN_PROGRESS";

  function select(id: string) {
    setSelectedId(id);
    setNextStatus("");
    setNote("");
  }

  function save() {
    if (!selected || !nextStatus || nextStatus === selected.status) return;

    const trimmed = note.trim() || undefined;

    if (nextStatus === "IN_PROGRESS") markInProgress(selected.id);
    else if (nextStatus === "RESOLVED") resolve(selected.id, trimmed);
    else if (nextStatus === "CLOSED") close(selected.id, trimmed);

    setNextStatus("");
    setNote("");
  }

  return (
    <div className="flex flex-col gap-5">
      <AdminError>{error}</AdminError>

      {loading ? (
        <AdminLoading message="Loading complaints…" />
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-[380px_1fr]">
          <AdminPanel className="overflow-hidden">
            <AccountsFilterBar>
              <div className="w-full">
                <AccountsFilterField label="Status" htmlFor="complaint-filter">
                  <select
                    id="complaint-filter"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value as Filter)}
                    className={cx(filterControlClass, "sm:w-full")}
                  >
                    <option value="OPEN">Open</option>
                    <option value="IN_PROGRESS">In progress</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="CLOSED">Closed</option>
                    <option value="ALL">All</option>
                  </select>
                </AccountsFilterField>
              </div>
            </AccountsFilterBar>

            {visible.length === 0 ? (
              <p className="px-5 py-10 text-center text-admin-muted">
                {complaints.length === 0 ? "No complaints yet." : "No complaints with this status."}
              </p>
            ) : (
              <ul>
                {visible.map((c) => {
                  const active = c.id === selected?.id;

                  return (
                    <li key={c.id} className="border-b border-admin-line-soft last:border-b-0">
                      <button
                        type="button"
                        onClick={() => select(c.id)}
                        aria-current={active ? "true" : undefined}
                        className={cx(
                          "block w-full px-5 py-4 text-left transition-colors",
                          active ? "bg-admin-tint" : "hover:bg-admin-hover",
                        )}
                      >
                        <span className="block font-extrabold">{c.subject}</span>
                        <span className="mb-2 mt-0.5 block text-[14px] text-admin-muted">
                          {c.raiserName || "Unknown"} · {formatDate(c.createdAt)}
                        </span>
                        <AdminPill tone={STATUS_TONE[c.status]}>{STATUS_LABEL[c.status]}</AdminPill>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </AdminPanel>

          {selected ? (
            <AdminPanel className="overflow-hidden">
              <AccountsPanelHeader
                title={selected.subject}
                actions={<AdminPill tone={STATUS_TONE[selected.status]}>{STATUS_LABEL[selected.status]}</AdminPill>}
              />

              <dl className="grid gap-4 p-5 [grid-template-columns:repeat(auto-fit,minmax(160px,1fr))]">
                <div>
                  <dt className="text-[13px] font-extrabold text-admin-muted">From</dt>
                  <dd className="mt-0.5 font-bold">
                    {selected.raiserName || "Unknown"}
                    {selected.raiserEmail && (
                      <span className="block text-[14px] font-normal text-admin-muted">{selected.raiserEmail}</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-[13px] font-extrabold text-admin-muted">Received</dt>
                  <dd className="mt-0.5 font-bold">{formatDate(selected.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-[13px] font-extrabold text-admin-muted">Department</dt>
                  <dd className="mt-0.5 font-bold">
                    {selected.department ? COMPLAINT_DEPARTMENT_LABELS[selected.department] : "Accounts"}
                  </dd>
                </div>
              </dl>

              <div className="border-b border-admin-line px-5 pb-5">
                <p className="text-[13px] font-extrabold text-admin-muted">Message</p>
                <p className="mt-1 whitespace-pre-line text-[15px]">{selected.description}</p>
                {selected.adminNote && (
                  <p className="mt-3 text-[14px] text-admin-muted">Note sent to the raiser: {selected.adminNote}</p>
                )}
              </div>

              {editable ? (
                <div className="flex flex-wrap items-end gap-3 px-5 py-4">
                  <AccountsFilterField label="Update status" htmlFor="complaint-next-status">
                    <select
                      id="complaint-next-status"
                      value={nextStatus}
                      onChange={(e) => setNextStatus(e.target.value as Status | "")}
                      className={filterControlClass}
                    >
                      <option value="">{STATUS_LABEL[selected.status]} (current)</option>
                      {selected.status === "OPEN" && <option value="IN_PROGRESS">In progress</option>}
                      <option value="RESOLVED">Resolved</option>
                      <option value="CLOSED">Closed</option>
                    </select>
                  </AccountsFilterField>

                  {(nextStatus === "RESOLVED" || nextStatus === "CLOSED") && (
                    <div className="min-w-[240px] flex-1">
                      <label htmlFor="complaint-note" className="mb-1 block text-[13px] font-extrabold text-admin-muted">
                        Note for the raiser (optional)
                      </label>
                      <textarea
                        id="complaint-note"
                        rows={2}
                        maxLength={500}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Let them know what happened"
                        className={adminTextareaClass}
                      />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={save}
                    disabled={!nextStatus}
                    className={adminButtonClass("primary")}
                  >
                    Save
                  </button>
                </div>
              ) : (
                <p className="px-5 py-4 text-[14px] text-admin-muted">
                  This complaint is {STATUS_LABEL[selected.status].toLowerCase()} and can&apos;t be changed.
                </p>
              )}
            </AdminPanel>
          ) : (
            <AdminEmpty message="Select a complaint to see its details." />
          )}
        </div>
      )}
    </div>
  );
}
