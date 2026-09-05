"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { LogOut, BookOpen, Users, Calendar } from "lucide-react";
import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Header & Navigation Bar */}
      <header className="bg-white border-b border-pink-100 px-6 py-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-6">
          <h1 className="text-base font-extrabold text-pink-950">Teacher Platform</h1>
          <nav className="hidden md:flex items-center gap-4 text-xs font-bold text-gray-600">
            <Link href="/students" className="hover:text-pink-600 transition">Students</Link>
            <Link href="/books" className="hover:text-pink-600 transition">Curriculum Books</Link>
          </nav>
        </div>

        <button
          onClick={handleSignOut}
          className="px-3.5 py-2 bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
        >
          <LogOut size={14} />
          <span>Sign Out</span>
        </button>
      </header>

      {/* Main Page Content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}