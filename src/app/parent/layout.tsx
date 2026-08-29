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
    <div className="min-h-screen bg-white">
      {/* Fixed Navbar */}
      <ParentNavbar onMenuClick={() => setSidebarOpen((prev) => !prev)} />

      {/* Fixed Sidebar */}
      <ParentSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Page Content */}
      <main className="min-h-screen pt-14 lg:ml-56 bg-gray-50">
        {children}
      </main>
    </div>
  );
}
