"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import RenewalAlertBanner from "@/components/RenewalAlertBanner";
import ClassEvent from "@/components/ClassEvent";
import { ChevronLeft, ChevronRight, Sparkles, Trash2 } from "lucide-react";
import { cleanupOldHomeworkFiles } from "@/lib/storageCleanup";

export default function DashboardPage() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [recordedLessons, setRecordedLessons] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCleaning, setIsCleaning] = useState(false);

  // Dynamic Year and Month State
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const selectedYear = currentDate.getFullYear();
  const selectedMonth = currentDate.getMonth();

  const monthNames = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];

  const availableYears = Array.from({ length: 7 }, (_, i) => 2024 + i);

  const fetchDashboardData = useCallback(async () => {
    try {
      const { data: studentsData } = await supabase
        .from("students")
        .select("*");

      if (studentsData) {
        setStudents(studentsData);
      }

      const { data: schedulesData, error: schedulesError } = await supabase
        .from("schedules")
        .select(
          "*, students(id, name, book_id, classes_included, free_classes, contract_start_date, contract_end_date, php_equivalent)"
        )
        .order("schedule_time", { ascending: true });

      if (schedulesError) {
        console.error("Schedule error:", schedulesError.message);
      } else if (schedulesData) {
        setSchedules(schedulesData);
      }

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

  // Today calculations
  const todayObj = new Date();
  const todayWeekday = todayObj.toLocaleDateString("en-US", { weekday: "long" });
  const todayDateStr = todayObj.toISOString().split("T")[0];
  const todaysSchedules = schedules.filter(
    (sched) => sched.day_of_week?.toLowerCase() === todayWeekday.toLowerCase()
  );

  // Calendar Math
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const firstDayWeekdayIndex = new Date(selectedYear, selectedMonth, 1).getDay();
  const startDayOffset = (firstDayWeekdayIndex + 6) % 7;
  const totalCalendarSlots = Math.ceil((startDayOffset + daysInMonth) / 7) * 7;

  // Strict date mapping to cap appearances at package limit (classes_included + free_classes)
  const studentValidDatesMap = (() => {
    const map: Record<string, string[]> = {};
    
    students.forEach((student) => {
      const studentSchedules = schedules.filter((s) => s.student_id === student.id);
      if (studentSchedules.length === 0) return;

      const totalAllowed = (student.classes_included || 0) + (student.free_classes || 0);
      if (totalAllowed <= 0) return;

      const startDateStr = student.contract_start_date || `${selectedYear}-01-01`;
      const startDate = new Date(startDateStr);
      const dates: string[] = [];
      
      let curr = new Date(startDate);
      let safetyCounter = 0;

      while (dates.length < totalAllowed && safetyCounter < 365) {
        const weekday = curr.toLocaleDateString("en-US", { weekday: "long" });
        const matchesSchedule = studentSchedules.some(
          (s) => s.day_of_week?.toLowerCase() === weekday.toLowerCase()
        );

        if (matchesSchedule) {
          const y = curr.getFullYear();
          const m = String(curr.getMonth() + 1).padStart(2, "0");
          const d = String(curr.getDate()).padStart(2, "0");
          dates.push(`${y}-${m}-${d}`);
        }

        curr.setDate(curr.getDate() + 1);
        safetyCounter++;
      }

      map[student.id] = dates;
    });

    return map;
  })();

  return (
    <div className="flex flex-col min-h-screen bg-gray-50/50">
      <RenewalAlertBanner />

      <main className="p-8 max-w-7xl mx-auto w-full space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-pink-100 shadow-xs">
          <div>
            <h1 className="text-2xl font-bold text-pink-950">
              Teacher Dashboard ✨
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Manage your monthly schedules and class attendance
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleRunCleanup}
              disabled={isCleaning}
              className="px-3.5 py-2 bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Trash2 size={14} />
              <span>{isCleaning ? "Cleaning..." : "🧹 Clean Storage (>30d)"}</span>
            </button>

            <div className="flex items-center gap-2 bg-pink-50/60 p-1.5 rounded-2xl border border-pink-100">
              <select
                className="bg-white border border-pink-200 rounded-xl px-3 py-1.5 text-sm font-semibold text-pink-900 focus:outline-none cursor-pointer"
                value={selectedMonth}
                onChange={(e) => setCurrentDate(new Date(selectedYear, Number(e.target.value), 1))}
              >
                {monthNames.map((m, idx) => (
                  <option key={m} value={idx}>{m}</option>
                ))}
              </select>

              <select
                className="bg-white border border-pink-200 rounded-xl px-3 py-1.5 text-sm font-semibold text-pink-900 focus:outline-none cursor-pointer"
                value={selectedYear}
                onChange={(e) => setCurrentDate(new Date(Number(e.target.value), selectedMonth, 1))}
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs rounded-2xl transition shadow-xs cursor-pointer"
            >
              Today
            </button>
          </div>
        </div>

        {/* Classes For Today */}
        <div className="bg-white p-6 rounded-3xl border border-pink-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-pink-950">
              📅 Classes for Today ({todayObj.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })})
            </h2>
            <span className="bg-pink-100 text-pink-700 text-xs font-bold px-3 py-1 rounded-full">
              {todaysSchedules.length} {todaysSchedules.length === 1 ? "Class" : "Classes"}
            </span>
          </div>

          {todaysSchedules.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No classes scheduled for today. Enjoy your day off! ✨</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {todaysSchedules.map((sched) => {
                const matchingLesson = recordedLessons.find(
                  (l) => l.student_id === sched.student_id && l.lesson_date === todayDateStr
                );
                const status = matchingLesson ? matchingLesson.status : "Scheduled";

                return (
                  <div
                    key={`today-${sched.id}`}
                    className="p-4 rounded-2xl border border-pink-100 bg-pink-50/30 flex flex-col justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-bold text-pink-900">{sched.schedule_time} ({sched.duration || 50}m)</p>
                        <p className="text-sm font-extrabold text-pink-950 mt-0.5">{sched.students?.name || "Student"}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-xl ${
                        status === "Completed" ? "bg-green-100 text-green-700" : "bg-pink-100 text-pink-700"
                      }`}>
                        {status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Calendar Grid */}
        <div className="bg-white rounded-3xl border border-pink-100 shadow-xs p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-pink-950">
              {monthNames[selectedMonth]} {selectedYear}
            </h2>
          </div>

          <div className="grid grid-cols-7 gap-3 text-center mb-4">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <div key={day} className="font-bold text-xs uppercase tracking-wider text-pink-600">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-3">
            {Array.from({ length: totalCalendarSlots }).map((_, index) => {
              const dayNumber = index - startDayOffset + 1;
              const isCurrentMonthDay = dayNumber > 0 && dayNumber <= daysInMonth;

              if (!isCurrentMonthDay) {
                return (
                  <div
                    key={`empty-${index}`}
                    className="min-h-[120px] bg-gray-50/30 border border-gray-100 rounded-2xl p-2 opacity-30"
                  />
                );
              }

              const monthStr = String(selectedMonth + 1).padStart(2, "0");
              const dayStr = String(dayNumber).padStart(2, "0");
              const dateString = `${selectedYear}-${monthStr}-${dayStr}`;
              const dateObj = new Date(selectedYear, selectedMonth, dayNumber);
              const weekdayName = dateObj.toLocaleDateString("en-US", { weekday: "long" });

              return (
                <div
                  key={dayNumber}
                  className="min-h-[130px] bg-white border border-pink-100 rounded-2xl p-3 flex flex-col gap-2 hover:border-pink-300 transition shadow-2xs relative"
                >
                  <p className="font-bold text-gray-700 text-xs">
                    {dayNumber}
                  </p>

                  {/* Clean container without scrollbars */}
                  <div className="space-y-1.5 relative">
                    {schedules
                      .filter((sched) => {
                        if (sched.day_of_week?.toLowerCase() !== weekdayName.toLowerCase()) {
                          return false;
                        }

                        const validDates = studentValidDatesMap[sched.student_id];
                        if (validDates) {
                          return validDates.includes(dateString);
                        }

                        return false;
                      })
                      .map((sched) => {
                        const matchingLesson = recordedLessons.find(
                          (l) => l.student_id === sched.student_id && l.lesson_date === dateString
                        );
                        const status = matchingLesson ? matchingLesson.status : "Scheduled";

                        return (
                          <ClassEvent
                            key={`${sched.id}-${dayNumber}`}
                            time={sched.schedule_time}
                            student={sched.students?.name || "Student"}
                            studentId={sched.student_id}
                            book={sched.students?.books?.title}
                            status={status}
                            dateString={dateString}
                            duration={sched.duration}
                            topic={sched.topic}
                            onStatusUpdate={fetchDashboardData}
                          />
                        );
                      })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}