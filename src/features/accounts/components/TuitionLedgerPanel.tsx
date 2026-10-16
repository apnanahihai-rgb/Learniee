"use client";

import { useMemo, useState } from "react";

import type { LedgerEntry, LedgerSummary } from "@/features/accounts/hooks/useTuitionLedger";
import { usePagination } from "@/features/accounts/hooks/usePagination";
import {
  AdminError,
  AdminPanel,
  adminButtonClass,
  adminInputClass,
  type PillTone,
} from "@/features/admin/components/ui/primitives";
import {
  AccountsFilterBar,
  AccountsFilterField,
  AccountsKpiStrip,
  AccountsPagination,
  AccountsTable,
  ExportLink,
  FilterSpacer,
  StatusPill,
  TableMessageRow,
  TwoLine,
  filterControlClass,
  numClass,
  rejectButtonClass,
  rowClass,
  tdClass,
  thClass,
} from "@/features/accounts/components/ui/accountsUi";
import { EXPORT_HREF, currency, formatDate } from "@/features/accounts/utils/format";
import {
  TABLE_PERIOD_OPTIONS,
  matchesPeriod,
  matchesQuery,
  type TablePeriod,
} from "@/features/accounts/utils/period";

type StatusBucket = "needs" | "approved" | "hold" | "rejected";

const BUCKET_OPTIONS: { value: StatusBucket; label: string }[] = [
  { value: "needs", label: "Pending verification" },
  { value: "approved", label: "Approved" },
  { value: "hold", label: "On hold" },
  { value: "rejected", label: "Rejected" },
];

function bucketOf(status: LedgerEntry["payoutStatus"]): StatusBucket {
  switch (status) {
    case "PENDING_VERIFICATION":
    case "EXPIRED":
      return "needs";
    case "ON_HOLD":
      return "hold";
    case "REJECTED":
      return "rejected";
    default:
      // QUEUED_FOR_PAYMENT, PROCESSING, PAID and the legacy APPROVED
      return "approved";
  }
}

function pillFor(entry: LedgerEntry): { tone: PillTone; label: string } {
  switch (entry.payoutStatus) {
    case "PENDING_VERIFICATION":
      return { tone: "warn", label: "Pending" };
    case "EXPIRED":
      return { tone: "warn", label: "Expired" };
    case "ON_HOLD":
      return { tone: "brand", label: "On hold" };
    case "REJECTED":
      return { tone: "bad", label: "Rejected" };
    case "QUEUED_FOR_PAYMENT":
      return { tone: "good", label: "Queued" };
    case "PROCESSING":
      return { tone: "brand", label: "Processing" };
    case "PAID":
      return { tone: "good", label: "Paid" };
    default:
      return { tone: "good", label: "Approved" };
  }
}

interface TuitionLedgerPanelProps {
  entries: LedgerEntry[];
  summary: LedgerSummary | null;
  loading: boolean;
  error: string;
  actingOn: string | null;
  proceed: (entryId: string) => Promise<boolean>;
  hold: (entryId: string, reason?: string) => Promise<boolean>;
  reject: (entryId: string, reason?: string) => Promise<boolean>;
}

/**
 * Accounts' Verify Payouts screen (Teacher Payouts, Sep 9, 2026): one row per
 * completed cycle with a 24-hour window to decide.
 *
 * "Approve" (the old "Proceed") sends the cycle straight to the Payment Queue.
 * "Hold" and "Reject" both go to Admin for review instead: neither is final
 * until Admin decides (see `LedgerPayoutStatus` in schema.prisma).
 * Only PENDING_VERIFICATION / EXPIRED rows can be acted on; the other status
 * filters are read-only history.
 */
