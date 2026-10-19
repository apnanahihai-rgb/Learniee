"use client";

import { Suspense } from "react";

import HubTabs from "@/features/shared/components/HubTabs";
import PaymentsView from "@/features/parent/components/views/PaymentsView";
import WalletView from "@/features/parent/components/views/WalletView";
import ReferralView from "@/features/parent/components/views/ReferralView";

export default function ParentPaymentsHubPage() {
  return (
    <Suspense fallback={null}>
      <HubTabs
        defaultTab="payments"
        tabs={[
          { key: "payments", label: "Payments & invoices", content: <PaymentsView /> },
          { key: "wallet", label: "Wallet", content: <WalletView /> },
          { key: "referral", label: "Referral", content: <ReferralView /> },
        ]}
      />
    </Suspense>
  );
}
