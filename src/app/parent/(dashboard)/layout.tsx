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
    <div className="min-h-screen bg-violet-50/40">
      {/* Fixed Navbar */}
      <ParentNavbar onMenuClick={() => setSidebarOpen((prev) => !prev)} />

      {/* Fixed Sidebar */}
      <ParentSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Page Content */}
      <main className="min-h-screen pt-16 lg:pl-64 bg-gradient-to-b from-violet-50 via-white to-white">
        {children}
      </main>
    </div>
  );
}
