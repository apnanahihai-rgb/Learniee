"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";

import { adminInitials, useAdminIdentity } from "@/features/admin/components/ui/AdminIdentityContext";
import AdminJumpSearch from "@/features/admin/components/ui/AdminJumpSearch";
import { ADMIN_FOCUS, cx } from "@/features/admin/components/ui/adminStyles";
import NotificationBell from "@/features/shared/components/NotificationBell";
import { endSession } from "@/features/shared/utils/endSession";
import { logClientActivity } from "@/features/shared/utils/logClientActivity";

/** Fixed 60px top bar: logo + role pill, jump search, bell, Profile, Logout. */
export default function AdminTopBar() {
  const identity = useAdminIdentity();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);

    // Log first: the logout route needs the cookie to know who is leaving.
    await logClientActivity("LOGOUT");
    await endSession();
    router.push("/login");
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex h-[60px] items-center gap-3 border-b border-pd-line bg-white px-4">
      <Link
        href="/admin"
        aria-label="Learniee Admin home"
        className={cx("flex min-h-11 items-center gap-2.5", ADMIN_FOCUS)}
      >
        <span className="grid size-[34px] place-items-center rounded-[10px] bg-pd-brand font-heading text-[21px] font-bold leading-none text-white">
          L
        </span>
        <b className="font-heading text-[23px] font-bold text-pd-brand">Learniee</b>
        <span className="ml-1 rounded-full bg-pd-b100 px-2.5 py-0.5 text-xs font-bold text-pd-brand-d">
          Admin
        </span>
      </Link>

      <AdminJumpSearch />

      <div className="ml-auto flex items-center gap-1">
        <NotificationBell
          buttonClassName="relative grid size-11 place-items-center rounded-[10px] text-pd-ink2 transition-colors hover:bg-pd-b50 hover:text-pd-brand"
          badgeClassName="absolute right-1 top-[5px] flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-pd-red px-[5px] text-[10px] font-bold leading-[18px] text-white shadow-[0_0_0_2px_#fff]"
          panelClassName="fixed right-2 top-16 z-[80] flex max-h-[70dvh] w-[360px] max-w-[calc(100vw-16px)] origin-top-right animate-pop-in flex-col rounded-xl border border-pd-line bg-white shadow-[0_16px_40px_-12px_rgba(23,23,43,0.3)]"
        />

        <Link
          href="/admin/profile"
          aria-label="Profile"
          className={cx(
            "flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-pd-b50",
            ADMIN_FOCUS,
          )}
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-pd-b100 font-bold text-pd-brand-d">
            {adminInitials(identity)}
          </span>
          <span className="hidden font-semibold sm:block">Profile</span>
        </Link>

        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          aria-label="Log out"
          className={cx(
            "flex min-h-11 items-center gap-2 rounded-full px-3 font-semibold text-pd-ink2 transition-colors hover:bg-pd-b50 hover:text-pd-brand disabled:opacity-60",
            ADMIN_FOCUS,
          )}
        >
          <LogOut size={18} aria-hidden="true" />
          <span className="hidden sm:block">{loggingOut ? "Logging out…" : "Logout"}</span>
        </button>
      </div>
    </header>
  );
}
