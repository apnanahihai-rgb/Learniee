import {
  AlertCircle,
  FileText,
  Landmark,
  LayoutDashboard,
  ListChecks,
  PieChart,
  Receipt,
  RefreshCw,
  Video,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type AccountsBadgeKey = "pendingVerification" | "queuedForPayment";

export interface AccountsNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Which live count (if any) to show as a badge. */
  badgeKey?: AccountsBadgeKey;
}

export interface AccountsNavGroup {
  label: string;
  items: AccountsNavItem[];
}

/** Single source of truth for the Accounts sidebar. */
export const ACCOUNTS_NAV: AccountsNavGroup[] = [
  {
    label: "",
    items: [{ label: "Overview", href: "/accounts", icon: LayoutDashboard }],
  },
  {
    label: "Teacher payouts",
    items: [
      { label: "Ongoing Cycles", href: "/accounts/cycles", icon: RefreshCw },
      { label: "Verify Payouts", href: "/accounts/verify", icon: ListChecks, badgeKey: "pendingVerification" },
      { label: "Payment Queue", href: "/accounts/payment-queue", icon: Landmark, badgeKey: "queuedForPayment" },
    ],
  },
  {
    label: "Money in",
    items: [
      { label: "Revenue Ledger", href: "/accounts/revenue", icon: Receipt },
      { label: "Demo Bookings", href: "/accounts/demo-bookings", icon: Video },
      { label: "Invoices", href: "/accounts/invoices", icon: FileText },
      { label: "Parent Wallets", href: "/accounts/wallets", icon: Wallet },
    ],
  },
  {
    label: "Insight & support",
    items: [
      { label: "Analytics", href: "/accounts/analytics", icon: PieChart },
      { label: "Complaints", href: "/accounts/complaints", icon: AlertCircle },
    ],
  },
];

/** "/accounts" only matches exactly; every other item matches its sub-paths too. */
export function isAccountsNavActive(item: AccountsNavItem, pathname: string): boolean {
  if (item.href === "/accounts") return pathname === "/accounts";

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
