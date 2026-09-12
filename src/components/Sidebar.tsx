"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  FileText,
  CreditCard,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [dashboardTitle, setDashboardTitle] = useState("ESL Teacher's Private Class Dashboard");
  const [logoUrl, setLogoUrl] = useState("/logo.png");

  useEffect(() => {
    async function loadTeacherProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("dashboard_title, logo_url")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profile?.dashboard_title) {
        setDashboardTitle(profile.dashboard_title);
      }
      if (profile?.logo_url) {
        setLogoUrl(profile.logo_url);
      }
    }

    loadTeacherProfile();
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const navItems = [
    { name: "My Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "My Students", href: "/students", icon: Users },
    { name: "Books", href: "/books", icon: BookOpen },
    { name: "Contracts", href: "/contracts", icon: FileText },
    { name: "Payments", href: "/payments", icon: CreditCard },
    { name: "Reports", href: "/reports", icon: BarChart3 },
    { name: "Account Settings", href: "/settings", icon: Settings },
  ];

  return (
    <aside className="w-64 min-h-screen bg-[#6b0f3b] text-white p-5 flex flex-col justify-between">
      <div>
        <div className="mb-8 flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white border border-pink-400/40 shadow-xs shrink-0 flex items-center justify-center overflow-hidden p-1.5">
              <img
                src={logoUrl}
                alt="Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className="text-sm font-bold leading-snug text-white break-words">
              {dashboardTitle}
            </h1>
          </div>
          <button
            onClick={handleSignOut}
            title="Sign Out"
            className="p-2 rounded-lg bg-pink-800/60 hover:bg-pink-700 text-pink-200 hover:text-white transition cursor-pointer shrink-0"
          >
            <LogOut size={16} />
          </button>
        </div>

        {/* Navigation links */}
        <nav className="space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  isActive
                    ? "bg-pink-600 text-white shadow-xs font-bold"
                    : "text-pink-100/90 hover:bg-pink-800/60 hover:text-white"
                }`}
              >
                <Icon
                  size={18}
                  className={`transition-colors shrink-0 ${
                    isActive
                      ? "text-white"
                      : "text-pink-300 group-hover:text-white"
                  }`}
                />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}