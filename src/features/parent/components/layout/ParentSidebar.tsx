"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Search,
  ListChecks,
  Calendar,
  CreditCard,
  Newspaper,
  User,
  LifeBuoy,
  X,
  type LucideIcon,
} from "lucide-react";

interface MenuItem {
  label: string;
  path: string;
  icon: LucideIcon;
  /**
   * Other route prefixes that belong to this item (its old pages, which now
   * redirect into a hub tab, and detail pages) so it stays highlighted there.
   */
  matches?: string[];
  /** Key of a live count shown as a badge (see TeacherSidebar). */
  badgeKey?: "requests";
}

interface MenuSection {
  label: string;
  items: MenuItem[];
}

// Navigation restructure (Oct 19, 2026, docs/NAVIGATION-RESTRUCTURE.md):
// 19 items -> 8. Each item is a hub page with tabs (?tab=...); the old
// routes (/parent/free-demo, /parent/wallet, ...) redirect into the hub, and
// `matches` keeps the right item highlighted on them and on detail pages.
// Parent journey: Find -> Try -> Learn -> Pay -> Account.
//
// Still deferred (no menu item): Favorites, Learnie Mall, Gift, FAQs, Go Live.
// "Reviews" has no page of its own - reviews are written from the course page.
const menuSections: MenuSection[] = [
  {
    label: "Learn",
    items: [
      { label: "Home", path: "/parent", icon: LayoutDashboard },
      {
        label: "Find a Course",
        path: "/parent/courses",
        icon: Search,
        matches: ["/parent/teachers", "/parent/request-class"],
      },
      {
        label: "My Classes",
        path: "/parent/my-classes",
        icon: ListChecks,
        matches: [
          "/parent/free-demo",
          "/parent/demo-feedback",
          "/parent/homework-tests",
          "/parent/chat",
          "/parent/resources",
          "/parent/enrollments",
          "/parent/certificates",
        ],
      },
      {
        label: "Calendar",
        path: "/parent/calendar",
        icon: Calendar,
        matches: ["/parent/reschedule", "/parent/classes"],
      },
    ],
  },
  {
    label: "Manage",
    items: [
      {
        label: "Payments",
        path: "/parent/payments",
        icon: CreditCard,
        matches: ["/parent/wallet", "/parent/referral"],
      },
      { label: "Blogs", path: "/parent/blogs", icon: Newspaper },
    ],
  },
  {
    label: "Account & Support",
    items: [
      {
        label: "Account",
        path: "/parent/account",
        icon: User,
        matches: ["/parent/profile", "/parent/settings", "/parent/students"],
      },
      { label: "Help", path: "/parent/complain", icon: LifeBuoy },
    ],
  },
];

interface ParentSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ParentSidebar({ isOpen, onClose }: ParentSidebarProps) {
  // Escape closes the mobile drawer (keyboards, tablets, screen readers).
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const router = useRouter();
  const pathname = usePathname();

  const handleNavigation = (path: string) => {
    router.push(path);
    onClose();
  };

  const renderItem = (item: MenuItem) => {
    const Icon = item.icon;

    // "/parent" needs an exact match, otherwise Home would be active everywhere.
    const isActive =
      item.path === "/parent"
        ? pathname === "/parent"
        : [item.path, ...(item.matches ?? [])].some(
            (p) => pathname === p || pathname.startsWith(`${p}/`),
          );

    return (
      <button
        key={item.path}
        type="button"
        onClick={() => handleNavigation(item.path)}
        className={`
          group w-full flex items-center gap-3 text-left text-sm py-2 px-3 rounded-xl transition-colors duration-150 ease-out motion-reduce:transition-none
          ${
            isActive
              ? "bg-white text-brand-dark font-bold shadow-playful"
              : "text-white/85 hover:bg-white/10 hover:text-white"
          }
        `}
      >
        <span
          className={`
            w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors
            ${
              isActive
                ? "bg-brand-yellow text-violet-900"
                : "bg-white/10 text-white group-hover:bg-white/20"
            }
          `}
        >
          <Icon size={14} strokeWidth={2} />
        </span>
        <span className="truncate">{item.label}</span>
      </button>
    );
  };

  return (
    <>
      {/* Mobile / Tablet overlay */}
      {/* Always mounted so it can fade in step with the drawer; pointer-events-none when closed so it never eats taps. Blur dropped: a full-screen backdrop blur is costly on phones. */}
      <div
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-violet-950/45 transition-opacity duration-200 ease-out motion-reduce:transition-none lg:hidden ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />

      <aside
        className={`
          fixed top-16 bottom-0 left-0 z-40 w-64
          bg-gradient-to-b from-brand-light to-brand-dark
          rounded-r-[2rem] px-4 py-6 text-white overflow-y-auto
          transform transition-[transform,visibility] ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none
          ${isOpen ? "translate-x-0 duration-[250ms]" : "invisible -translate-x-full lg:visible lg:translate-x-0 duration-200"}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6 px-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/60">
              Welcome back
            </p>
            <h2 className="font-heading text-2xl font-bold text-brand-yellow leading-tight">
              Parent Hub
            </h2>
          </div>

          {/* Mobile close button */}
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition active:scale-[0.97]"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Menu, grouped into labelled sections instead of one long
            undifferentiated list — makes it easier to scan/find an
            item, and keeps related actions (e.g. Reschedule/Payments)
            visually together. */}
        <nav className="space-y-5">
          {menuSections.map((section) => (
            <div key={section.label}>
              <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-white/40">
                {section.label}
              </p>
              <div className="space-y-1">{section.items.map(renderItem)}</div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
