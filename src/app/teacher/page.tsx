"use client";

import { useState } from "react";

import TeacherNavbar from "@/components/teacher/TeacherNavbar";
import TeacherSidebar from "@/components/teacher/TeacherSidebar";

export default function TeacherDashboard() {
  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  return (
    <div className="min-h-screen bg-white">

      {/* Navbar */}
      <TeacherNavbar
        onMenuClick={() =>
          setSidebarOpen((prev) => !prev)
        }
      />

      <div className="flex">

        {/* Sidebar */}
        <TeacherSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main content */}
        <main className="flex-1 min-w-0 p-5 sm:p-8">

          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-800">
            Welcome Teacher
          </h1>

          <p className="mt-2 text-sm sm:text-base text-gray-500">
            Welcome to your Learniee teacher dashboard.
          </p>

        </main>

      </div>

    </div>
  );
}