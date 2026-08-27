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
    <div className="min-h-screen bg-white">
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
      <main className="min-h-screen pt-14 lg:ml-52">
        {children}
      </main>
    </div>
  );
}