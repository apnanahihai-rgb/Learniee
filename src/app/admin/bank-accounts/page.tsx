"use client";

import { useState } from "react";

import BankAccountCard from "@/features/admin/components/BankAccountCard";
import {
  AdminEmptyState,
  AdminErrorNote,
  AdminHead,
  AdminLoadingState,
  AdminPillTabs,
  AdminStack,
} from "@/features/admin/components/ui/design";
import { AdminQueue, type AdminQueueItem } from "@/features/admin/components/ui/queue";
import { useAdminBankAccounts } from "@/features/admin/hooks/useBankAccounts";

type View = "pending" | "all";

/**
 * Admin "Bank accounts" (design 05). Every Teacher-submitted
 * `BankAccount` lands here as PENDING until approved or rejected; only
 * an APPROVED one can be used for a payout. Data: GET
 * /api/admin/bank-accounts, decisions: PATCH
 * /api/admin/bank-accounts/[id] (verified Admin auth).
 */
export default function AdminBankAccountsPage() {
  const { bankAccounts, loading, error, busyId, approve, reject } = useAdminBankAccounts();
  const [view, setView] = useState<View>("pending");
  const [historyOpenId, setHistoryOpenId] = useState<string | null>(null);

  const pending = bankAccounts.filter((b) => b.status === "PENDING");

  const pendingItems: AdminQueueItem[] = pending.map((account) => ({
    id: account.id,
    date: account.createdAt,
    searchText: [account.teacherName, account.email, account.accountHolderName, account.bankName]
      .filter(Boolean)
      .join(" "),
    render: ({ open, onToggle, waitingTag }) => (
      <BankAccountCard
        account={account}
        open={open}
        onToggle={onToggle}
        waitingTag={waitingTag}
        busy={busyId === account.id}
        onApprove={(id) => void approve(id)}
        onReject={(id, reason) => void reject(id, reason)}
      />
    ),
  }));

  return (
    <AdminStack>
      <AdminHead
        crumbs={[{ label: "Overview", href: "/admin" }, { label: "Approvals" }]}
        title="Bank accounts"
        description={`${pending.length} submission${pending.length === 1 ? "" : "s"} waiting on you. Only approved accounts can be used for a payout.`}
      />

      <AdminPillTabs
        label="Bank status"
        value={view}
        onChange={setView}
        tabs={[
          { value: "pending", label: "Pending only", count: pending.length },
          { value: "all", label: "All history" },
        ]}
      />

      <AdminErrorNote>{error}</AdminErrorNote>

      {loading ? (
        <AdminLoadingState message="Loading bank accounts…" />
      ) : view === "pending" ? (
        pending.length === 0 ? (
          <AdminEmptyState message="Nothing waiting on your approval." />
        ) : (
          <AdminQueue items={pendingItems} searchPlaceholder="Filter by teacher, email or bank" />
        )
      ) : bankAccounts.length === 0 ? (
        <AdminEmptyState message="No bank account submissions yet." />
      ) : (
        <div className="flex flex-col gap-2.5">
          {bankAccounts.map((account) => (
            <BankAccountCard
              key={account.id}
              account={account}
              open={historyOpenId === account.id}
              onToggle={() => setHistoryOpenId(historyOpenId === account.id ? null : account.id)}
              busy={busyId === account.id}
              onApprove={(id) => void approve(id)}
              onReject={(id, reason) => void reject(id, reason)}
            />
          ))}
        </div>
      )}
    </AdminStack>
  );
}
