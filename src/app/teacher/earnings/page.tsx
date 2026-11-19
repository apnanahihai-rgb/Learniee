"use client";

import { Suspense } from "react";

import PdHubTabs from "@/features/parent/components/PdHubTabs";
import TeacherBankTab from "@/features/teacher/components/earnings/TeacherBankTab";
import TeacherCalculatorTab from "@/features/teacher/components/earnings/TeacherCalculatorTab";
import TeacherEarningsTab from "@/features/teacher/components/earnings/TeacherEarningsTab";

/** What you've earned, when it's paid, and where it goes. */
export default function TeacherEarningsHubPage() {
  return (
    <Suspense fallback={null}>
      <PdHubTabs
        title="Earnings"
        subtitle="What you’ve earned, when it’s paid, and where it goes."
        defaultTab="earnings"
        tabs={[
          { key: "earnings", label: "Earnings", content: <TeacherEarningsTab /> },
          { key: "bank", label: "Bank account", content: <TeacherBankTab /> },
          { key: "calculator", label: "Rate calculator", content: <TeacherCalculatorTab /> },
        ]}
      />
    </Suspense>
  );
}
