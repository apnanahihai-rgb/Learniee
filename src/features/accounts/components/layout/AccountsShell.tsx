"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { LogOut, Menu, X } from "lucide-react";

import {
  ACCOUNTS_NAV,
  isAccountsNavActive,
  type AccountsBadgeKey,
} from "@/features/accounts/config/accountsNav";
import { useTuitionLedger } from "@/features/accounts/hooks/useTuitionLedger";
import {
  AccountsLedgerContext,
  useAccountsLedger,
} from "@/features/accounts/components/layout/AccountsLedgerContext";
import { logClientActivity } from "@/features/shared/utils/logClientActivity";

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/accounts"
      className="flex min-h-11 items-center gap-2.5 px-2"
      aria-label="Learniee Accounts home"
    >
      <span
        className={`flex items-center justify-center bg-brand font-heading font-extrabold leading-none text-white ${
          compact ? "size-8 rounded-[10px] text-xl" : "size-9 rounded-[11px] text-[22px]"
        }`}
      >
        L
      </span>
      <span
        className={`font-heading font-extrabold leading-none text-brand-dark ${
          compact ? "text-[22px]" : "text-2xl"
        }`}
      >
        Learniee
      </span>
      {!compact && (
        <span className="ml-auto rounded-full bg-admin-tint px-2.5 py-1 text-xs font-extrabold uppercase tracking-wider text-brand-dark">
          Accounts
        </span>
      )}
    </Link>
  );
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { summary } = useAccountsLedger();

  const badges: Record<AccountsBadgeKey, number> = {
    pendingVerification: summary?.pendingVerificationCount ?? 0,
    queuedForPayment: summary?.queuedForPaymentCount ?? 0,
  };

  async function handleLogout() {
    await logClientActivity("LOGOUT");
    Cookies.remove("idToken");
    router.push("/login");
  }

  return (
    <nav aria-label="Accounts" className="flex flex-1 flex-col gap-[18px]">
      {ACCOUNTS_NAV.map((group, index) => (
        <div key={group.label || `group-${index}`} className="flex flex-col gap-0.5">
          {group.label && (
            <div className="px-3 pb-1.5 text-xs font-extrabold uppercase tracking-[0.08em] text-admin-muted">
              {group.label}
            </div>
          )}

          {group.items.map((item) => {
            const active = isAccountsNavActive(item, pathname);
            const count = item.badgeKey ? badges[item.badgeKey] : 0;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-bold transition-colors ${
                  active
                    ? "bg-admin-tint font-extrabold text-brand-dark"
                    : "text-admin-ink hover:bg-[#f6f1ff]"
                }`}
              >
                <Icon className="size-5 shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1">{item.label}</span>
                {count > 0 && (
                  <span className="min-w-6 rounded-full bg-brand-yellow px-2 py-0.5 text-center text-[13px] font-extrabold text-admin-ink">
                    {count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}

      <div className="mt-auto border-t border-admin-line pt-3">
        <button
          type="button"
          onClick={handleLogout}
          className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-[15px] font-bold text-admin-ink transition-colors hover:bg-[#f6f1ff]"
        >
          <LogOut className="size-5 shrink-0" aria-hidden="true" />
          Logout
        </button>
      </div>
    </nav>
  );
}

/**
 * Chrome for every `/accounts` screen (Accounts redesign, Oct 2026): a fixed
 * sidebar on wide screens, a slide-in drawer on phones. Mounted once by
 * `src/app/accounts/layout.tsx`, so pages render content only. Route protection
 * stays in `middleware.ts` and each page's own `requireAdminOrAccounts()`.
 *
 * Deliberately no notification bell: `requireNotificationRecipient` does not
 * resolve an Accounts-role login yet (06-OPEN-DECISIONS.md #32).
 */
export default function AccountsShell({ children }: { children: React.ReactNode }) {
  const ledger = useTuitionLedger();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Escape closes the drawer; lock page scroll while it is open.
  useEffect(() => {
    if (!drawerOpen) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setDrawerOpen(false);
    }

    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [drawerOpen]);

  return (
    <AccountsLedgerContext.Provider value={ledger}>
      <div className="flex min-h-dvh bg-admin-surface font-sans text-admin-ink">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-dvh w-[240px] shrink-0 flex-col gap-5 overflow-y-auto border-r border-admin-line bg-white px-3.5 pb-6 pt-6 lg:flex">
          <Brand />
          <SidebarNav />
        </aside>

        {/* Mobile drawer */}
        {drawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Accounts menu">
            <button
              type="button"
              aria-label="Close menu"
              className="absolute inset-0 bg-admin-ink/40"
              onClick={() => setDrawerOpen(false)}
            />
            <div className="absolute inset-y-0 left-0 flex w-[300px] max-w-[85vw] flex-col gap-5 overflow-y-auto bg-white px-4 pb-8 pt-4 shadow-xl">
              <div className="flex items-center justify-between">
                <Brand />
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close menu"
                  className="flex size-11 items-center justify-center rounded-xl border border-admin-line"
                >
                  <X className="size-5" />
                </button>
              </div>
              <SidebarNav onNavigate={() => setDrawerOpen(false)} />
            </div>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center gap-2 border-b border-admin-line bg-white px-4 py-2.5 lg:hidden">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
              className="flex size-11 items-center justify-center rounded-xl border border-admin-line bg-white"
            >
              <Menu className="size-5" />
            </button>
            <div className="ml-1">
              <Brand compact />
            </div>
          </header>

          <main className="w-full max-w-[1224px] px-4 py-6 sm:px-8 sm:py-8">{children}</main>
        </div>
      </div>
    </AccountsLedgerContext.Provider>
  );
}
