"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  SlidersHorizontal,
  Bell,
  Settings,
  Share2,
  Video,
  MessageCircle,
  BookOpen,
  Calendar,
  Heart,
  RefreshCw,
  CreditCard,
  Home,
  Newspaper,
  HelpCircle,
  FolderOpen,
  FileText,
  ClipboardCheck,
  Lightbulb,
  ShoppingBag,
  GraduationCap,
  Star,
  User,
  AlertCircle,
  Gift,
  X,
} from "lucide-react";

const menuItems = [
  { label: "Preference", path: "/parent/preference", icon: SlidersHorizontal },
  { label: "Notification", path: "/parent/notification", icon: Bell },
  { label: "Settings", path: "/parent/settings", icon: Settings },
  { label: "Referral", path: "/parent/referral", icon: Share2 },
  { label: "Free Demo", path: "/parent/free-demo", icon: Video },
  { label: "Chat", path: "/parent/chat", icon: MessageCircle },
  { label: "Courses", path: "/parent/courses", icon: BookOpen },
  { label: "Calendar", path: "/parent/calendar", icon: Calendar },
  { label: "Favorites", path: "/parent/favorites", icon: Heart },
  { label: "Reschedule", path: "/parent/reschedule", icon: RefreshCw },
  { label: "Payments", path: "/parent/payments", icon: CreditCard },
  { label: "Home Tuitions", path: "/parent/home-tuitions", icon: Home },
  { label: "Blogs", path: "/parent/blogs", icon: Newspaper },
  { label: "FAQs", path: "/parent/faqs", icon: HelpCircle },
  { label: "Resources", path: "/parent/resources", icon: FolderOpen },
  { label: "Transcripts", path: "/parent/transcripts", icon: FileText },
  { label: "Home works/tests", path: "/parent/homework-tests", icon: ClipboardCheck },
  { label: "Suggestions", path: "/parent/suggestions", icon: Lightbulb },
  { label: "Learnie Mall", path: "/parent/learnie-mall", icon: ShoppingBag },
  { label: "Teacher", path: "/parent/teachers", icon: GraduationCap },
  { label: "Reviews", path: "/parent/reviews", icon: Star },
  { label: "Profile", path: "/parent/profile", icon: User },
  { label: "Complain", path: "/parent/complain", icon: AlertCircle },
];

const bottomItems = [
  { label: "Gift", path: "/parent/gift", icon: Gift },
  { label: "Go Live", path: "/parent/go-live", icon: Video },
];

interface ParentSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ParentSidebar({ isOpen, onClose }: ParentSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleNavigation = (path: string) => {
    router.push(path);
    onClose();
  };

  const renderItem = (item: (typeof menuItems)[number]) => {
    const Icon = item.icon;

    const isActive =
      pathname === item.path || pathname.startsWith(`${item.path}/`);

    return (
      <button
        key={item.path}
        type="button"
        onClick={() => handleNavigation(item.path)}
        className={`
          w-full flex items-center gap-2 text-left text-sm py-1 transition
          ${isActive ? "text-yellow-300 font-semibold" : "text-white hover:text-yellow-200"}
        `}
      >
        <Icon size={15} strokeWidth={1.8} />
        <span>{item.label}</span>
      </button>
    );
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
          fixed top-14 bottom-0 left-0 z-40 w-56
          bg-purple-500 rounded-r-2xl px-5 py-7 text-white overflow-y-auto
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-2xl font-bold text-yellow-300">Parent</h2>

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
        <nav className="space-y-1">{menuItems.map(renderItem)}</nav>

        <div className="mt-6 pt-4 border-t border-purple-400 space-y-1">
          {bottomItems.map(renderItem)}
        </div>
      </aside>
    </>
  );
}
