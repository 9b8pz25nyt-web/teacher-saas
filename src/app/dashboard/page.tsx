"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import RenewalAlertBanner from "@/components/RenewalAlertBanner";
import ClassEvent from "@/components/ClassEvent";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { cleanupOldHomeworkFiles } from "@/lib/storageCleanup";
import AttendanceModal from "@/components/AttendanceModal";
import LessonLogModal from "@/components/LessonLogModal";

// Helper to fix timezone offset and get the correct local time
function extractTimeFromTimestamp(timestampStr: string) {
  if (!timestampStr) return "18:00";
  if (timestampStr.includes("T")) {
    const dateObj = new Date(timestampStr);
    const hours = String(dateObj.getHours()).padStart(2, "0");
    const minutes = String(dateObj.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  }
  return timestampStr.substring(0, 5);
}
// Helper to safely extract YYYY-MM-DD from a timestamp string without timezone shifts
function extractDateFromTimestamp(timestampStr: string) {
  if (!timestampStr) return "";
  if (timestampStr.includes("T")) {
    return timestampStr.split("T")[0];
  }
  return timestampStr.substring(0, 10);
}

export default function DashboardPage() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [makeupEvents, setMakeupEvents] = useState<any[]>([]);
  const [recordedLessons, setRecordedLessons] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCleaning, setIsCleaning] = useState(false);
  const [payments, setPayments] = useState<any[]>([]);
  
  // 🌟 Global Master Time Filter State (Defaults to monthly)
  const [globalTimeFilter, setGlobalTimeFilter] = useState<"daily" | "weekly" | "monthly" | "yearly">("monthly");

  const [selectedAttendance, setSelectedAttendance] = useState<{
    eventId: string;
    studentId: string;
    studentName: string;
    status: "absent" | "cancelled";
    eventType?: "regular" | "makeup";
    dateString?: string;
  } | null>(null);

  const [selectedLesson, setSelectedLesson] = useState<{
    eventId: string;
    studentId: string;
    studentName: string;
    type: "regular" | "makeup";
    dateString?: string;
  } | null>(null);

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
      const { data: { user } } = await supabase.auth.getUser();

      const { data: paymentsData } = await supabase
        .from("payments")
        .select("*");

      if (paymentsData) setPayments(paymentsData);

     // 1. Fetch Students (with nested books relation)
      const { data: studentsData } = await supabase
        .from("students")
        .select("*, student_books(*, books(*))");

      if (studentsData) setStudents(studentsData);

      // 2. Fetch Makeup Classes
      const { data: makeupData, error: makeupError } = await supabase
        .from("makeup_classes")
        .select(`
          id,
          student_id,
          teacher_id,
          makeup_date,
          duration,
          topic,
          status,
          students (
            id,
            name
          )
        `);

      if (makeupError) {
        console.error("Makeup event error:", makeupError.message);
      } else if (makeupData) {
        setMakeupEvents(makeupData);
      }

      // 3. Fetch Regular Schedules
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

      // 4. Fetch Recorded Lessons
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

  // Today calculations (Regular + Makeup)
  const todayObj = new Date();
  const todayWeekday = todayObj.toLocaleDateString("en-US", { weekday: "long" });
  const localYear = todayObj.getFullYear();
  const localMonth = String(todayObj.getMonth() + 1).padStart(2, "0");
  const localDay = String(todayObj.getDate()).padStart(2, "0");
  const todayDateStr = `${localYear}-${localMonth}-${localDay}`;

  const todaysRegularSchedules = schedules.filter(
    (sched) => sched.day_of_week?.toLowerCase() === todayWeekday.toLowerCase()
  );
  const todaysMakeupSchedules = makeupEvents.filter(
    (m) => m.makeup_date?.substring(0, 10) === todayDateStr
  );
  const totalTodaysCount = todaysRegularSchedules.length + todaysMakeupSchedules.length;

  // Combine regular and makeup classes and sort chronologically by start time
  const todaysCombinedSchedules = [
    ...todaysRegularSchedules.map((sched) => ({
      id: `reg-${sched.id}`,
      type: "regular" as const,
      time: sched.schedule_time || "00:00",
      duration: sched.duration || 40,
      studentName: sched.students?.name || "Student",
      studentId: sched.student_id,
      originalStatus: sched.status || "Scheduled",
    })),
    ...todaysMakeupSchedules.map((makeup) => {
      const timeStr = extractTimeFromTimestamp(makeup.makeup_date);
      return {
        id: `makeup-${makeup.id}`,
        type: "makeup" as const,
        time: timeStr,
        duration: makeup.duration || 40,
        studentName: `✨ ${makeup.students?.name || "Student"}`,
        studentId: makeup.student_id,
        originalStatus: makeup.status || "Scheduled",
      };
    }),
  ].sort((a, b) => a.time.localeCompare(b.time));

  // Calendar Math
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const firstDayWeekdayIndex = new Date(selectedYear, selectedMonth, 1).getDay();
  const startDayOffset = (firstDayWeekdayIndex + 6) % 7;
  const totalCalendarSlots = Math.ceil((startDayOffset + daysInMonth) / 7) * 7;

