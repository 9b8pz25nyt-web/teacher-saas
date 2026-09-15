"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  CreditCard,
  FileText,
  Settings,
  LogOut,
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [dashboardTitle, setDashboardTitle] = useState("Teacher Gabi's Private");

  useEffect(() => {
    async function fetchProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("logo_url, dashboard_title")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profile) {
          if (profile.logo_url) setLogoUrl(profile.logo_url);
          if (profile.dashboard_title) setDashboardTitle(profile.dashboard_title);
        }
      } catch (err) {
        console.error("Error loading sidebar profile:", err);
      }
    }

    fetchProfile();
  }, []);

  const navigation = [
    { name: "My Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "My Students", href: "/students", icon: Users },
    { name: "Books", href: "/books", icon: BookOpen },
    { name: "Payments", href: "/payments", icon: CreditCard },
    { name: "Reports & BIR", href: "/reports", icon: FileText },
    { name: "Account Settings", href: "/settings", icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#6b0633] text-white flex flex-col min-h-screen p-4 flex-shrink-0">
      {/* Brand Header */}
      <div className="flex items-center gap-3 mb-8 px-2">
        {logoUrl ? (
          <img 
            src={logoUrl} 
            alt="Dashboard Logo" 
            className="w-10 h-10 rounded-full object-cover border border-pink-300 shadow-xs" 
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center text-xl shadow-xs">
            🤖
          </div>
        )}
        <div className="overflow-hidden">
          <h2 className="text-sm font-bold leading-tight truncate">
            {dashboardTitle}
          </h2>
          <p className="text-xs text-pink-200">Class Dashboard</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="space-y-1.5 flex-1">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                isActive
                  ? "bg-[#e60067] text-white shadow-md"
                  : "text-pink-100 hover:bg-white/10"
              }`}
            >
              <Icon size={18} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer / Sign Out */}
      <div className="pt-4 border-t border-pink-900/50">
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.href = "/login";
          }}
          className="flex items-center gap-2.5 px-3 py-2 text-xs text-pink-200 hover:text-white transition w-full cursor-pointer"
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}