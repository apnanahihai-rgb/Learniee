/**
 * Which screens (API read paths) must refetch when a database table
 * changes. Used by the `/api/realtime` stream; the paths are the same
 * ones `useAutoRefresh` hooks declare in `paths`, matched segment-aware
 * by `pathsOverlap` in `src/lib/refreshBus.ts` (so `/api/parent/chat`
 * also covers `/api/parent/chat/<roomId>/messages`).
 *
 * `scope`:
 *  - "owner": rows belong to one parent / teacher. A parent or teacher
 *    tab is told about a change only when the row is theirs (staff roles
 *    — admin, accounts, hr, it — hear about all of them). If the row
 *    carries no owner id the change is delivered to everyone.
 *  - "all": shared data (courses, teacher directory…) — every tab.
 *
 * Tables not listed here never trigger a refresh. Keys are the Postgres
 * table names, which equal the Prisma model names.
 */
export type ChangeScope = "owner" | "all";

export interface ResourceRule {
  paths: string[];
  scope: ChangeScope;
}

const PARENT_CLASS_VIEWS = [
  "/api/parent/my-classes",
  "/api/parent/calendar",
  "/api/parent/enrollments",
  "/api/parent/class-sessions",
  "/api/parent/next-action",
];

const TEACHER_CLASS_VIEWS = [
  "/api/teacher/my-classes",
  "/api/teacher/calendar",
  "/api/teacher/enrollments",
  "/api/teacher/class-sessions",
];

const CHAT = ["/api/parent/chat", "/api/teacher/chat", "/api/admin/chat"];

