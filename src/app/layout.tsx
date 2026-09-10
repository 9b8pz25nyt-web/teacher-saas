"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPortal = pathname?.startsWith("/portal");

  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900">
        {isPortal ? (
          <main className="min-h-screen bg-[#fff7fb] overflow-y-auto">
            {children}
          </main>
        ) : (
          <div className="flex h-screen overflow-hidden">
            <aside className="shrink-0">
              <Sidebar />
            </aside>
            <main className="flex-1 overflow-y-auto">
              {children}
            </main>
          </div>
        )}
      </body>
    </html>
  );
}