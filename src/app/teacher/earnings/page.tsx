"use client";

import { Suspense } from "react";

import HubTabs from "@/features/shared/components/HubTabs";
import EarningsView from "@/features/teacher/components/views/EarningsView";
import BankAccountView from "@/features/teacher/components/views/BankAccountView";
import RateCalculatorView from "@/features/teacher/components/views/RateCalculatorView";

export default function TeacherEarningsHubPage() {
  return (
    <Suspense fallback={null}>
      <HubTabs
        defaultTab="earnings"
        tabs={[
          { key: "earnings", label: "Earnings", content: <EarningsView /> },
          { key: "bank", label: "Bank account", content: <BankAccountView /> },
          { key: "calculator", label: "Rate calculator", content: <RateCalculatorView /> },
        ]}
      />
    </Suspense>
  );
}
