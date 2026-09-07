"use client";

import { useState } from "react";

import TeacherNavbar from "@/features/teacher/components/layout/TeacherNavbar";
import TeacherSidebar from "@/features/teacher/components/layout/TeacherSidebar";

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="min-h-screen bg-violet-50/40">
      {/* Fixed Navbar */}
      <TeacherNavbar
        onMenuClick={() =>
          setSidebarOpen((prev) => !prev)
        }
      />

      {/* Fixed Sidebar */}
      <TeacherSidebar
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