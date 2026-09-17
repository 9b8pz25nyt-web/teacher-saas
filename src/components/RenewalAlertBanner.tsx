"use client";

import { useMemo } from "react";
import Link from "next/link";

interface RenewalAlertBannerProps {
  students?: any[];
}

export default function RenewalAlertBanner({ students = [] }: RenewalAlertBannerProps) {
  // Compute instantly using useMemo with zero network delay
  const renewalList = useMemo(() => {
    if (!students || students.length === 0) return [];

    // Filter out archived or inactive students
    const activeStudents = students.filter(
      (s) => 
        s.status !== "Archived" && 
        s.status !== "Inactive" && 
        s.payment_status !== "Archived" && 
        s.payment_status !== "Inactive"
    );

    // Find students with 4 or fewer classes remaining
    return activeStudents.filter((s) => {
      const remaining = (s.classes_included || 0) - (s.classes_completed || 0);
      return remaining <= 4;
    });
  }, [students]);

  if (renewalList.length === 0) return null;

  return (
    <div className="bg-pink-100/80 border-b border-pink-200 text-pink-950 px-6 py-2.5 text-xs font-bold flex items-center justify-between overflow-x-auto whitespace-nowrap shadow-xs">
      <div 
        className="flex items-center gap-6 animate-marquee"
        style={{ animationDuration: "40s" }}
      >
        {renewalList.map((student) => {
          const remaining = (student.classes_included || 0) - (student.classes_completed || 0);
          return (
            <Link
              key={student.id}
              href={`/students/${student.id}`}
              className="hover:underline flex items-center gap-1.5"
            >
              <span>⚠️ Action Needed: {student.name} has <strong className="text-pink-700">{remaining} classes left</strong> — Click to view profile & prepare renewal invoice →</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}