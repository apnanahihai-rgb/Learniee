"use client";

import { useState } from "react";

import { usePaymentQueue, type PayoutQueueTeacherGroup } from "@/features/accounts/hooks/usePaymentQueue";
import {
  AdminDialog,
  AdminError,
  AdminPanel,
  adminButtonClass,
  type PillTone,
} from "@/features/admin/components/ui/primitives";
import {
  AccountsKpiStrip,
  AccountsPanelHeader,
  AccountsTable,
  ExportLink,
  StatusPill,
  TableMessageRow,
  TwoLine,
  numClass,
  rowClass,
  tdClass,
  tfootCellClass,
  thClass,
} from "@/features/accounts/components/ui/accountsUi";
import { EXPORT_HREF, currency } from "@/features/accounts/utils/format";

const BANK_PILL: Record<PayoutQueueTeacherGroup["bankAccountStatus"], { tone: PillTone; label: string }> = {
  APPROVED: { tone: "good", label: "Approved" },
  PENDING: { tone: "warn", label: "Awaiting Admin approval" },
  REJECTED: { tone: "bad", label: "Rejected, can't pay yet" },
  NONE: { tone: "bad", label: "Missing, can't pay yet" },
};

/**
 * Accounts' Payment Queue screen (Teacher Payouts, Sep 9, 2026): every teacher
 * with at least one approved cycle, one row per teacher (not per cycle). Pay a
 * single teacher from their row, or tick several and use "Pay selected" to
 * mass-pay. A teacher without an Admin-approved bank account is listed but
 * cannot be selected; mass-pay skips them rather than failing the batch.
 * Every payment asks for a confirmation first because it moves real money.
 */
