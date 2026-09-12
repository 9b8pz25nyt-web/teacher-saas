"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { LayoutDashboard, Users, BookOpen, FileText, CreditCard, BarChart2, Settings, LogOut } from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [dashboardTitle, setDashboardTitle] = useState("ESL Teacher's Private Class Dashboard");

  useEffect(() => {
    async function fetchBrandSettings() {
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
    }

    fetchBrandSettings();
  }, []);

  return (
    <aside className="w-64 bg-[#6b0633] text-white min-h-screen p-4 flex flex-col justify-between shrink-0">
      <div className="space-y-6">
        {/* Dynamic Logo & Title Header */}
        <div className="flex items-center gap-3 p-2 border-b border-pink-900/50 pb-4">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Brand Logo"
              className="w-10 h-10 rounded-2xl object-cover bg-white p-0.5 shrink-0 border border-pink-300"
            />
          ) : (
            <div className="w-10 h-10 rounded-2xl bg-pink-100 flex items-center justify-center text-pink-700 font-bold text-lg shrink-0">
              ✨
            </div>
          )}
          
          <h1 className="text-xs font-bold leading-tight line-clamp-2">
            {dashboardTitle}
          </h1>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1 text-xs font-semibold">
          <Link
            href="/dashboard"
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition ${
              pathname === "/dashboard" ? "bg-pink-600 text-white" : "hover:bg-pink-900/40 text-pink-100"
            }`}
          >
            <LayoutDashboard size={16} />
            <span>My Dashboard</span>
          </Link>

          <Link
            href="/students"
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition ${
              pathname.startsWith("/students") ? "bg-pink-600 text-white" : "hover:bg-pink-900/40 text-pink-100"
            }`}
          >
            <Users size={16} />
            <span>My Students</span>
          </Link>

          <Link
            href="/books"
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition ${
              pathname === "/books" ? "bg-pink-600 text-white" : "hover:bg-pink-900/40 text-pink-100"
            }`}
          >
            <BookOpen size={16} />
            <span>Books</span>
          </Link>

          <Link
            href="/payments"
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition ${
              pathname === "/payments" ? "bg-pink-600 text-white" : "hover:bg-pink-900/40 text-pink-100"
            }`}
          >
            <CreditCard size={16} />
            <span>Payments</span>
          </Link>

          <Link
            href="/settings"
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition ${
              pathname === "/settings" ? "bg-pink-600 text-white" : "hover:bg-pink-900/40 text-pink-100"
            }`}
          >
            <Settings size={16} />
            <span>Account Settings</span>
          </Link>
        </nav>
      </div>

      <button
        onClick={() => supabase.auth.signOut().then(() => window.location.href = "/login")}
        className="flex items-center gap-2 px-3 py-2 text-xs text-pink-200 hover:text-white transition cursor-pointer"
      >
        <LogOut size={16} />
        <span>Sign Out</span>
      </button>
    </aside>
  );
}