import AccountsNavbar from "@/features/accounts/components/layout/AccountsNavbar";

export default function AccountsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-violet-50/40">
      <AccountsNavbar />
      <main className="min-h-screen pt-16 bg-gradient-to-b from-violet-50 via-white to-white">
        {children}
      </main>
    </div>
  );
}
