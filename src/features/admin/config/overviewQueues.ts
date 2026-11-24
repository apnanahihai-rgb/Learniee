import {
  ADMIN_NAV_ITEMS,
  type AdminCountKey,
  type AdminNavItem,
} from "@/features/admin/config/adminNav";

export interface OverviewQueue {
  countKey: AdminCountKey;
  note: string;
}

// Four queues that get the large rows. Order is the order Admin sees.
export const PRIORITY_QUEUES: OverviewQueue[] = [
  { countKey: "teachers", note: "Teachers waiting for approval" },
  { countKey: "refunds", note: "Parents asking for a wallet credit" },
  { countKey: "payouts", note: "Held or rejected by Accounts" },
  { countKey: "chatReports", note: "Flagged by a parent or teacher" },
];

export const OTHER_QUEUES: OverviewQueue[] = [
  { countKey: "courses", note: "Courses teachers have submitted for review" },
  { countKey: "enrollments", note: "Enrollments the teacher has already approved" },
  { countKey: "classReviews", note: "Reported classes and ones that need an outcome" },
  { countKey: "complaints", note: "Parent and teacher issues awaiting a response" },
  { countKey: "leave", note: "Teacher leave to approve or reject" },
  { countKey: "classRequests", note: "Custom classes parents asked for" },
  { countKey: "bankAccounts", note: "Teacher payout bank details to approve" },
  { countKey: "strikes", note: "Recent missed or late-cancelled classes, waive if needed" },
  { countKey: "blogs", note: "Teacher posts to review before they go live" },
];

/** The nav entry (label, link, icon) behind a queue. */
export function navItemForQueue(key: AdminCountKey): AdminNavItem {
  const item = ADMIN_NAV_ITEMS.find((candidate) => candidate.countKey === key);

  if (!item) throw new Error(`No admin nav item for count key "${key}"`);

  return item;
}
