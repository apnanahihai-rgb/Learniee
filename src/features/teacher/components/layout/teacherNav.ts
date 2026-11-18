import {
  LayoutDashboard,
  BookOpen,
  ListChecks,
  Users,
  Calendar,
  Wallet,
  Newspaper,
  User,
  LifeBuoy,
  type LucideIcon,
} from "lucide-react";

export interface TeacherNavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  /** Route prefix that owns this item. */
  base: string;
  /** Extra prefixes that keep the item highlighted (old routes, detail pages). */
  matches?: string[];
  /** Key of a live count shown as a badge (see TeacherSidebar / TeacherBottomNav). */
  badgeKey?: "requests";
}

// Same 9 hub pages as before the redesign (docs/NAVIGATION-RESTRUCTURE.md);
// only the look changed. `matches` keeps an item highlighted on the old routes
// that redirect into a hub tab and on detail pages.
export const TEACHER_NAV: Record<string, TeacherNavItem> = {
  home: { id: "home", label: "Home", href: "/teacher", base: "/teacher", icon: LayoutDashboard },
  courses: {
    id: "courses",
    label: "Courses",
    href: "/teacher/courses",
    base: "/teacher/courses",
    matches: ["/teacher/course-management", "/teacher/vacancy"],
    icon: BookOpen,
  },
  classes: {
    id: "classes",
    label: "My classes",
    href: "/teacher/my-classes",
    base: "/teacher/my-classes",
    matches: [
      "/teacher/enrollments",
      "/teacher/hw-tests",
      "/teacher/resources",
      "/teacher/certificates",
      "/teacher/chat",
    ],
    icon: ListChecks,
  },
  requests: {
    id: "requests",
    label: "Requests",
    href: "/teacher/requests",
    base: "/teacher/requests",
    matches: ["/teacher/demo", "/teacher/reschedule"],
    badgeKey: "requests",
    icon: Users,
  },
  calendar: {
    id: "calendar",
    label: "Calendar",
    href: "/teacher/calendar",
    base: "/teacher/calendar",
    matches: ["/teacher/leave", "/teacher/classes"],
    icon: Calendar,
  },
  earnings: {
    id: "earnings",
    label: "Earnings",
    href: "/teacher/earnings",
    base: "/teacher/earnings",
    matches: ["/teacher/bank-account", "/teacher/rate-calculator"],
    icon: Wallet,
  },
  blogs: { id: "blogs", label: "Blogs", href: "/teacher/blogs", base: "/teacher/blogs", icon: Newspaper },
  account: {
    id: "account",
    label: "Account",
    href: "/teacher/account",
    base: "/teacher/account",
    matches: ["/teacher/profile", "/teacher/settings"],
    icon: User,
  },
  help: { id: "help", label: "Help", href: "/teacher/complain", base: "/teacher/complain", icon: LifeBuoy },
};

/** Sidebar order, with separators between groups. */
export const TEACHER_SIDEBAR_GROUPS: string[][] = [
  ["home", "courses", "classes", "requests", "calendar"],
  ["earnings", "blogs"],
  ["account", "help"],
];

export const TEACHER_BOTTOM_NAV_IDS = ["home", "classes", "requests", "calendar"];
export const TEACHER_MORE_NAV_IDS = ["courses", "earnings", "blogs", "account", "help"];

const under = (path: string, p: string) => path === p || path.startsWith(`${p}/`);

export function isTeacherNavActive(item: TeacherNavItem, pathname: string): boolean {
  // "/teacher" needs an exact match, otherwise Home would be active everywhere.
  if (item.id === "home") return pathname === "/teacher";
  return [item.base, ...(item.matches ?? [])].some((p) => under(pathname, p));
}