// Rollover mapping (Projects exact remaining classes starting from today)
  const studentValidDatesMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    
    students.forEach((student) => {
      const studentSchedules = schedules.filter((s) => s.student_id === student.id);
      if (studentSchedules.length === 0) return;

      const totalAllowed = (student.classes_included || 0) + (student.free_classes || 0);
      if (totalAllowed <= 0) return;

      // Calculate exact remaining classes
      const studentLessonsCount = recordedLessons.filter(
        (l) => l.student_id === student.id && l.status !== "Cancelled" && l.status !== "Absent"
      ).length;

      const studentMakeupsCount = makeupEvents.filter(
        (m) => m.student_id === student.id && m.status !== "Cancelled" && m.status !== "Absent"
      ).length;

      const remainingClasses = Math.max(totalAllowed - (studentLessonsCount + studentMakeupsCount), 0);
      if (remainingClasses === 0) return;

      // Start projecting forward from today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let curr = new Date(today);

      const dates: string[] = [];
      let safetyCounter = 0;
      let countedSlots = 0;

      while (countedSlots < remainingClasses && safetyCounter < 730) {
        const y = curr.getFullYear();
        const m = String(curr.getMonth() + 1).padStart(2, "0");
        const d = String(curr.getDate()).padStart(2, "0");
        const dateString = `${y}-${m}-${d}`;

        const weekday = curr.toLocaleDateString("en-US", { weekday: "long" });
        const matchesSchedule = studentSchedules.some(
          (s) => s.day_of_week?.toLowerCase() === weekday.toLowerCase()
        );

        if (matchesSchedule) {
          const lessonRecord = recordedLessons.find(
            (l) => l.student_id === student.id && l.lesson_date?.substring(0, 10) === dateString
          );

          const isCompletedOrExempt = 
            lessonRecord?.status === "Completed" ||
            lessonRecord?.status === "completed" ||
            lessonRecord?.status === "Cancelled" || 
            lessonRecord?.status === "Absent" ||
            lessonRecord?.status === "absent";

          dates.push(dateString);

          if (!isCompletedOrExempt) {
            countedSlots++;
          }
        }

        curr.setDate(curr.getDate() + 1);
        safetyCounter++;
      }

      map[student.id] = dates;
    });

    return map;
  }, [students, schedules, makeupEvents, recordedLessons]);

  // 🌟 Global Filter Calculations for KPI Metrics
  const targetDateStr = todayDateStr;
  const targetMonthStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`;
  const targetYearStr = `${selectedYear}`;

  const now = new Date();
  const firstDayOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
  const firstDayStr = firstDayOfWeek.toISOString().substring(0, 10);

  // Total Classes Count Calculation linked to global filter
  const calculatedClasses = (() => {
    const filtered = recordedLessons.filter((l) => {
      if (!l.lesson_date) return false;
      const statusLower = String(l.status || "").toLowerCase();
      if (statusLower === "cancelled") return false;

      const lDate = l.lesson_date.substring(0, 10);

      if (globalTimeFilter === "daily") return lDate === targetDateStr;
      if (globalTimeFilter === "weekly") return lDate >= firstDayStr;
      if (globalTimeFilter === "monthly") return lDate.startsWith(targetMonthStr);
      return lDate.startsWith(targetYearStr);
    });

    return filtered.length;
  })();

  // Teaching Hours Calculation linked to global filter
  const calculatedHours = (() => {
    const filtered = recordedLessons.filter((l) => {
      if (!l.lesson_date || l.status === "Cancelled") return false;
      const lDate = l.lesson_date.substring(0, 10);
      if (globalTimeFilter === "daily") return lDate === targetDateStr;
      if (globalTimeFilter === "weekly") return lDate >= firstDayStr;
      if (globalTimeFilter === "monthly") return lDate.startsWith(targetMonthStr);
      return lDate.startsWith(targetYearStr);
    });

    const totalMinutes = filtered.reduce((acc, l) => {
      const student = students.find((s) => s.id === l.student_id);
      return acc + (student?.class_duration || 25);
    }, 0);

    const hours = (totalMinutes / 60).toFixed(1);
    return {
      hours,
      classCount: filtered.length,
    };
  })();

  // Total Income Calculation linked to global filter
  const calculatedIncome = (() => {
    const filtered = payments.filter((p) => {
      const pDate = (p.payment_date || p.created_at || "").substring(0, 10);
      if (globalTimeFilter === "daily") return pDate === targetDateStr;
      if (globalTimeFilter === "weekly") return pDate >= firstDayStr;
      if (globalTimeFilter === "monthly") return pDate.startsWith(targetMonthStr);
      return pDate.startsWith(targetYearStr);
    });

    const totalPHP = filtered.reduce((sum, p) => {
      return sum + Number(p.php_equivalent || p.amount_in_php || p.payment_amount || 0);
    }, 0);

    return {
      amount: totalPHP,
      count: filtered.length,
    };
  })()

  return (
    <div className="flex flex-col min-h-screen bg-gray-50/50">
    <RenewalAlertBanner 
  students={students.filter(
    (s) => s.status !== "Archived" && s.status !== "Inactive" && s.payment_status !== "Archived"
  )} 
  recordedLessons={recordedLessons}
  makeupEvents={makeupEvents}
/>

      <main className="p-8 max-w-7xl mx-auto w-full space-y-6">
        {/* Top Header Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-pink-100 shadow-xs">
          <div>
            <h1 className="text-2xl font-bold text-pink-950 flex items-center gap-1.5">
              Teacher Dashboard ✨
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Manage your monthly schedules and class attendance
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* 🌟 Global Master Filter Bar */}
            <div className="flex items-center bg-pink-50/80 p-1.5 rounded-2xl border border-pink-200">
              {(["daily", "weekly", "monthly", "yearly"] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setGlobalTimeFilter(filter)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition capitalize cursor-pointer ${
                    globalTimeFilter === filter
                      ? "bg-pink-600 text-white shadow-xs"
                      : "text-pink-800 hover:bg-pink-100/60"
                  }`}
                >
                  {filter === "daily" ? "Today" : filter === "weekly" ? "This Week" : filter === "monthly" ? "This Month" : "This Year"}
                </button>
              ))}
            </div>

            <button
              onClick={handleRunCleanup}
              disabled={isCleaning}
              className="px-3.5 py-2.5 bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Trash2 size={14} />
              <span>{isCleaning ? "Cleaning..." : "🧹 Clean Storage (>30d)"}</span>
            </button>
          </div>
        </div>

       {/* 1. KPI Metrics Row (Controlled by Master Filter) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Today's Schedule Overview */}
          <div className="bg-white border border-pink-100 rounded-3xl p-5 shadow-xs flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Today&apos;s Schedule
              </span>
              <span className="text-xs font-bold text-pink-700 bg-pink-50 px-2.5 py-1 rounded-xl border border-pink-200">
                Live
              </span>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-pink-950">
                {totalTodaysCount} <span className="text-base font-semibold text-gray-500">Classes</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {todaysRegularSchedules.length} Regular • {todaysMakeupSchedules.length} Make-up
              </p>
            </div>
          </div>

          {/* Card 2: Total Classes Conducted */}
          <div className="bg-white border border-pink-100 rounded-3xl p-5 shadow-xs flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Total Classes
              </span>
              <span className="text-[10px] font-extrabold text-pink-600 bg-pink-50 px-2 py-0.5 rounded-lg border border-pink-200 uppercase">
                {globalTimeFilter}
              </span>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-pink-950">
                {calculatedClasses} <span className="text-base font-semibold text-gray-500">Lessons</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Completed or recorded slots
              </p>
            </div>
          </div>

          {/* Card 3: Teaching Hours */}
          <div className="bg-white border border-pink-100 rounded-3xl p-5 shadow-xs flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Teaching Time
              </span>
              <span className="text-[10px] font-extrabold text-pink-600 bg-pink-50 px-2 py-0.5 rounded-lg border border-pink-200 uppercase">
                {globalTimeFilter}
              </span>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-pink-950">
                {calculatedHours.hours} <span className="text-base font-semibold text-gray-500">Hours</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">
                From {calculatedHours.classCount} completed lessons
              </p>
            </div>
          </div>

          {/* Card 4: Total Income */}
          <div className="bg-white border border-pink-100 rounded-3xl p-5 shadow-xs flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Revenue & Tuition
              </span>
              <span className="text-[10px] font-extrabold text-pink-600 bg-pink-50 px-2 py-0.5 rounded-lg border border-pink-200 uppercase">
                {globalTimeFilter}
              </span>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-pink-600">
                ₱{calculatedIncome.amount.toLocaleString()}
              </p>
              <p className="text-xs text-pink-400 font-medium mt-1">
                {calculatedIncome.count} transactions recorded
              </p>
            </div>
          </div>
        </div>

      {/* 2. Classes For Today Card */}
        <div className="bg-white p-6 rounded-3xl border border-pink-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-pink-950">
              📅 Classes for Today ({todayObj.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })})
            </h2>
            <span className="bg-pink-100 text-pink-700 text-xs font-bold px-3 py-1 rounded-full">
              {totalTodaysCount} {totalTodaysCount === 1 ? "Class" : "Classes"}
            </span>
          </div>

          {totalTodaysCount === 0 ? (
            <p className="text-xs text-gray-400 italic">No classes scheduled for today. Enjoy your day off! ✨</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
             {todaysCombinedSchedules.map((item) => {
                const matchingLesson = recordedLessons.find(
                  (l) => l.student_id === item.studentId && extractDateFromTimestamp(l.lesson_date) === todayDateStr
                );
                const status = matchingLesson ? matchingLesson.status : item.originalStatus;
                const statusLower = String(status || "").toLowerCase();

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 shadow-2xs ${
                      item.type === "makeup"
                        ? "border-pink-200 bg-pink-100/40"
                        : "border-pink-100 bg-pink-50/30"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-bold text-pink-900">{item.time} ({item.duration}m)</p>
                        <p className="text-sm font-extrabold text-pink-950 mt-0.5">{item.studentName}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-xl ${
                        statusLower === "completed" 
                          ? "bg-green-100 text-green-700" 
                          : item.type === "makeup"
                          ? "bg-pink-200 text-pink-900"
                          : "bg-pink-100 text-pink-700"
                      }`}>
                        {status} {item.type === "makeup" && "(Make-up)"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. Calendar Grid Card */}
        <div className="bg-white rounded-3xl border border-pink-100 shadow-xs p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-pink-50">
            <h2 className="text-2xl font-bold text-pink-950">
              {monthNames[selectedMonth]} {selectedYear}
            </h2>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2 bg-pink-50/60 p-1.5 rounded-2xl border border-pink-100">
                <select
                  className="bg-white border border-pink-200 rounded-xl px-3 py-1.5 text-xs font-bold text-pink-900 focus:outline-none cursor-pointer"
                  value={selectedMonth}
                  onChange={(e) => setCurrentDate(new Date(selectedYear, Number(e.target.value), 1))}
                >
                  {monthNames.map((m, idx) => (
                    <option key={m} value={idx}>{m}</option>
                  ))}
                </select>

                <select
                  className="bg-white border border-pink-200 rounded-xl px-3 py-1.5 text-xs font-bold text-pink-900 focus:outline-none cursor-pointer"
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

              <div className="flex items-center gap-1 border border-pink-100 bg-pink-50/40 p-1 rounded-2xl">
                <button
                  onClick={() => setCurrentDate(new Date(selectedYear, selectedMonth - 1, 1))}
                  className="p-1.5 hover:bg-white rounded-xl text-pink-700 transition cursor-pointer"
                  title="Previous Month"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setCurrentDate(new Date(selectedYear, selectedMonth + 1, 1))}
                  className="p-1.5 hover:bg-white rounded-xl text-pink-700 transition cursor-pointer"
                  title="Next Month"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
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

                  <div className="space-y-1.5 relative">
                    {/* MAKEUP CLASSES */}
                    {makeupEvents
                      .filter((event) => {
                        const makeupDate = event.makeup_date ? event.makeup_date.substring(0, 10) : "";
                        return makeupDate === dateString;
                      })
                      .map((event) => {
                        const makeupTime = extractTimeFromTimestamp(event.makeup_date);

                        const matchingLesson = recordedLessons.find(
                          (l) => l.student_id === event.student_id && l.lesson_date?.substring(0, 10) === dateString
                        );
                        const makeupStatus = event.status || (matchingLesson ? matchingLesson.status : "Scheduled");
                        return (
                          <ClassEvent
                            key={`makeup-${event.id}`}
                            id={event.id}
                            type="makeup"
                            time={makeupTime}
                            student={`✨ ${event.students?.name || "Student"}`}
                            studentId={event.student_id}
                            status={makeupStatus}
                            dateString={dateString}
                            duration={event.duration || 40}
                            topic={event.topic || "Make-up Class"}
                            onStatusUpdate={fetchDashboardData}
                            onOpenModal={(statusPreset = "absent") => {
                              if (statusPreset === "present") {
                                setSelectedLesson({
                                  eventId: event.id,
                                  studentId: event.student_id,
                                  studentName: event.students?.name || "Student",
                                  type: "makeup",
                                  dateString
                                });
                              } else {
                                setSelectedAttendance({
                                  eventId: event.id,
                                  studentId: event.student_id,
                                  studentName: event.students?.name || "Student",
                                  status: statusPreset,
                                  eventType: "makeup",
                                  dateString
                                });
                              }
                            }}
                          />
                        );
                      })}

                    {/* REGULAR CLASSES */}
                    {schedules
                      .filter((sched) => {
                        if (sched.day_of_week?.toLowerCase() !== weekdayName.toLowerCase()) {
                          return false;
                        }

                        const hasLessonRecord = recordedLessons.some(
                          (l) => l.student_id === sched.student_id && l.lesson_date?.substring(0, 10) === dateString
                        );
                        if (hasLessonRecord) return true;

                        const validDates = studentValidDatesMap[sched.student_id];
                        if (validDates) {
                          return validDates.includes(dateString);
                        }
                        return false;
                      })
                      .map((sched) => {
                        const matchingLesson = recordedLessons.find(
                          (l) => l.student_id === sched.student_id && l.lesson_date?.substring(0, 10) === dateString
                        );
                        const currentEventStatus = matchingLesson ? matchingLesson.status : "Scheduled";

                        return (
                          <ClassEvent
                            key={`sched-${sched.id}-${dayNumber}`}
                            id={sched.id}
                            type="regular"
                            time={sched.schedule_time}
                            student={sched.students?.name || "Student"}
                            studentId={sched.student_id}
                            status={currentEventStatus}
                            dateString={dateString}
                            duration={sched.duration || 40}
                            topic={sched.topic || "Regular Class"}
                            onStatusUpdate={fetchDashboardData}
                            onOpenModal={(statusPreset = "absent") => {
                              if (statusPreset === "present") {
                                setSelectedLesson({
                                  eventId: sched.id,
                                  studentId: sched.student_id,
                                  studentName: sched.students?.name || "Student",
                                  type: "regular",
                                  dateString
                                });
                              } else {
                                setSelectedAttendance({
                                  eventId: sched.id,
                                  studentId: sched.student_id,
                                  studentName: sched.students?.name || "Student",
                                  status: statusPreset,
                                  eventType: "regular",
                                  dateString
                                });
                              }
                            }}
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

      {/* Attendance Modal */}
      {selectedAttendance && (
        <AttendanceModal
          isOpen={true}
          onClose={() => {
            setSelectedAttendance(null);
            fetchDashboardData();
          }}
          eventId={selectedAttendance.eventId}
          studentId={selectedAttendance.studentId}
          studentName={selectedAttendance.studentName}
          initialStatus={selectedAttendance.status}
          eventType={selectedAttendance.eventType}
          dateString={selectedAttendance.dateString}
        />
      )}

      {/* Lesson Log Modal */}
      {selectedLesson && (
        <LessonLogModal
          isOpen={true}
          onClose={() => {
            setSelectedLesson(null);
            fetchDashboardData();
          }}
          eventId={selectedLesson.eventId}
          studentId={selectedLesson.studentId}
          studentName={selectedLesson.studentName}
          eventType={selectedLesson.type}
          dateString={selectedLesson.dateString}
          studentBooks={
            students
              .find((s) => s.id === selectedLesson.studentId)
              ?.student_books?.map((sb: any) => sb.books || sb) || []
          }
        />
      )}
    </div>
  );
}