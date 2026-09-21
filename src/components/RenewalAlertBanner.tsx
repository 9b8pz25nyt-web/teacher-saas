"use client";

import { useMemo } from "react";
import Link from "next/link";

interface RenewalAlertBannerProps {
  students?: any[];
  recordedLessons?: any[];
  makeupEvents?: any[];
}

export default function RenewalAlertBanner({ 
  students = [], 
  recordedLessons = [], 
  makeupEvents = [] 
}: RenewalAlertBannerProps) {
  // Compute instantly using optimized Map lookups for zero lag
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

    // 🌟 Speed Fix 1: Pre-group lessons by student_id once (O(N) instead of nested loops)
    const lessonsMap = new Map<string, any[]>();
    for (const l of recordedLessons) {
      if (!l.student_id) continue;
      const status = String(l.status || "").toLowerCase();
      if (status === "cancelled" || status === "absent") continue;
      if (!lessonsMap.has(l.student_id)) {
        lessonsMap.set(l.student_id, []);
      }
      lessonsMap.get(l.student_id)!.push(l);
    }

    // 🌟 Speed Fix 2: Pre-group makeups by student_id once
    const makeupsMap = new Map<string, any[]>();
    for (const m of makeupEvents) {
      if (!m.student_id) continue;
      const status = String(m.status || "").toLowerCase();
      if (status === "cancelled" || status === "absent") continue;
      if (!makeupsMap.has(m.student_id)) {
        makeupsMap.set(m.student_id, []);
      }
      makeupsMap.get(m.student_id)!.push(m);
    }

    // Evaluate remaining counts instantly using O(1) lookups
    return activeStudents.map((s) => {
      const totalAllowed = (s.classes_included || 0) + (s.free_classes || 0);
      const studentLessonsCount = (lessonsMap.get(s.id) || []).length;
      const studentMakeupsCount = (makeupsMap.get(s.id) || []).length;

      const completedCount = studentLessonsCount + studentMakeupsCount;
      const remaining = Math.max(totalAllowed - completedCount, 0);

      return { student: s, remaining };
    }).filter((item) => item.remaining <= 4);
  }, [students, recordedLessons, makeupEvents]);

  if (renewalList.length === 0) return null;

  return (
    <div className="bg-pink-100/80 border-b border-pink-200 text-pink-950 px-6 py-2.5 text-xs font-bold flex items-center justify-between overflow-x-auto whitespace-nowrap shadow-xs">
      <div 
        className="flex items-center gap-6 animate-marquee"
        style={{ animationDuration: "35s" }}
      >
        {renewalList.map(({ student, remaining }) => {
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