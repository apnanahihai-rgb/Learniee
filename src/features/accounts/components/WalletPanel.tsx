"use client";

import { useMemo, useState } from "react";

import { useWallets } from "@/features/accounts/hooks/useWallets";
import { usePagination } from "@/features/accounts/hooks/usePagination";
import {
  AdminError,
  AdminPanel,
  adminButtonClass,
  adminInputClass,
} from "@/features/admin/components/ui/primitives";
import {
  AccountsFilterBar,
  AccountsFilterField,
  AccountsKpiStrip,
  AccountsPagination,
  AccountsTable,
  TableMessageRow,
  filterControlClass,
  numClass,
  rowClass,
  tdClass,
  thClass,
} from "@/features/accounts/components/ui/accountsUi";
import { currencyExact } from "@/features/accounts/utils/format";
import { matchesQuery } from "@/features/accounts/utils/period";

/**
 * Accounts/Admin view of every parent's Wallet balance, plus a manual credit
 * action: the only way money moves INTO a Wallet today (06-OPEN-DECISIONS.md
 * #28: refunds credit the Wallet, never the original payment method, and there
 * is no automatic refund-to-wallet path yet). Deliberately no debit action:
 * the Wallet is closed-loop with no cash-out.
 */
export default function WalletPanel() {
  const { wallets, summary, loading, error, crediting, credit } = useWallets();
  const [creditingRowId, setCreditingRowId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () => wallets.filter((w) => matchesQuery(query, w.parentName, w.email)),
    [wallets, query],
  );
  const paging = usePagination(filtered, query);

  const withBalance = wallets.filter((w) => w.balance > 0).length;

  function startCrediting(parentId: string) {
    setCreditingRowId(parentId);
    setAmount("");
    setReason("");
  }

  function cancelCrediting() {
    setCreditingRowId(null);
    setAmount("");
    setReason("");
  }

  async function handleCredit(parentId: string) {
    const amountNumber = Number(amount);

    if (!amountNumber || amountNumber <= 0) {
      return;
    }

    const ok = await credit(parentId, amountNumber, reason.trim() || "Manual credit");

    if (ok) {
      cancelCrediting();
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <AccountsKpiStrip
        items={[
          { label: "Total wallet balance", value: summary ? currencyExact.format(summary.totalBalance) : "—" },
          { label: "Parents with a balance", value: summary ? withBalance : "—" },
        ]}
      />

      <AdminError>{error}</AdminError>

      <AdminPanel className="overflow-hidden">
        <AccountsFilterBar>
          <AccountsFilterField label="Search" htmlFor="wallet-search">
            <input
              id="wallet-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Parent name or email"
              className={filterControlClass}
            />
          </AccountsFilterField>
        </AccountsFilterBar>

        <AccountsTable minWidth={700}>
          <thead>
            <tr>
              <th className={thClass}>Parent</th>
              <th className={thClass}>Email</th>
              <th className={`${thClass} text-right`}>Balance</th>
              <th className={`${thClass} text-right`}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && <TableMessageRow colSpan={4}>Loading wallets…</TableMessageRow>}
            {!loading && paging.pageItems.length === 0 && (
              <TableMessageRow colSpan={4}>
                {wallets.length === 0 ? "No parent accounts yet." : "No parents match this search."}
              </TableMessageRow>
            )}
            {paging.pageItems.map((w) => (
              <tr key={w.parentId} className={rowClass}>
                <td className={`${tdClass} font-bold`}>{w.parentName}</td>
                <td className={`${tdClass} text-admin-muted`}>{w.email}</td>
                <td className={`${tdClass} ${numClass} font-extrabold`}>{currencyExact.format(w.balance)}</td>
                <td className={tdClass}>
                  {creditingRowId === w.parentId ? (
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <input
                        className={`${adminInputClass} sm:w-28`}
                        placeholder="Amount"
                        aria-label="Credit amount in rupees"
                        inputMode="decimal"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        autoFocus
                      />
                      <input
                        className={`${adminInputClass} sm:w-44`}
                        placeholder="Reason"
                        aria-label="Reason for the credit"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                      />
                      <button
                        type="button"
                        disabled={crediting === w.parentId}
                        onClick={() => handleCredit(w.parentId)}
                        className={adminButtonClass("primary")}
                      >
                        Confirm
                      </button>
                      <button type="button" onClick={cancelCrediting} className={adminButtonClass("secondary")}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => startCrediting(w.parentId)}
                        className={adminButtonClass("secondary")}
                      >
                        Credit
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </AccountsTable>

        <AccountsPagination
          from={paging.from}
          to={paging.to}
          total={paging.total}
          page={paging.page}
          pageCount={paging.pageCount}
          onPage={paging.setPage}
          noun="parents"
        />
      </AdminPanel>

      <p className="text-sm text-admin-muted">
        Wallet credits are closed-loop: no cash-out. Use Credit to issue a refund or adjustment; it lands in the
        parent&apos;s wallet, not their original payment method.
      </p>
    </div>
  );
}