export default function TuitionLedgerPanel({
  entries,
  summary,
  loading,
  error,
  actingOn,
  proceed,
  hold,
  reject,
}: TuitionLedgerPanelProps) {
  const [pendingAction, setPendingAction] = useState<{ id: string; kind: "HOLD" | "REJECT" } | null>(null);
  const [reasonText, setReasonText] = useState("");
  const [query, setQuery] = useState("");
  const [bucket, setBucket] = useState<StatusBucket>("needs");
  const [period, setPeriod] = useState<TablePeriod>("all");

  const needsVerification = useMemo(() => entries.filter((e) => bucketOf(e.payoutStatus) === "needs"), [entries]);
  const awaitingPay = needsVerification.reduce((sum, e) => sum + e.monthlyTeacherPay, 0);
  const pendingCount = summary?.pendingVerificationCount ?? needsVerification.length;
  const overdueCount = summary?.overdueCount ?? needsVerification.filter((e) => e.isOverdue).length;

  const filtered = useMemo(
    () =>
      entries.filter(
        (e) =>
          bucketOf(e.payoutStatus) === bucket &&
          matchesQuery(query, e.teacherName, e.parentName, e.childName, e.subject) &&
          matchesPeriod(e.transactionDate, period),
      ),
    [entries, bucket, query, period],
  );

  const paging = usePagination(filtered, `${query}|${bucket}|${period}`);

  async function handleConfirm() {
    if (!pendingAction) return;

    const reason = reasonText.trim() || undefined;
    const ok =
      pendingAction.kind === "HOLD" ? await hold(pendingAction.id, reason) : await reject(pendingAction.id, reason);

    if (ok) {
      setPendingAction(null);
      setReasonText("");
    }
  }

  function cancelPending() {
    setPendingAction(null);
    setReasonText("");
  }

  return (
    <div className="flex flex-col gap-6">
      <AccountsKpiStrip
        items={[
          {
            label: "Pending verification",
            value: pendingCount,
            tone: overdueCount > 0 ? "warn" : "default",
            note: overdueCount > 0 ? `${overdueCount} past the 24-hour window` : undefined,
          },
          { label: "Teacher pay awaiting approval", value: currency.format(awaitingPay) },
        ]}
      />

      <AdminError>{error}</AdminError>

      <AdminPanel className="overflow-hidden">
        <AccountsFilterBar>
          <AccountsFilterField label="Search" htmlFor="verify-search">
            <input
              id="verify-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Teacher, parent or child"
              className={filterControlClass}
            />
          </AccountsFilterField>
          <AccountsFilterField label="Status" htmlFor="verify-status">
            <select
              id="verify-status"
              value={bucket}
              onChange={(e) => setBucket(e.target.value as StatusBucket)}
              className={filterControlClass}
            >
              {BUCKET_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </AccountsFilterField>
          <AccountsFilterField label="Period" htmlFor="verify-period">
            <select
              id="verify-period"
              value={period}
              onChange={(e) => setPeriod(e.target.value as TablePeriod)}
              className={filterControlClass}
            >
              {TABLE_PERIOD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </AccountsFilterField>
          <FilterSpacer />
          <ExportLink href={EXPORT_HREF} />
        </AccountsFilterBar>

        <AccountsTable minWidth={1000}>
          <thead>
            <tr>
              <th className={thClass}>Cycle completed</th>
              <th className={thClass}>Teacher</th>
              <th className={thClass}>Parent / Child</th>
              <th className={thClass}>Subject</th>
              <th className={`${thClass} text-right`}>CCC</th>
              <th className={`${thClass} text-right`}>Teacher pay</th>
              <th className={thClass}>Status</th>
              <th className={`${thClass} text-right`}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && <TableMessageRow colSpan={8}>Loading…</TableMessageRow>}
            {!loading && paging.pageItems.length === 0 && (
              <TableMessageRow colSpan={8}>
                {bucket === "needs"
                  ? "Nothing waiting on verification right now."
                  : "No payouts match these filters."}
              </TableMessageRow>
            )}
            {paging.pageItems.map((r) => {
              const pill = pillFor(r);
              const actionable = bucketOf(r.payoutStatus) === "needs";
              const editing = pendingAction?.id === r.id;

              return (
                <tr key={r.id} className={`${rowClass} ${r.isOverdue && actionable ? "bg-[#fff8e6]" : ""}`}>
                  <td className={tdClass}>{formatDate(r.transactionDate)}</td>
                  <td className={tdClass}>{r.teacherName}</td>
                  <td className={tdClass}>
                    <TwoLine primary={r.parentName} secondary={r.childName} />
                  </td>
                  <td className={tdClass}>{r.subject}</td>
                  <td className={`${tdClass} ${numClass}`}>{r.sessionsCompleted}</td>
                  <td className={`${tdClass} ${numClass} font-extrabold`}>{currency.format(r.monthlyTeacherPay)}</td>
                  <td className={tdClass}>
                    <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
                    {r.isOverdue && actionable && (
                      <span className="mt-1 block text-[13px] text-[#6b4a00]">Past 24-hour window</span>
                    )}
                  </td>
                  <td className={tdClass}>
                    {!actionable ? (
                      <span className="block text-right text-admin-muted">—</span>
                    ) : editing ? (
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <input
                          className={`${adminInputClass} sm:w-44`}
                          placeholder="Reason (optional)"
                          aria-label={pendingAction?.kind === "HOLD" ? "Reason for hold" : "Reason for rejection"}
                          value={reasonText}
                          onChange={(e) => setReasonText(e.target.value)}
                          autoFocus
                        />
                        <button
                          type="button"
                          disabled={actingOn === r.id}
                          onClick={handleConfirm}
                          className={
                            pendingAction?.kind === "REJECT"
                              ? adminButtonClass("danger")
                              : adminButtonClass("primary")
                          }
                        >
                          Confirm {pendingAction?.kind === "HOLD" ? "hold" : "reject"}
                        </button>
                        <button type="button" onClick={cancelPending} className={adminButtonClass("secondary")}>
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <button
                          type="button"
                          disabled={actingOn === r.id}
                          onClick={() => proceed(r.id)}
                          className={adminButtonClass("primary")}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={actingOn === r.id}
                          onClick={() => setPendingAction({ id: r.id, kind: "HOLD" })}
                          className={adminButtonClass("secondary")}
                        >
                          Hold
                        </button>
                        <button
                          type="button"
                          disabled={actingOn === r.id}
                          onClick={() => setPendingAction({ id: r.id, kind: "REJECT" })}
                          className={rejectButtonClass}
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </AccountsTable>

        <AccountsPagination
          from={paging.from}
          to={paging.to}
          total={paging.total}
          page={paging.page}
          pageCount={paging.pageCount}
          onPage={paging.setPage}
          noun="payouts"
        />
      </AdminPanel>

      <p className="text-sm text-admin-muted">
        Approve sends a cycle straight to the Payment Queue. Hold and Reject send it to Admin for review instead;
        neither is final until Admin decides.
      </p>
    </div>
  );
}
