import {
  AlertCircle,
  Briefcase,
  BookOpen,
  BookOpenCheck,
  Building2,
  CalendarOff,
  ClipboardCheck,
  Flag,
  FolderOpen,
  GraduationCap,
  History,
  KeyRound,
  Landmark,
  LayoutDashboard,
  ListChecks,
  MessageCircle,
  ReceiptIndianRupee,
  RefreshCw,
  ShieldAlert,
  Star,
  UserCheck,
  UserX,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import type { AdminQueueCounts } from "@/features/admin/types/queueCounts";

export type AdminCountKey = keyof AdminQueueCounts;

export interface AdminNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Key into the queue-counts payload; omit for pages with no queue. */
  countKey?: AdminCountKey;
  /** Extra path prefixes that should also highlight this item. */
  matchPrefixes?: string[];
}

export interface AdminNavGroup {
  label: string;
  items: AdminNavItem[];
}

/** Single source of truth for the sidebar and the dashboard queue cards. */
export const ADMIN_NAV: AdminNavGroup[] = [
  {
    label: "",
    items: [{ label: "Overview", href: "/admin", icon: LayoutDashboard }],
  },
  {
    label: "Approvals",
    items: [
      { label: "Teacher applications", href: "/admin/teachers", icon: UserCheck, countKey: "teachers" },
      { label: "Course approvals", href: "/admin/courses", icon: BookOpenCheck, countKey: "courses" },
      { label: "Enrollment approvals", href: "/admin/enrollments", icon: ListChecks, countKey: "enrollments" },
      { label: "Bank accounts", href: "/admin/bank-accounts", icon: Landmark, countKey: "bankAccounts" },
      { label: "Blog posts", href: "/admin/blogs", icon: BookOpen, countKey: "blogs" },
    ],
  },
  {
    label: "Classes and safety",
    items: [
      { label: "Class reviews", href: "/admin/session-reviews", icon: ClipboardCheck, countKey: "classReviews" },
      { label: "Teacher strikes", href: "/admin/teacher-strikes", icon: ShieldAlert, countKey: "strikes" },
      { label: "Leave requests", href: "/admin/leave-requests", icon: CalendarOff, countKey: "leave" },
      { label: "Class requests", href: "/admin/class-requests", icon: Briefcase, countKey: "classRequests" },
      { label: "Chat monitor", href: "/admin/chat", icon: MessageCircle },
      { label: "Reported & flagged messages", href: "/admin/chat-reports", icon: Flag, countKey: "chatReports" },
      { label: "Complaints", href: "/admin/complaints", icon: AlertCircle, countKey: "complaints" },
    ],
  },
  {
    label: "Money",
    items: [
      { label: "Refund requests", href: "/admin/refund-requests", icon: RefreshCw, countKey: "refunds" },
      { label: "Payout review", href: "/admin/payout-review", icon: Wallet, countKey: "payouts" },
      { label: "Accounts", href: "/admin/accounts", icon: ReceiptIndianRupee },
    ],
  },
  {
    label: "People",
    items: [
      { label: "Lowest rated", href: "/admin/lowest-rated", icon: Star },
      { label: "Teacher directory", href: "/admin/teacher-directory", icon: GraduationCap },
      { label: "Parent directory", href: "/admin/parent-directory", icon: Users },
      { label: "Manage users", href: "/admin/users", icon: UserX },
      { label: "Staff accounts", href: "/admin/staff-accounts", icon: Building2 },
      { label: "Account access", href: "/admin/account-access", icon: KeyRound },
    ],
  },
  {
    label: "Records",
    items: [
      { label: "Resource library", href: "/admin/resources", icon: FolderOpen },
      { label: "Activity log", href: "/admin/activity-logs", icon: History },
    ],
  },
];

/** Every nav item, flattened — handy for breadcrumbs and the dashboard. */
export const ADMIN_NAV_ITEMS: AdminNavItem[] = ADMIN_NAV.flatMap((group) => group.items);

export function isNavItemActive(item: AdminNavItem, pathname: string): boolean {
  if (item.href === "/admin") return pathname === "/admin";
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/** Group label for a path (null for Overview or an unknown page). */
export function adminGroupOf(pathname: string): string | null {
  const group = ADMIN_NAV.find(
    (candidate) => candidate.label && candidate.items.some((item) => isNavItemActive(item, pathname)),
  );

  return group ? group.label : null;
}

/** Every screen with its group label, for the "Jump to a screen" search. */
export const ADMIN_SEARCH_ENTRIES: Array<{ label: string; href: string; icon: LucideIcon; group: string }> =
  ADMIN_NAV.flatMap((group) =>
    group.items.map((item) => ({
      label: item.label,
      href: item.href,
      icon: item.icon,
      group: group.label || "Home",
    })),
  );

/** The four shortcuts on the phone bottom bar; everything else is under "More". */
export const ADMIN_BOTTOM_NAV: Array<{
  label: string;
  item: AdminNavItem;
}> = [
  { label: "Overview", item: ADMIN_NAV_ITEMS.find((i) => i.href === "/admin")! },
  { label: "Teachers", item: ADMIN_NAV_ITEMS.find((i) => i.href === "/admin/teachers")! },
  { label: "Refunds", item: ADMIN_NAV_ITEMS.find((i) => i.href === "/admin/refund-requests")! },
  { label: "Complaints", item: ADMIN_NAV_ITEMS.find((i) => i.href === "/admin/complaints")! },
];
