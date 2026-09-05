"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { AlertCircle } from "lucide-react";

interface StudentAlert {
  id: string;
  name: string;
  remaining: number;
}

export default function RenewalAlertBanner() {
  const [lowBalanceStudents, setLowBalanceStudents] = useState<StudentAlert[]>([]);

  useEffect(() => {
    async function checkRenewals() {
      const { data, error } = await supabase
        .from("students")
        .select("id, name, classes_included, classes_completed");

      if (!error && data) {
        const expiring: StudentAlert[] = data
          .map((s) => {
            const included = Number(s.classes_included || 0);
            const completed = Number(s.classes_completed || 0);
            const remaining = Math.max(0, included - completed);
            return {
              id: s.id,
              name: s.name,
              remaining,
            };
          })
          .filter((s) => s.remaining <= 5);

        setLowBalanceStudents(expiring);
      }
    }

    checkRenewals();
  }, []);

  if (lowBalanceStudents.length === 0) return null;

  return (
    <div className="bg-pink-100 border-b border-pink-200 text-pink-950 py-2.5 px-4 flex items-center shadow-xs overflow-hidden z-20">
      {/* Static Pink Label on the left */}
      <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-pink-700 shrink-0 bg-pink-200/90 px-3 py-1.5 rounded-full mr-4 border border-pink-300 shadow-xs">
        <AlertCircle size={14} className="text-pink-600 animate-pulse" />
        <span>Package Renewal Alerts</span>
      </div>

      {/* Infinite Scrolling Ticker with Spaced-Out Detailed Messages */}
      <div className="relative flex overflow-x-hidden flex-1 group">
        <div className="animate-marquee whitespace-nowrap flex items-center gap-16 pr-16 group-hover:[animation-play-state:paused] text-xs">
          {lowBalanceStudents.map((student) => (
            <Link
              key={student.id}
              href={`/students/${student.id}`}
              className="inline-flex items-center gap-2 font-medium hover:underline text-pink-900 bg-white/80 px-4 py-1.5 rounded-full border border-pink-200 shadow-xs transition hover:bg-white"
            >
              <span>⚠️ Action Needed: <strong>{student.name}</strong> has</span>
              <span className="font-bold text-pink-600 underline decoration-pink-300">
                {student.remaining === 0
                  ? "0 classes left (Package Expired)"
                  : `${student.remaining} class${student.remaining === 1 ? "" : "es"} remaining`}
              </span>
              <span className="text-pink-400 font-semibold">— Click to view profile & prepare renewal invoice →</span>
            </Link>
          ))}
        </div>

        <div
          aria-hidden="true"
          className="absolute top-0 animate-marquee2 whitespace-nowrap flex items-center gap-16 pr-16 group-hover:[animation-play-state:paused] text-xs"
        >
          {lowBalanceStudents.map((student) => (
            <Link
              key={`dup-${student.id}`}
              href={`/students/${student.id}`}
              className="inline-flex items-center gap-2 font-medium hover:underline text-pink-900 bg-white/80 px-4 py-1.5 rounded-full border border-pink-200 shadow-xs transition hover:bg-white"
            >
              <span>⚠️ Action Needed: <strong>{student.name}</strong> has</span>
              <span className="font-bold text-pink-600 underline decoration-pink-300">
                {student.remaining === 0
                  ? "0 classes left (Package Expired)"
                  : `${student.remaining} class${student.remaining === 1 ? "" : "es"} remaining`}
              </span>
              <span className="text-pink-400 font-semibold">— Click to view profile & prepare renewal invoice →</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}