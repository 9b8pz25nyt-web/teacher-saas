"use client";

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
  // 1. Filter out inactive or archived students
  const activeStudents = students.filter(
    (s) => s.status !== "Archived" && s.status !== "Inactive" && s.payment_status !== "Archived"
  );

  // 2. Calculate remaining classes for each student simply and cleanly
  const renewalList = activeStudents
    .map((student) => {
      const totalAllowed = (student.classes_included || 0) + (student.free_classes || 0);
      
      const completedLessons = recordedLessons.filter(
        (l) => l.student_id === student.id && l.status !== "Cancelled" && l.status !== "Absent"
      ).length;

      const completedMakeups = makeupEvents.filter(
        (m) => m.student_id === student.id && m.status !== "Cancelled" && m.status !== "Absent"
      ).length;

      const remaining = totalAllowed - (completedLessons + completedMakeups);
      return { student, remaining };
    })
    .filter((item) => item.remaining <= 4); // Only show students with 4 or fewer classes left

  if (renewalList.length === 0) return null;

  return (
    <div className="bg-pink-100/80 border-b border-pink-200 text-pink-950 px-6 py-2.5 text-xs font-bold flex items-center justify-between overflow-x-auto whitespace-nowrap shadow-xs">
      <div 
        className="flex items-center gap-6 animate-marquee"
        style={{ animationDuration: "35s" }}
      >
        {renewalList.map(({ student, remaining }) => (
          <Link
            key={student.id}
            href={`/students/${student.id}`}
            className="hover:underline flex items-center gap-1.5"
          >
            <span>⚠️ Action Needed: {student.name} has <strong className="text-pink-700">{remaining} classes left</strong> — Click to view profile & prepare renewal invoice →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}