"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  RefreshCw,
  Calculator,
  User,
  BookOpen,
  Briefcase,
  FileText,
  Users,
  Award,
  School,
  Newspaper,
  ClipboardCheck,
  LogOut,
  Video,
  Radio,
  MessageCircle,
  ListChecks,
  X,
  type LucideIcon,
} from "lucide-react";

interface MenuItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

interface MenuSection {
  label: string;
  items: MenuItem[];
}

// Grouped + reordered (Sep 7, 2026) to match the same problem/fix
// ParentSidebar already had: "Home" was missing entirely, and on
// mobile TeacherNavbar's HOME button is hidden (`hidden sm:block`),
// so there was previously no way back to /teacher except browser
// back. It's now the first item here, same as ParentSidebar.
//
// Sections below put what's actually built first (Main), then group
// the remaining placeholder items by theme instead of leaving them
// as one long, arbitrarily-ordered list — see 01-PROJECT-STATUS.md
// / 05-MODULE-SPECS-INDEX.md for what's built vs. still a
// placeholder route on the Teacher side.
const menuSections: MenuSection[] = [
  {
    label: "Main",
    items: [
      { label: "Home", path: "/teacher", icon: LayoutDashboard },
      { label: "Course Management", path: "/teacher/course-management", icon: BookOpen },
      { label: "Enrollments", path: "/teacher/enrollments", icon: ListChecks },
      { label: "Calendar", path: "/teacher/calendar", icon: CalendarDays },
      { label: "Chat", path: "/teacher/chat", icon: MessageCircle },
    ],
  },
  {
    label: "Classes & Students",
    items: [
      { label: "Class", path: "/teacher/class", icon: School },
      { label: "Students Management", path: "/teacher/students", icon: Users },
      { label: "HW & Tests", path: "/teacher/hw-tests", icon: ClipboardCheck },
      { label: "Reschedule", path: "/teacher/reschedule", icon: RefreshCw },
      { label: "Leave", path: "/teacher/leave", icon: LogOut },
    ],
  },
  {
    label: "Growth & Earnings",
    items: [
      { label: "Rate Calculator", path: "/teacher/rate-calculator", icon: Calculator },
      { label: "Reports", path: "/teacher/reports", icon: FileText },
      { label: "Certificate Management", path: "/teacher/certificates", icon: Award },
      { label: "Vacancy", path: "/teacher/vacancy", icon: Briefcase },
    ],
  },
  {
    label: "Community & Live",
    items: [
      { label: "Blogs", path: "/teacher/blogs", icon: Newspaper },
      { label: "Demo", path: "/teacher/demo", icon: Video },
      { label: "Go Live", path: "/teacher/go-live", icon: Radio },
    ],
  },
  {
    label: "Account",
    items: [{ label: "Profile", path: "/teacher/profile", icon: User }],
  },
];

interface TeacherSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TeacherSidebar({ isOpen, onClose }: TeacherSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();

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
        : pathname === item.path || pathname.startsWith(`${item.path}/`);

    return (
      <button
        key={item.path}
        type="button"
        onClick={() => handleNavigation(item.path)}
        className={`
          w-full flex items-center gap-2 text-left text-sm py-1.5 rounded-md transition
          ${isActive ? "text-yellow-300 font-semibold" : "text-white hover:text-yellow-200"}
        `}
      >
        <Icon size={15} strokeWidth={1.8} />
        <span>{item.label}</span>
      </button>
    );
  };

  return (
    <>
      {/* Mobile / Tablet overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-14 bottom-0 left-0 z-40 w-52
          bg-purple-500 rounded-r-2xl px-5 py-7 text-white overflow-y-auto
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-2xl font-bold text-yellow-300">Teacher</h2>

          {/* Mobile close button */}
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden text-white hover:text-yellow-200"
            aria-label="Close menu"
          >
            <X size={22} />
          </button>
        </div>

        {/* Menu, grouped into labelled sections — Main (built
            features) first, then remaining placeholder routes
            grouped by theme instead of one long undifferentiated
            list. */}
        <nav className="space-y-4">
          {menuSections.map((section) => (
            <div key={section.label}>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-white/60">
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
