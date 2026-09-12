"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  CreditCard,
  FileText, // Icon for BIR Reports & Accounting
  Settings,
  LogOut,
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();

  const navigation = [
    { name: "My Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "My Students", href: "/students", icon: Users },
    { name: "Books", href: "/books", icon: BookOpen },
    { name: "Payments", href: "/payments", icon: CreditCard },
    { name: "Reports & BIR", href: "/reports", icon: FileText }, // 👈 RESTORED REPORTS TAB
    { name: "Account Settings", href: "/settings", icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#6b0633] text-white flex flex-col min-h-screen p-4 flex-shrink-0">
      {/* Brand Header */}
      <div className="flex items-center gap-3 mb-8 px-2">
        <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center text-xl shadow-xs">
          🤖
        </div>
        <div>
          <h2 className="text-sm font-bold leading-tight">
            Teacher Gabi&apos;s Private
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
          onClick={() => {
            // Your signout logic here
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