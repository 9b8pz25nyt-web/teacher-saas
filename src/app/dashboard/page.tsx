"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import RenewalAlertBanner from "@/components/RenewalAlertBanner";
import ClassEvent from "@/components/ClassEvent";
import Link from "next/link";
import { calculateProjectedEndDate } from "@/lib/scheduleProjection";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { cleanupOldHomeworkFiles } from "@/lib/storageCleanup";
import StorageCleanupReminder from "@/components/StorageCleanupReminder";

export default function DashboardPage() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [recordedLessons, setRecordedLessons] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCleaning, setIsCleaning] = useState(false);

  async function handleRunCleanup() {
    if (!confirm("Delete worksheet and homework files older than 30 days? Lesson text notes will remain safe.")) {
      return;
    }

    setIsCleaning(true);
    try {
      const result = await cleanupOldHomeworkFiles(30);
      alert(result.message);
    } catch (err: any) {
      console.error("Cleanup error:", err);
      alert("Failed to clean up files: " + (err.message || err));
    } finally {
      setIsCleaning(false);
    }
  }

  // Dynamic Year and Month State (Default to September 2026 or current date)
  const [currentDate, setCurrentDate] = useState(() => new Date(2026, 8, 1));
  const selectedYear = currentDate.getFullYear();
  const selectedMonth = currentDate.getMonth(); // 0-indexed

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const daysOfWeekNames = [
    "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
  ];

  const availableYears = Array.from({ length: 7 }, (_, i) => 2024 + i);

  const fetchDashboardData = useCallback(async () => {
    try {
      // 1. Fetch Students
      const { data: studentsData } = await supabase
        .from("students")
        .select("*");

      if (studentsData) {
        setStudents(studentsData);
      }

      // 2. Fetch Schedules
      const { data: schedulesData, error: schedulesError } = await supabase
        .from("schedules")
        .select(
          "*, students(id, name, book_id, classes_included, contract_start_date, contract_end_date, php_equivalent)"
        )
        .order("schedule_time", { ascending: true });

      if (schedulesError) {
        console.error("Schedule error:", schedulesError.message);
      } else if (schedulesData) {
        setSchedules(schedulesData);
      }

      // 3. Fetch Recorded Lessons
      const { data: lessonsData, error: lessonsError } = await supabase
        .from("lessons")
        .select("id, student_id, lesson_date, status, description");

      if (lessonsError) {
        console.error("Lesson error:", lessonsError.message);
      } else if (lessonsData) {
        setRecordedLessons(lessonsData);
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Calendar Math for Any Month & Year
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const firstDayWeekdayIndex = new Date(selectedYear, selectedMonth, 1).getDay();
  const startDayOffset = (firstDayWeekdayIndex + 6) % 7;
  const totalCalendarSlots = Math.ceil((startDayOffset + daysInMonth) / 7) * 7;

  // Selected Month Range formatted as YYYY-MM-DD
  const monthStartStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-01`;
  const monthEndStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

  // 1. Collect all student IDs that have valid class events rendered in this month
  const activeStudentIdsInThisMonth = new Set<string>();

  for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber++) {
    const monthStr = String(selectedMonth + 1).padStart(2, "0");
    const dayStr = String(dayNumber).padStart(2, "0");
    const dateString = `${selectedYear}-${monthStr}-${dayStr}`;

    const dateObj = new Date(selectedYear, selectedMonth, dayNumber);
    const weekdayName = daysOfWeekNames[dateObj.getDay()];

    schedules.forEach((s: any) => {
      const isMatchingDay = s.day_of_week?.toLowerCase() === weekdayName.toLowerCase();
      if (!isMatchingDay) return;

      const studentData = s.students;
      if (!studentData) return;

      // Must have a start date to project forward
      const startDate = studentData.contract_start_date;
      if (!startDate) return;

      if (dateString < startDate) return;

      try {
        const studentSchedules = schedules.filter((item: any) => item.student_id === s.student_id);
        const studentLessons = recordedLessons.filter((l: any) => l.student_id === s.student_id);

        const { projectedEndDate } = calculateProjectedEndDate(
          startDate,
          Number(studentData.classes_included || 0),
          studentSchedules,
          studentLessons
        );

        if (projectedEndDate && dateString > projectedEndDate) {
          return;
        }

        activeStudentIdsInThisMonth.add(s.student_id);
      } catch {
        // Safe bypass
      }
    });
  }

  // 2. Filter students matching the active IDs
  const activeStudentsInMonth = students.filter((s) =>
    activeStudentIdsInThisMonth.has(s.id)
  );

  // 3. Filter completed lessons strictly within the selected month and year
  const completedLessonsInMonth = recordedLessons.filter((l) => {
    if (l.status !== "Completed" || !l.lesson_date) return false;
    const [yearStr, monthStr] = l.lesson_date.split("-");
    return (
      Number(yearStr) === selectedYear &&
      Number(monthStr) === selectedMonth + 1
    );
  });

  // 4. Projected income for active students in this month
  const monthlyProjectedRevenue = activeStudentsInMonth.reduce(
    (acc, curr) => acc + (Number(curr.php_equivalent) || 0),
    0
  );

  // Month navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(selectedYear, selectedMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(selectedYear, selectedMonth + 1, 1));
  };

  const handleYearChange = (year: number) => {
    setCurrentDate(new Date(year, selectedMonth, 1));
  };

  const handleMonthChange = (monthIndex: number) => {
    setCurrentDate(new Date(selectedYear, monthIndex, 1));
  };

  return (
    <div className="flex flex-col min-h-screen bg-pink-50/20">
      <RenewalAlertBanner />
      <StorageCleanupReminder />

      <div className="p-8 space-y-6 flex-1 max-w-7xl w-full mx-auto">
        {/* Header with Month & Year Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-pink-600">
                {monthNames[selectedMonth]} {selectedYear}
              </h1>

              {/* Prev / Next Month Buttons */}
              <div className="flex items-center bg-white border border-pink-200 rounded-xl p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1.5 hover:bg-pink-50 rounded-lg text-pink-700 transition cursor-pointer"
                  title="Previous Month"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1.5 hover:bg-pink-50 rounded-lg text-pink-700 transition cursor-pointer"
                  title="Next Month"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Manage schedules, attendance, and student progress for any date.
            </p>
          </div>

          {/* Search & Selector Bar for Month and Year */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-white border border-pink-200 rounded-2xl px-3 py-1.5 shadow-2xs">
              <CalendarIcon size={16} className="text-pink-600 shrink-0" />
              
              <select
                className="text-xs font-bold text-gray-700 bg-transparent outline-hidden cursor-pointer"
                value={selectedMonth}
                onChange={(e) => handleMonthChange(Number(e.target.value))}
              >
                {monthNames.map((name, index) => (
                  <option key={name} value={index}>
                    {name}
                  </option>
                ))}
              </select>

              <span className="text-gray-300">|</span>

              <select
                className="text-xs font-bold text-pink-600 bg-transparent outline-hidden cursor-pointer"
                value={selectedYear}
                onChange={(e) => handleYearChange(Number(e.target.value))}
              >
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            {/* Clean Storage Button */}
            <button
              type="button"
              onClick={handleRunCleanup}
              disabled={isCleaning}
              className="px-3.5 py-2.5 bg-white hover:bg-pink-50 text-pink-700 border border-pink-200 rounded-2xl text-xs font-bold transition shadow-2xs cursor-pointer flex items-center gap-1.5"
            >
              <span>{isCleaning ? "Cleaning..." : "🧹 Clean Storage (>30d)"}</span>
            </button>

            <Link
              href="/students"
              className="bg-pink-600 hover:bg-pink-700 text-white font-semibold text-xs px-4 py-2.5 rounded-2xl shadow-xs transition"
            >
              + Add Class
            </Link>
          </div>
        </div>

        {/* Dynamic Month-Scoped Metrics Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-pink-100 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase text-gray-400">Monthly Projected</p>
              <h3 className="text-xl font-bold text-pink-600 mt-0.5">
                ₱{monthlyProjectedRevenue.toLocaleString()}{" "}
                <span className="text-xs font-medium text-gray-500">PHP</span>
              </h3>
            </div>
            <Link
              href="/reports"
              className="text-xs font-semibold text-pink-600 bg-pink-50 hover:bg-pink-100 border border-pink-200 px-3 py-1.5 rounded-xl transition"
            >
              View Report →
            </Link>
          </div>

          <div className="bg-white border border-pink-100 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase text-gray-400">Classes Completed</p>
              <h3 className="text-xl font-bold text-pink-600 mt-0.5">
                {completedLessonsInMonth.length}{" "}
                <span className="text-xs font-medium text-gray-500">Sessions</span>
              </h3>
            </div>
            <span className="text-xs font-bold text-pink-700 bg-pink-100 border border-pink-200 px-2.5 py-1 rounded-xl">
              🎯 Active
            </span>
          </div>

          <div className="bg-white border border-pink-100 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase text-gray-400">Active Students</p>
              <h3 className="text-xl font-bold text-pink-600 mt-0.5">
                {activeStudentsInMonth.length}{" "}
                <span className="text-xs font-medium text-gray-500">Students</span>
              </h3>
            </div>
            <Link
              href="/students"
              className="text-xs font-semibold text-pink-600 bg-pink-50 hover:bg-pink-100 border border-pink-200 px-3 py-1.5 rounded-xl transition"
            >
              Manage →
            </Link>
          </div>
        </div>

        {/* Calendar Grid Headers (Mon - Sun) */}
        <div className="grid grid-cols-7 gap-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
          <div>Sun</div>
        </div>

        {/* Calendar Grid */}
        {loading ? (
          <div className="p-12 text-center text-pink-600 font-medium">Loading schedule...</div>
        ) : (
          <div className="grid grid-cols-7 gap-3">
            {Array.from({ length: totalCalendarSlots }).map((_, index) => {
              const dayNumber = index - startDayOffset + 1;
              const isCurrentMonth = dayNumber >= 1 && dayNumber <= daysInMonth;

              if (!isCurrentMonth) {
                return (
                  <div
                    key={index}
                    className="bg-white/30 border border-pink-100/40 rounded-2xl p-3 min-h-[110px]"
                  />
                );
              }

              const monthStr = String(selectedMonth + 1).padStart(2, "0");
              const dayStr = String(dayNumber).padStart(2, "0");
              const dateString = `${selectedYear}-${monthStr}-${dayStr}`;

              const dateObj = new Date(selectedYear, selectedMonth, dayNumber);
              const weekdayName = daysOfWeekNames[dateObj.getDay()];

              const daySchedules = (schedules || []).filter((s: any) => {
                const isMatchingDay = s.day_of_week?.toLowerCase() === weekdayName.toLowerCase();
                if (!isMatchingDay) return false;

                const studentData = s.students;
                if (!studentData) return true;

                const startDate = studentData.contract_start_date;
                if (startDate && dateString < startDate) {
                  return false;
                }

                try {
                  const studentSchedules = schedules.filter((item: any) => item.student_id === s.student_id);
                  const studentLessons = recordedLessons.filter((l: any) => l.student_id === s.student_id);

                  const { projectedEndDate } = calculateProjectedEndDate(
                    startDate,
                    Number(studentData.classes_included || 0),
                    studentSchedules,
                    studentLessons
                  );

                  if (projectedEndDate && dateString > projectedEndDate) {
                    return false;
                  }
                } catch {
                  return true;
                }

                return true;
              });

              return (
                <div
                  key={index}
                  className="bg-white border border-pink-100 rounded-2xl p-2.5 min-h-[110px] flex flex-col justify-between shadow-xs hover:border-pink-200 transition"
                >
                  <span className="text-xs font-bold text-gray-700">{dayNumber}</span>

                  <div className="space-y-1.5 mt-1">
                    {daySchedules.map((schedule: any) => {
                      const recordedLesson = (recordedLessons || []).find(
                        (l: any) =>
                          l.student_id === schedule.student_id &&
                          l.lesson_date === dateString
                      );

                      return (
                        <ClassEvent
                          key={schedule.id}
                          time={schedule.schedule_time}
                          student={schedule.students?.name || ""}
                          studentId={schedule.student_id}
                          book=""
                          bookId={schedule.students?.book_id || ""}
                          status={recordedLesson?.status || "Scheduled"}
                          dateString={dateString}
                          duration={schedule.duration || 40}
                          topic={schedule.topic || "Regular Class"}
                          onStatusUpdate={fetchDashboardData}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}