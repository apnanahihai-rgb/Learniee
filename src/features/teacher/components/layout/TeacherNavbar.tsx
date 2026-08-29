"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import {
  Menu,
  Bell,
  Search,
  UserCircle,
} from "lucide-react";

interface Teacher {
  firstName: string;
  lastName: string;
  visibleName: string | null;
  email: string;
}

interface TeacherNavbarProps {
  onMenuClick: () => void;
}

export default function TeacherNavbar({
  onMenuClick,
}: TeacherNavbarProps) {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [teacher, setTeacher] = useState<Teacher | null>(null);

  useEffect(() => {
    async function fetchTeacher() {
      try {
        const res = await fetch(
          "/api/teacher/profile"
        );

        if (!res.ok) {
          return;
        }

        const data = await res.json();

        setTeacher(data.teacher);
      } catch (error) {
        console.error(
          "Failed to load teacher:",
          error
        );
      }
    }

    fetchTeacher();
  }, []);

  const handleLogout = () => {
    Cookies.remove("idToken");
    localStorage.removeItem("teacherId");

    router.push("/login");
  };

  const teacherName =
    teacher?.visibleName ||
    `${teacher?.firstName ?? ""} ${
      teacher?.lastName ?? ""
    }`.trim();

  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-white shadow-sm flex items-center px-3 sm:px-4 gap-4 z-50">

      {/* LEFT */}
      <div className="flex items-center gap-4">

        {/* Hamburger */}
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open menu"
          className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center hover:bg-purple-700 transition"
        >
          <Menu size={18} />
        </button>

        {/* Logo */}
        <div className="text-lg font-semibold text-gray-800">
          Logo
        </div>

      </div>

      {/* RIGHT */}
      <div className="ml-auto flex items-center gap-3 sm:gap-5">

        {/* Home */}
        <button
          type="button"
          onClick={() => router.push("/teacher")}
          className="hidden sm:block text-purple-600 font-medium hover:text-purple-700 transition"
        >
          HOME
        </button>

        {/* Notification */}
        <button
          type="button"
          aria-label="Notifications"
          className="text-purple-600 hover:text-purple-700 transition"
        >
          <Bell size={18} />
        </button>

        {/* Search */}
        <div className="relative hidden md:block">

          <input
            type="text"
            placeholder="find course..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            className="w-44 h-8 rounded-full border border-purple-400 px-4 pr-9 text-xs outline-none focus:ring-2 focus:ring-purple-200"
          />

          <Search
            size={15}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-600"
          />

        </div>

        {/* Teacher Name */}
        <div className="hidden sm:block max-w-32 truncate text-sm text-gray-700">
          {teacherName || "Teacher"}
        </div>

        {/* Logout */}
        <button
          type="button"
          onClick={handleLogout}
          className="text-sm text-gray-800 hover:text-purple-600 transition"
        >
          Logout
        </button>

        {/* Profile */}
        <button
          type="button"
          onClick={() =>
            router.push("/teacher/profile")
          }
          aria-label="Teacher profile"
          className="text-gray-600 hover:text-purple-600 transition"
        >
          <UserCircle
            size={30}
            strokeWidth={1.5}
          />
        </button>

      </div>
    </header>
  );
}