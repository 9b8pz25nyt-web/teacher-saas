"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import RenewalAlertBanner from "@/components/RenewalAlertBanner";
import ClassEvent from "@/components/ClassEvent";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { cleanupOldHomeworkFiles } from "@/lib/storageCleanup";
import AttendanceModal from "@/components/AttendanceModal";
import LessonLogModal from "@/components/LessonLogModal";

export default function DashboardPage() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [makeupEvents, setMakeupEvents] = useState<any[]>([]);
  const [recordedLessons, setRecordedLessons] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCleaning, setIsCleaning] = useState(false);
  const [payments, setPayments] = useState<any[]>([]);
  const [hoursFilter, setHoursFilter] = useState<"daily" | "monthly" | "yearly">("monthly");
  const [incomeFilter, setIncomeFilter] = useState<"daily" | "monthly" | "yearly">("monthly");

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

      // 1. Fetch Students
      const { data: studentsData } = await supabase
        .from("students")
        .select("*");

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

  // Calendar Math
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const firstDayWeekdayIndex = new Date(selectedYear, selectedMonth, 1).getDay();
  const startDayOffset = (firstDayWeekdayIndex + 6) % 7;
  const totalCalendarSlots = Math.ceil((startDayOffset + daysInMonth) / 7) * 7;

  // Rollover mapping
  const studentValidDatesMap = (() => {
    const map: Record<string, string[]> = {};
    
    students.forEach((student) => {
      const studentSchedules = schedules.filter((s) => s.student_id === student.id);
      if (studentSchedules.length === 0) return;

      const totalAllowed = (student.classes_included || 0) + (student.free_classes || 0);
      if (totalAllowed <= 0) return;

      const activeMakeupsCount = makeupEvents.filter(
        (m) => m.student_id === student.id && m.status !== "Cancelled"
      ).length;

      const startDateStr = student.contract_start_date || `${selectedYear}-01-01`;
      const startDate = new Date(startDateStr);
      const dates: string[] = [];
      
      let curr = new Date(startDate);
      let safetyCounter = 0;
      let countedSlots = 0;

      const targetRegularSlots = Math.max(totalAllowed - activeMakeupsCount, 0);

      while (countedSlots < targetRegularSlots && safetyCounter < 730) {
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
          const isCancelled = lessonRecord?.status === "Cancelled";

          dates.push(dateString);

          if (!isCancelled) {
            countedSlots++;
          }
        }

        curr.setDate(curr.getDate() + 1);
        safetyCounter++;
      }

      map[student.id] = dates;
    });

    return map;
  })();

  // Total Teaching Hours Calculation based on Recorded Lessons
  const calculatedHours = (() => {
    const targetDateStr = todayDateStr;
    const targetMonthStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`;
    const targetYearStr = `${selectedYear}`;

    const filtered = recordedLessons.filter((l) => {
      if (!l.lesson_date || l.status === "Cancelled") return false;
      const lDate = l.lesson_date.substring(0, 10);
      if (hoursFilter === "daily") return lDate === targetDateStr;
      if (hoursFilter === "monthly") return lDate.startsWith(targetMonthStr);
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

  // Total Income Calculation based on Payments
  const calculatedIncome = (() => {
    const targetDateStr = todayDateStr;
    const targetMonthStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`;
    const targetYearStr = `${selectedYear}`;

    const filtered = payments.filter((p) => {
      const pDate = (p.payment_date || p.created_at || "").substring(0, 10);
      if (incomeFilter === "daily") return pDate === targetDateStr;
      if (incomeFilter === "monthly") return pDate.startsWith(targetMonthStr);
      return pDate.startsWith(targetYearStr);
    });

    const totalPHP = filtered.reduce((sum, p) => {
      return sum + Number(p.php_equivalent || p.amount_in_php || p.payment_amount || 0);
    }, 0);

    return {
      amount: totalPHP,
      count: filtered.length,
    };
  })();

  return (
    <div className="flex flex-col min-h-screen bg-gray-50/50">
      {/* Pass the students list directly to the banner */}
      <RenewalAlertBanner students={students} />

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

          <div>
            <button
              onClick={handleRunCleanup}
              disabled={isCleaning}
              className="px-3.5 py-2 bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Trash2 size={14} />
              <span>{isCleaning ? "Cleaning..." : "🧹 Clean Storage (>30d)"}</span>
            </button>
          </div>
        </div>

        {/* 1. KPI Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Today's Class Overview */}
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

          {/* Card 2: Teaching Hours */}
          <div className="bg-white border border-pink-100 rounded-3xl p-5 shadow-xs flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Teaching Time
              </span>
              <select
                value={hoursFilter}
                onChange={(e) => setHoursFilter(e.target.value as any)}
                className="text-xs font-bold text-pink-700 bg-pink-50 border border-pink-200 rounded-xl px-2.5 py-1 focus:outline-none cursor-pointer"
              >
                <option value="daily">Today</option>
                <option value="monthly">This Month</option>
                <option value="yearly">This Year</option>
              </select>
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

          {/* Card 3: Total Income */}
          <div className="bg-white border border-pink-100 rounded-3xl p-5 shadow-xs flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Revenue & Tuition
              </span>
              <select
                value={incomeFilter}
                onChange={(e) => setIncomeFilter(e.target.value as any)}
                className="text-xs font-bold text-pink-700 bg-pink-50 border border-pink-200 rounded-xl px-2.5 py-1 focus:outline-none cursor-pointer"
              >
                <option value="daily">Today</option>
                <option value="monthly">This Month</option>
                <option value="yearly">This Year</option>
              </select>
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
              {/* Regular Schedules Today */}
              {todaysRegularSchedules.map((sched) => {
                const matchingLesson = recordedLessons.find(
                  (l) => l.student_id === sched.student_id && l.lesson_date?.substring(0, 10) === todayDateStr
                );
                const status = matchingLesson ? matchingLesson.status : (sched.status || "Scheduled");

                return (
                  <div
                    key={`today-reg-${sched.id}`}
                    className="p-4 rounded-2xl border border-pink-100 bg-pink-50/30 flex flex-col justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-bold text-pink-900">{sched.schedule_time} ({sched.duration || 40}m)</p>
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

              {/* Makeup Schedules Today */}
              {todaysMakeupSchedules.map((makeup) => {
                const makeupTime = makeup.makeup_date?.includes("T") 
                  ? makeup.makeup_date.split("T")[1].substring(0, 5) 
                  : "18:00";
                
                return (
                  <div
                    key={`today-makeup-${makeup.id}`}
                    className="p-4 rounded-2xl border border-pink-200 bg-pink-100/40 flex flex-col justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-bold text-pink-900">{makeupTime} ({makeup.duration || 40}m)</p>
                        <p className="text-sm font-extrabold text-pink-950 mt-0.5">✨ {makeup.students?.name || "Student"}</p>
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-xl bg-pink-200 text-pink-900">
                        {makeup.status || "Scheduled"} (Make-up)
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
                        const makeupTime = event.makeup_date?.includes("T")
                          ? event.makeup_date.split("T")[1].substring(0, 5)
                          : "18:00";

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
                        const currentEventStatus = matchingLesson ? matchingLesson.status : (sched.status || "Scheduled");

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
        />
      )}
    </div>
  );
}