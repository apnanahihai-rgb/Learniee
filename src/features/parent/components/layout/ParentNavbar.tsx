"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { Menu, Bell, Search, UserCircle } from "lucide-react";

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

  useEffect(() => {
    async function fetchParent() {
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
    }

    fetchParent();
  }, []);

  const handleLogout = () => {
    Cookies.remove("idToken");

    router.push("/login");
  };

  const parentName =
    parent?.visibleName ||
    `${parent?.firstName ?? ""} ${parent?.lastName ?? ""}`.trim();

  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-white shadow-sm flex items-center px-3 sm:px-4 gap-4 z-50">
      {/* LEFT */}
      <div className="flex items-center gap-4">
        {/* Hamburger */}
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open menu"
          className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center hover:bg-purple-700 transition"
        >
          <Menu size={18} />
        </button>

        {/* Logo */}
        <div className="text-lg font-semibold text-gray-800">Logo</div>
      </div>

      {/* RIGHT */}
      <div className="ml-auto flex items-center gap-3 sm:gap-5">
        {/* Home */}
        <button
          type="button"
          onClick={() => router.push("/parent")}
          className="hidden sm:block text-purple-600 font-medium hover:text-purple-700 transition"
        >
          HOME
        </button>

        {/* Notification — static for now. Notification Center
            (grouped buckets, admin toggle, subscribe/unsubscribe)
            is a Phase 2 feature, see 06-OPEN-DECISIONS.md #32. */}
        <button
          type="button"
          aria-label="Notifications"
          className="text-purple-600 hover:text-purple-700 transition"
        >
          <Bell size={18} />
        </button>

        {/* Search — visual only, not wired to a backend search yet */}
        <div className="relative hidden md:block">
          <input
            type="text"
            placeholder="Find course..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-44 h-8 rounded-full border border-purple-400 px-4 pr-9 text-xs outline-none focus:ring-2 focus:ring-purple-200"
          />

          <Search
            size={15}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-600"
          />
        </div>

        {/* Parent Name */}
        <div className="hidden sm:block max-w-32 truncate text-sm text-gray-700">
          {parentName || "Parent"}
        </div>

        {/* Logout */}
        <button
          type="button"
          onClick={handleLogout}
          className="text-sm text-gray-800 hover:text-purple-600 transition"
        >
          Logout
        </button>

        {/* Profile */}
        <UserCircle size={30} strokeWidth={1.5} className="text-gray-600" />
      </div>
    </header>
  );
}