export default function PaymentQueuePanel() {
  const { groups, loading, error, paying, lastResult, payTeachers } = usePaymentQueue();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmIds, setConfirmIds] = useState<string[] | null>(null);

  const payable = groups.filter((g) => g.hasBankAccount);
  const allPayableSelected = payable.length > 0 && payable.every((g) => selected.has(g.teacherId));

  const totalPayable = groups.reduce((s, g) => s + g.totalAmount, 0);
  const totalCycles = groups.reduce((s, g) => s + g.cycleCount, 0);

  const confirmGroups = confirmIds ? groups.filter((g) => confirmIds.includes(g.teacherId)) : [];
  const confirmTotal = confirmGroups.reduce((s, g) => s + g.totalAmount, 0);

  function toggle(teacherId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(teacherId)) next.delete(teacherId);
      else next.add(teacherId);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allPayableSelected ? new Set() : new Set(payable.map((g) => g.teacherId)));
  }

  async function handleConfirmedPay() {
    if (!confirmIds || confirmIds.length === 0) return;

    const ids = confirmIds;
    setConfirmIds(null);

    const ok = await payTeachers(ids);

    if (ok) {
      setSelected((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <AccountsKpiStrip
        items={[
          { label: "Total payable", value: currency.format(totalPayable) },
          { label: "Teachers queued", value: groups.length },
          { label: "Cycles queued", value: totalCycles },
        ]}
      />

      <AdminError>{error}</AdminError>

      {lastResult && (
        <div
          role="status"
          className="rounded-[14px] border border-green-200 bg-green-50 px-4 py-3 text-[15px] font-semibold text-green-800"
        >
          Sent {lastResult.paidTeacherIds.length + lastResult.processingTeacherIds.length} teacher(s),{" "}
          {currency.format(lastResult.totalAmount)} total.
          {lastResult.processingTeacherIds.length > 0 && (
            <> {lastResult.processingTeacherIds.length} awaiting bank confirmation.</>
          )}
          {lastResult.failedTeacherIds.length > 0 && (
            <> {lastResult.failedTeacherIds.length} failed and are back in the queue.</>
          )}
          {lastResult.skippedTeacherIds.length > 0 && (
            <> {lastResult.skippedTeacherIds.length} skipped: no bank account on file.</>
          )}
        </div>
      )}

      <AdminPanel className="overflow-hidden">
        <AccountsPanelHeader
          title="Queued for payment"
          description="Pay sends the transfer through RazorpayX. Cycles show as Processing until the bank confirms, and return here if a transfer fails."
          actions={
            <>
              <ExportLink href={EXPORT_HREF} />
              <button
                type="button"
                disabled={selected.size === 0 || paying}
                onClick={() => setConfirmIds(Array.from(selected))}
                className={adminButtonClass("primary")}
              >
                {paying ? "Paying…" : `Pay selected${selected.size ? ` (${selected.size})` : ""}`}
              </button>
            </>
          }
        />

        <AccountsTable minWidth={820}>
          <thead>
            <tr>
              <th className={`${thClass} w-12`}>
                <input
                  type="checkbox"
                  checked={allPayableSelected}
                  onChange={toggleAll}
                  disabled={payable.length === 0}
                  aria-label="Select all payable teachers"
                  className="size-5 accent-brand"
                />
              </th>
              <th className={thClass}>Teacher</th>
              <th className={thClass}>Bank account</th>
              <th className={`${thClass} text-right`}>Cycles queued</th>
              <th className={`${thClass} text-right`}>Total payable</th>
              <th className={`${thClass} text-right`}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && <TableMessageRow colSpan={6}>Loading…</TableMessageRow>}
            {!loading && groups.length === 0 && (
              <TableMessageRow colSpan={6}>
                Nothing queued for payment right now. Approve a cycle in Verify Payouts first.
              </TableMessageRow>
            )}
            {groups.map((g) => {
              const bank = BANK_PILL[g.bankAccountStatus];

              return (
                <tr key={g.teacherId} className={rowClass}>
                  <td className={tdClass}>
                    <input
                      type="checkbox"
                      checked={selected.has(g.teacherId)}
                      onChange={() => toggle(g.teacherId)}
                      disabled={!g.hasBankAccount}
                      aria-label={`Select ${g.teacherName}`}
                      className="size-5 accent-brand"
                    />
                  </td>
                  <td className={tdClass}>
                    <TwoLine primary={<b>{g.teacherName}</b>} secondary={g.email} />
                  </td>
                  <td className={tdClass}>
                    <StatusPill tone={bank.tone}>{bank.label}</StatusPill>
                  </td>
                  <td className={`${tdClass} ${numClass}`}>{g.cycleCount}</td>
                  <td className={`${tdClass} ${numClass} font-extrabold`}>{currency.format(g.totalAmount)}</td>
                  <td className={tdClass}>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        disabled={!g.hasBankAccount || paying}
                        onClick={() => setConfirmIds([g.teacherId])}
                        className={adminButtonClass("primary")}
                      >
                        Pay
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          {groups.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={3} className={tfootCellClass}>
                  Total
                </td>
                <td className={`${tfootCellClass} ${numClass}`}>{totalCycles}</td>
                <td className={`${tfootCellClass} ${numClass}`}>{currency.format(totalPayable)}</td>
                <td className={tfootCellClass} />
              </tr>
            </tfoot>
          )}
        </AccountsTable>
      </AdminPanel>

      {confirmIds && (
        <AdminDialog
          title="Send payment"
          subtitle={
            confirmGroups.length === 1
              ? confirmGroups[0].teacherName
              : `${confirmGroups.length} teachers`
          }
          onClose={() => setConfirmIds(null)}
          footer={
            <>
              <button type="button" onClick={() => setConfirmIds(null)} className={adminButtonClass("secondary")}>
                Cancel
              </button>
              <button type="button" onClick={handleConfirmedPay} className={adminButtonClass("primary")}>
                Pay {currency.format(confirmTotal)}
              </button>
            </>
          }
        >
          <p className="text-[15px] text-admin-muted">
            This sends {currency.format(confirmTotal)} through RazorpayX to the bank account on file. It can&apos;t
            be undone from here.
          </p>
        </AdminDialog>
      )}
    </div>
  );
}
