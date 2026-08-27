"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  CalendarDays,
  RefreshCw,
  Calculator,
  User,
  BookOpen,
  Briefcase,
  FileText,
  Users,
  Award,
  School,
  Newspaper,
  ClipboardCheck,
  LogOut,
  Video,
  X,
} from "lucide-react";

const menuItems = [
  {
    label: "Calender",
    path: "/teacher/calendar",
    icon: CalendarDays,
  },
  {
    label: "Reschedule",
    path: "/teacher/reschedule",
    icon: RefreshCw,
  },
  {
    label: "Rate Calculator",
    path: "/teacher/rate-calculator",
    icon: Calculator,
  },
  {
    label: "Profile",
    path: "/teacher/profile",
    icon: User,
  },
  {
    label: "Course Management",
    path: "/teacher/course-management",
    icon: BookOpen,
  },
  {
    label: "Vacancy",
    path: "/teacher/vacancy",
    icon: Briefcase,
  },
  {
    label: "Reports",
    path: "/teacher/reports",
    icon: FileText,
  },
  {
    label: "Students Management",
    path: "/teacher/students",
    icon: Users,
  },
  {
    label: "Certificate Management",
    path: "/teacher/certificates",
    icon: Award,
  },
  {
    label: "Class",
    path: "/teacher/class",
    icon: School,
  },
  {
    label: "Blogs",
    path: "/teacher/blogs",
    icon: Newspaper,
  },
  {
    label: "HW & Tests",
    path: "/teacher/hw-tests",
    icon: ClipboardCheck,
  },
  {
    label: "Leave",
    path: "/teacher/leave",
    icon: LogOut,
  },
  {
    label: "Demo",
    path: "/teacher/demo",
    icon: Video,
  },
  {
    label: "Go Live",
    path: "/teacher/go-live",
    icon: Video,
  },
];

interface TeacherSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TeacherSidebar({
  isOpen,
  onClose,
}: TeacherSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleNavigation = (path: string) => {
    router.push(path);
    onClose();
  };

  return (
    <>
      {/* Mobile / Tablet overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
    fixed
    top-14
    bottom-0
    left-0
    z-40
    w-52
    bg-purple-500
    rounded-r-2xl
    px-5
    py-7
    text-white
    overflow-y-auto

    transform
    transition-transform
    duration-300
    ease-in-out

    ${
      isOpen
        ? "translate-x-0"
        : "-translate-x-full lg:translate-x-0"
    }
  `}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-2xl font-bold text-yellow-300">
            Teacher
          </h2>

          {/* Mobile close button */}
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden text-white hover:text-yellow-200"
            aria-label="Close menu"
          >
            <X size={22} />
          </button>
        </div>

        {/* Menu */}
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;

            const isActive =
              pathname === item.path ||
              pathname.startsWith(`${item.path}/`);

            return (
              <button
                key={item.path}
                type="button"
                onClick={() =>
                  handleNavigation(item.path)
                }
                className={`
                  w-full
                  flex
                  items-center
                  gap-2
                  text-left
                  text-sm
                  py-1
                  transition

                  ${
                    isActive
                      ? "text-yellow-300 font-semibold"
                      : "text-white hover:text-yellow-200"
                  }
                `}
              >
                <Icon
                  size={15}
                  strokeWidth={1.8}
                />

                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>
    </>
  );
}