export const RESOURCE_MAP: Record<string, ResourceRule> = {
  // People
  ParentProfile: {
    scope: "owner",
    paths: ["/api/parent/profile", "/api/admin/directory/parents", "/api/admin/users", "/api/admin/user-details"],
  },
  Admin: { scope: "all", paths: ["/api/admin/profile", "/api/admin/users"] },
  Student: {
    scope: "owner",
    paths: ["/api/parent/students", "/api/admin/user-details", "/api/admin/directory/parents"],
  },
  Teacher: {
    scope: "all",
    paths: [
      "/api/teacher/profile",
      "/api/teacher/onboarding",
      "/api/admin/teachers",
      "/api/admin/directory/teachers",
      "/api/admin/users",
      "/api/admin/user-details",
      "/api/teacher-profiles",
    ],
  },
  TeacherProfessional: {
    scope: "all",
    paths: ["/api/teacher/profile", "/api/teacher/onboarding", "/api/admin/teachers", "/api/teacher-profiles"],
  },
  TeacherFile: { scope: "all", paths: ["/api/teacher/profile", "/api/admin/teachers"] },
  TeacherDocuments: { scope: "all", paths: ["/api/teacher/profile", "/api/admin/teachers"] },
  StaffAccount: {
    scope: "all",
    paths: ["/api/admin/staff-accounts", "/api/admin/account-access", "/api/it/account-access"],
  },

  // Courses, demos, enrollments
  Course: {
    scope: "all",
    paths: [
      "/api/teacher/course",
      "/api/admin/courses",
      "/api/parent/courses",
      "/api/teacher-profiles",
      "/api/parent/my-classes",
      "/api/teacher/my-classes",
    ],
  },
  Review: {
    scope: "all",
    paths: ["/api/parent/courses", "/api/teacher/course", "/api/teacher-profiles", "/api/admin/courses"],
  },
  DemoCoupon: { scope: "owner", paths: ["/api/parent/demo-coupons", "/api/parent/invoices"] },
  DemoFeedback: { scope: "owner", paths: ["/api/parent/next-action", "/api/parent/demo-feedback"] },
  DemoCouponPurchase: { scope: "owner", paths: ["/api/parent/demo-coupons", "/api/parent/invoices"] },
  DemoBooking: {
    scope: "owner",
    paths: [
      "/api/parent/demo-bookings",
      "/api/parent/next-action",
      "/api/teacher/demo-bookings",
      "/api/parent/demo-coupons",
      "/api/parent/calendar",
      "/api/teacher/calendar",
    ],
  },
  Enrollment: {
    scope: "owner",
    paths: [
      ...PARENT_CLASS_VIEWS,
      ...TEACHER_CLASS_VIEWS,
      "/api/admin/enrollments",
      "/api/parent/invoices",
      "/api/accounts",
    ],
  },
  EnrollmentCycle: {
    scope: "owner",
    paths: [...PARENT_CLASS_VIEWS, ...TEACHER_CLASS_VIEWS, "/api/admin/enrollments"],
  },
  ClassSession: {
    scope: "owner",
    paths: [...PARENT_CLASS_VIEWS, ...TEACHER_CLASS_VIEWS, "/api/admin/session-reviews"],
  },
  SessionOutcomeDecision: {
    scope: "owner",
    paths: ["/api/parent/class-sessions", "/api/teacher/class-sessions", "/api/admin/session-reviews"],
  },
  RescheduleRequest: {
    scope: "owner",
    paths: [
      "/api/parent/reschedule-requests",
      "/api/teacher/reschedule-requests",
      "/api/parent/calendar",
      "/api/teacher/calendar",
      "/api/parent/my-classes",
      "/api/teacher/my-classes",
    ],
  },
  LeaveRequest: {
    scope: "owner",
    paths: ["/api/teacher/leave-requests", "/api/admin/leave-requests", "/api/teacher/calendar", "/api/parent/calendar"],
  },
  TeacherStrike: { scope: "owner", paths: ["/api/admin/teacher-strikes", "/api/teacher/profile"] },
  Homework: { scope: "owner", paths: ["/api/parent/homework", "/api/teacher/homework"] },
  HomeworkSubmission: { scope: "owner", paths: ["/api/parent/homework", "/api/teacher/homework"] },
  Resource: {
    scope: "owner",
    paths: ["/api/parent/resources", "/api/teacher/resources", "/api/admin/resources"],
  },
  Certificate: {
    scope: "owner",
    paths: ["/api/parent/certificates", "/api/parent/students", "/api/teacher/certificates"],
  },
  Referral: { scope: "owner", paths: ["/api/parent/referral"] },

  // Money
  Invoice: {
    scope: "owner",
    paths: ["/api/parent/invoices", "/api/accounts/invoices", "/api/accounts/analytics"],
  },
  Wallet: { scope: "owner", paths: ["/api/parent/wallet", "/api/accounts/wallet", "/api/parent/invoices"] },
  WalletTransaction: { scope: "all", paths: ["/api/parent/wallet", "/api/accounts/wallet"] },
  RefundRequest: {
    scope: "owner",
    paths: ["/api/parent/refund-requests", "/api/admin/refund-requests", "/api/parent/wallet"],
  },
  TuitionLedgerEntry: {
    scope: "owner",
    paths: ["/api/accounts", "/api/admin/payout-review", "/api/teacher/earnings"],
  },
  BankAccount: {
    scope: "owner",
    paths: ["/api/teacher/bank-account", "/api/admin/bank-accounts", "/api/accounts/payout-queue"],
  },
  PayoutBatch: {
    scope: "all",
    paths: ["/api/accounts", "/api/admin/payout-review", "/api/teacher/earnings"],
  },
  PayoutRecord: {
    scope: "owner",
    paths: ["/api/accounts", "/api/admin/payout-review", "/api/teacher/earnings"],
  },

  // Chat
  ChatRoom: { scope: "owner", paths: CHAT },
  ChatMessage: { scope: "owner", paths: CHAT },
  ChatSafetyFlag: { scope: "all", paths: ["/api/admin/chat-reports", "/api/admin/chat"] },
  ChatMessageReport: { scope: "all", paths: ["/api/admin/chat-reports", ...CHAT] },

  // Requests, complaints, content, system
  ClassRequest: {
    scope: "owner",
    paths: ["/api/parent/class-requests", "/api/teacher/class-requests", "/api/admin/class-requests"],
  },
  // Carries only the responding teacher's id, but the requesting parent
  // must hear about it too — so it goes to everyone.
  ClassRequestResponse: {
    scope: "all",
    paths: ["/api/parent/class-requests", "/api/teacher/class-requests", "/api/admin/class-requests"],
  },
  Complaint: {
    scope: "all",
    paths: ["/api/parent/complaints", "/api/teacher/complaints", "/api/admin/complaints", "/api/staff/complaints"],
  },
  BlogPost: { scope: "owner", paths: ["/api/teacher/blogs", "/api/admin/blogs"] },
  Notification: { scope: "owner", paths: ["/api/notifications"] },
  ActivityLog: { scope: "all", paths: ["/api/admin/activity-logs"] },
};
