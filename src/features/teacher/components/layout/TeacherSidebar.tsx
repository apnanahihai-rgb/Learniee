"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Wallet,
  User,
  BookOpen,
  Newspaper,
  Inbox,
  GraduationCap,
  LifeBuoy,
  X,
  type LucideIcon,
} from "lucide-react";

import { useTeacherRequestCount } from "@/features/teacher/hooks/useTeacherRequestCount";

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
// 21 items -> 9. Each item is a hub page with tabs (?tab=...); the old
// routes (/teacher/enrollments, /teacher/leave, ...) redirect into the hub,
// and `matches` keeps the right item highlighted on them and on detail pages.
// "Requests" is the one place for what needs the teacher's reply (count badge).
//
// "Go Live" is removed: it was a dead link and is deferred scope.
const menuSections: MenuSection[] = [
  {
    label: "Teach",
    items: [
      { label: "Home", path: "/teacher", icon: LayoutDashboard },
      {
        label: "My Courses",
        path: "/teacher/courses",
        icon: BookOpen,
        matches: ["/teacher/course-management", "/teacher/vacancy"],
      },
      {
        label: "My Classes",
        path: "/teacher/my-classes",
        icon: GraduationCap,
        matches: [
          "/teacher/enrollments",
          "/teacher/hw-tests",
          "/teacher/resources",
          "/teacher/certificates",
          "/teacher/chat",
        ],
      },
      {
        label: "Requests",
        path: "/teacher/requests",
        icon: Inbox,
        matches: ["/teacher/demo", "/teacher/reschedule"],
        badgeKey: "requests",
      },
      {
        label: "Calendar",
        path: "/teacher/calendar",
        icon: CalendarDays,
        matches: ["/teacher/leave", "/teacher/classes"],
      },
    ],
  },
  {
    label: "Earn & Share",
    items: [
      {
        label: "Earnings",
        path: "/teacher/earnings",
        icon: Wallet,
        matches: ["/teacher/bank-account", "/teacher/rate-calculator"],
      },
      { label: "Blogs", path: "/teacher/blogs", icon: Newspaper },
    ],
  },
  {
    label: "Account & Support",
    items: [
      {
        label: "Account",
        path: "/teacher/account",
        icon: User,
        matches: ["/teacher/profile", "/teacher/settings"],
      },
      { label: "Help", path: "/teacher/complain", icon: LifeBuoy },
    ],
  },
];

interface TeacherSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TeacherSidebar({ isOpen, onClose }: TeacherSidebarProps) {
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
  const requestCount = useTeacherRequestCount();

  const handleNavigation = (path: string) => {
    router.push(path);
    onClose();
  };

  const renderItem = (item: MenuItem) => {
    const Icon = item.icon;

    // "/teacher" needs an exact match — otherwise it'd prefix-match
    // every teacher sub-route and Home would show as active everywhere.
    const isActive =
      item.path === "/teacher"
        ? pathname === "/teacher"
        : [item.path, ...(item.matches ?? [])].some(
            (p) => pathname === p || pathname.startsWith(`${p}/`),
          );
    const badge = item.badgeKey === "requests" ? requestCount.total : 0;

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
        {badge > 0 && (
          <span
            aria-label={`${badge} waiting for you`}
            className="ml-auto rounded-full bg-brand-yellow px-1.5 py-0.5 text-[10px] font-bold leading-none text-violet-900"
          >
            {badge > 99 ? "99+" : badge}
          </span>
        )}
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
              Teacher Hub
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

        {/* Menu, grouped into labelled sections — Main (built
            features) first, then remaining placeholder routes
            grouped by theme instead of one long undifferentiated
            list, same pattern as ParentSidebar. */}
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
