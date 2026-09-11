"use client";

import { useState } from "react";

import ParentNavbar from "@/features/parent/components/layout/ParentNavbar";
import ParentSidebar from "@/features/parent/components/layout/ParentSidebar";

export default function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-violet-50/40 print:bg-white">
      {/* Fixed Navbar — hidden when printing/saving an invoice as PDF */}
      <div className="print:hidden">
        <ParentNavbar onMenuClick={() => setSidebarOpen((prev) => !prev)} />
      </div>

      {/* Fixed Sidebar — hidden when printing/saving an invoice as PDF */}
      <div className="print:hidden">
        <ParentSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* Page Content */}
      <main className="min-h-screen pt-16 lg:pl-64 bg-gradient-to-b from-violet-50 via-white to-white print:pt-0 print:pl-0 print:bg-none">
        {children}
      </main>
    </div>
  );
}
