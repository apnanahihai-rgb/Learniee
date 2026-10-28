"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Menu, Search } from "lucide-react";

import DemoCouponButton from "@/features/parent/components/layout/DemoCouponButton";
import WalletBadge from "@/features/parent/components/layout/WalletBadge";
import NotificationBell from "@/features/shared/components/NotificationBell";
import { useAutoRefresh } from "@/features/shared/hooks/useAutoRefresh";
import BrandLogo from "@/features/shared/components/BrandLogo";
import { endSession } from "@/features/shared/utils/endSession";
import { logClientActivity } from "@/features/shared/utils/logClientActivity";
import { getInitial } from "@/lib/initials";

interface Parent {
  firstName: string;
  lastName: string;
  visibleName: string | null;
  email: string;
}

interface ParentNavbarProps {
  onMenuClick: () => void;
}

export default function ParentNavbar({ onMenuClick }: ParentNavbarProps) {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [parent, setParent] = useState<Parent | null>(null);

  const fetchParent = useCallback(async () => {
    try {
      const res = await fetch("/api/parent/profile");

      if (!res.ok) {
        return;
      }

      const data = await res.json();

      setParent(data.parent);
    } catch (error) {
      console.error("Failed to load parent:", error);
    }
  }, []);

  useEffect(() => {
    fetchParent();
  }, [fetchParent]);

  // Name changes made on the profile page show up here straight away.
  useAutoRefresh(() => fetchParent(), { paths: ["/api/parent/profile"] });

  const handleLogout = async () => {
    // Fire the log before ending the session — the endpoint needs
    // the idToken cookie to identify who's logging out.
    await logClientActivity("LOGOUT");

    await endSession();

    router.push("/login");
  };

  const parentName =
    parent?.visibleName ||
    `${parent?.firstName ?? ""} ${parent?.lastName ?? ""}`.trim();

  const parentInitial = getInitial(parentName, "P");

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white/90 backdrop-blur-sm border-b border-violet-100 shadow-sm flex items-center px-3 sm:px-5 gap-4 z-50">
      {/* LEFT */}
      <div className="flex items-center gap-3">
        {/* Hamburger */}
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open menu"
          className="w-9 h-9 rounded-full bg-brand text-white flex items-center justify-center hover:bg-brand-dark shadow-playful transition active:scale-[0.97] lg:hidden"
        >
          <Menu size={18} />
        </button>

        {/* Logo — clickable back to the dashboard, same as HOME */}
        <button
          type="button"
          onClick={() => router.push("/parent")}
          className="flex shrink-0 items-center gap-2"
          aria-label="Go to dashboard"
        >
          <BrandLogo className="h-9 w-auto" priority />
        </button>
      </div>

      {/* RIGHT */}
      <div className="ml-auto flex items-center gap-2 sm:gap-4">
        {/* Home */}
        <button
          type="button"
          onClick={() => router.push("/parent")}
          className="hidden sm:block text-sm font-bold tracking-wide text-brand hover:text-brand-dark transition"
        >
          HOME
        </button>

        {/* Search — visual only, not wired to a backend search yet */}
        <div className="relative hidden md:block">
          <input
            type="text"
            placeholder="Find a course..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-48 h-9 rounded-full border-2 border-violet-100 bg-violet-50/50 px-4 pr-9 text-sm outline-none focus:border-brand-light focus:bg-white transition"
          />

          <Search
            size={15}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand"
          />
        </div>

        {/* Demo coupons — balance, buy more, upcoming demos.
            Moved here from the dashboard (Aug 30, 2026); see
            DemoCouponButton.tsx. */}
        <DemoCouponButton />

        {/* Wallet — balance + add-money, mirrors DemoCouponButton's
            dropdown pattern. Added Sep 7, 2026, see WalletBadge.tsx. */}
        <WalletBadge />

        {/* Notification — replaced the static placeholder (was
            waiting on Notification Center, 06-OPEN-DECISIONS.md #32)
            with a working dropdown, see NotificationBell.tsx. */}
        <NotificationBell />

        <div className="hidden sm:block w-px h-8 bg-violet-100" />

        {/* Parent Name + avatar */}
        <div className="hidden sm:flex items-center gap-2">
          <span className="max-w-28 truncate text-sm font-semibold text-gray-700">
            {parentName || "Parent"}
          </span>
          <span className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-300 to-brand-yellow flex items-center justify-center text-sm font-bold text-violet-900 shadow-sm flex-shrink-0">
            {parentInitial}
          </span>
        </div>

        {/* Logout */}
        <button
          type="button"
          onClick={handleLogout}
          // Icon-only 36px tap target on phones frees header width; full "Logout" label from sm up.
          aria-label="Log out"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-gray-500 hover:text-brand transition sm:size-auto"
        >
          <LogOut size={18} className="sm:hidden" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
