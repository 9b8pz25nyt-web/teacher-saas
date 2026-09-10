"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface RenewalAlertBannerProps {
  students?: any[];
}

export default function RenewalAlertBanner({ students: propStudents }: RenewalAlertBannerProps) {
  const [renewalList, setRenewalList] = useState<any[]>([]);

  useEffect(() => {
    async function loadExpiring() {
      let list = propStudents;
      if (!list || list.length === 0) {
        const { data } = await supabase.from("students").select("*");
        list = data || [];
      }

      const expiring = (list || []).filter((s: any) => {
        const included = Number(s.classes_included || 0);
        const free = Number(s.free_classes || 0);
        const completed = Number(s.classes_completed || 0);
        const remaining = included + free - completed;

        return remaining <= 5 || included === 0;
      });

      setRenewalList(expiring);
    }

    loadExpiring();
  }, [propStudents]);

  if (renewalList.length === 0) return null;

  return (
    <div className="w-full bg-pink-100/90 border-b border-pink-200 text-pink-950 py-2.5 px-4 overflow-hidden select-none relative z-30 group">
      <div 
        className="flex items-center gap-8 whitespace-nowrap animate-marquee group-hover:[animation-play-state:paused] hover:[animation-play-state:paused]"
        style={{ width: "max-content", animation: "marquee 45s linear infinite" }}
      >
        {/* Track 1 */}
        <div className="flex items-center gap-6 shrink-0">
          <span className="font-bold text-xs uppercase tracking-wider text-pink-700 bg-pink-50 px-2.5 py-1 rounded-xl border border-pink-200 shrink-0">
            PACKAGE RENEWAL ALERTS
          </span>

          {renewalList.map((student) => {
            const total = Number(student.classes_included || 0) + Number(student.free_classes || 0);
            const done = Number(student.classes_completed || 0);
            const left = Math.max(0, total - done);

            return (
              <Link
                key={`track1-${student.id}`}
                href={`/students/${student.id}?action=renew`}
                className="inline-flex items-center gap-1.5 text-xs text-pink-900 hover:text-pink-600 transition-colors"
              >
                <span>
                  ⚠️ Action Needed: <strong>{student.name}</strong> has{" "}
                  <span className="font-bold text-pink-700">
                    {left} {left === 1 ? "class" : "classes"} left {left === 0 ? "(Package Expired)" : ""}
                  </span>{" "}
                  — Click to view profile & prepare renewal invoice →
                </span>
                <span className="text-pink-300 font-bold ml-4">•</span>
              </Link>
            );
          })}
        </div>

        {/* Track 2 (Duplicate for continuous loop) */}
        <div className="flex items-center gap-6 shrink-0">
          <span className="font-bold text-xs uppercase tracking-wider text-pink-700 bg-pink-50 px-2.5 py-1 rounded-xl border border-pink-200 shrink-0">
            PACKAGE RENEWAL ALERTS
          </span>

          {renewalList.map((student) => {
            const total = Number(student.classes_included || 0) + Number(student.free_classes || 0);
            const done = Number(student.classes_completed || 0);
            const left = Math.max(0, total - done);

            return (
              <Link
                key={`track2-${student.id}`}
                href={`/students/${student.id}?action=renew`}
                className="inline-flex items-center gap-1.5 text-xs text-pink-900 hover:text-pink-600 transition-colors"
              >
                <span>
                  ⚠️ Action Needed: <strong>{student.name}</strong> has{" "}
                  <span className="font-bold text-pink-700">
                    {left} {left === 1 ? "class" : "classes"} left {left === 0 ? "(Package Expired)" : ""}
                  </span>{" "}
                  — Click to view profile & prepare renewal invoice →
                </span>
                <span className="text-pink-300 font-bold ml-4">•</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}