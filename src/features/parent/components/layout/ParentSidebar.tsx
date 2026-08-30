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
          group w-full flex items-center gap-3 text-left text-sm py-2 px-3 rounded-xl transition-all
          ${
            isActive
              ? "bg-white text-brand-dark font-bold shadow-playful"
              : "text-white/85 hover:bg-white/10 hover:text-white"
          }
        `}
      >
        <span
          className={`
            w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors
            ${
              isActive
                ? "bg-brand-yellow text-violet-900"
                : "bg-white/10 text-white group-hover:bg-white/20"
            }
          `}
        >
          <Icon size={14} strokeWidth={2} />
        </span>
        <span className="truncate">{item.label}</span>
      </button>
    );
  };

  return (
    <>
      {/* Mobile / Tablet overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-violet-950/40 backdrop-blur-[2px] z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-16 bottom-0 left-0 z-40 w-64
          bg-gradient-to-b from-brand-light to-brand-dark
          rounded-r-[2rem] px-4 py-6 text-white overflow-y-auto
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6 px-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/60">
              Welcome back
            </p>
            <h2 className="font-heading text-2xl font-bold text-brand-yellow leading-tight">
              Parent Hub
            </h2>
          </div>

          {/* Mobile close button */}
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Menu */}
        <nav className="space-y-1">{menuItems.map(renderItem)}</nav>

        <div className="mt-4 pt-4 border-t border-white/15 space-y-1">
          {bottomItems.map(renderItem)}
        </div>
      </aside>
    </>
  );
}
