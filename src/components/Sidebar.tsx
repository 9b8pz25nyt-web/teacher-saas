"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { LogOut, Settings } from "lucide-react";

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
        <nav className="space-y-3">
          <Link
            href="/dashboard"
            className={`block w-full text-left rounded-lg px-4 py-2.5 text-sm transition ${
              pathname === "/dashboard"
                ? "bg-pink-600 font-semibold"
                : "hover:bg-pink-800"
            }`}
          >
            ▦ My Dashboard
          </Link>
          <Link
            href="/students"
            className={`block w-full text-left rounded-lg px-4 py-2.5 text-sm transition ${
              pathname === "/students"
                ? "bg-pink-600 font-semibold"
                : "hover:bg-pink-800"
            }`}
          >
            👥 My Students
          </Link>
          <Link
            href="/books"
            className={`block w-full text-left rounded-lg px-4 py-2.5 text-sm transition ${
              pathname === "/books"
                ? "bg-pink-600 font-semibold"
                : "hover:bg-pink-800"
            }`}
          >
            📚 Books
          </Link>
          <Link
            href="/contracts"
            className={`block w-full text-left rounded-lg px-4 py-2.5 text-sm transition ${
              pathname === "/contracts"
                ? "bg-pink-600 font-semibold"
                : "hover:bg-pink-800"
            }`}
          >
            📄 Contracts
          </Link>
          <Link
            href="/payments"
            className={`block w-full text-left rounded-lg px-4 py-2.5 text-sm transition ${
              pathname === "/payments"
                ? "bg-pink-600 font-semibold"
                : "hover:bg-pink-800"
            }`}
          >
            💳 Payments
          </Link>
          
          <Link
            href="/reports"
            className={`block w-full text-left rounded-lg px-4 py-2.5 text-sm transition ${
              pathname === "/reports"
                ? "bg-pink-600 font-semibold"
                : "hover:bg-pink-800"
            }`}
          >
            📊 Reports
          </Link>
          <Link
            href="/settings"
            className={`block w-full text-left rounded-lg px-4 py-2.5 text-sm transition flex items-center gap-2 ${
              pathname === "/settings"
                ? "bg-pink-600 font-semibold"
                : "hover:bg-pink-800"
            }`}
          >
            <Settings size={16} />
            <span>Account Settings</span>
          </Link>
        </nav>
      </div>
    </aside>
  );
}