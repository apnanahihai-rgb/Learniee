import AccountsShell from "@/features/accounts/components/layout/AccountsShell";

/**
 * Shared Accounts chrome (sidebar + mobile drawer). Every page under
 * `/accounts` renders inside it, so pages supply content only. Route
 * protection stays in `middleware.ts` and each page's `requireAdminOrAccounts()`.
 */
export default function AccountsLayout({ children }: { children: React.ReactNode }) {
  return <AccountsShell>{children}</AccountsShell>;
}
