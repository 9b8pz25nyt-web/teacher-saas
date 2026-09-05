"use client";

import { useEffect, useState, useCallback, useRef, use } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { countries } from "@/constants/countries";
import { currencies } from "@/constants/currencies";
import { convertToPHP } from "@/lib/currency";
import QRCode from "qrcode";
import {
  ArrowLeft,
  BookOpen,
  Edit,
  Trash2,
  Plus,
  Copy,
  Check,
  FileCheck,
  Download,
  X,
  Sparkles,
  Video,
} from "lucide-react";

const DEFAULT_ALIASES = ["Teacher Gabi", "Teacher Princess"];
const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export default function StudentDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const studentId = resolvedParams.id;
  const router = useRouter();
  const searchParams = useSearchParams();

  const [student, setStudent] = useState<any>(null);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [teacherAliases, setTeacherAliases] = useState<string[]>(DEFAULT_ALIASES);
  const [loading, setLoading] = useState(true);
  const [copiedPortal, setCopiedPortal] = useState(false);
  const [copiedNotice, setCopiedNotice] = useState(false);

  // Renewal Modal & PDF State
  const [isRenewalModalOpen, setIsRenewalModalOpen] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const renewalPdfRef = useRef<HTMLDivElement>(null);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [teacherAlias, setTeacherAlias] = useState("Teacher Gabi");
  const [meetingLink, setMeetingLink] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [country, setCountry] = useState("");
  const [paymentType, setPaymentType] = useState("Monthly");
  const [paymentCurrency, setPaymentCurrency] = useState("PHP");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [phpEquivalent, setPhpEquivalent] = useState("");
  const [classesIncluded, setClassesIncluded] = useState("30");
  const [classesCompleted, setClassesCompleted] = useState("0");
  const [classDuration, setClassDuration] = useState("40");
  const [paymentStatus, setPaymentStatus] = useState("Active");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [assignedBookId, setAssignedBookId] = useState("");
  const [notes, setNotes] = useState("");
  const [savingBook, setSavingBook] = useState(false);

  // Schedule Modal State
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleDays, setScheduleDays] = useState<string[]>([]);
  const [scheduleTime, setScheduleTime] = useState("18:00");
  const [scheduleDuration, setScheduleDuration] = useState("40");
  const [scheduleTopic, setScheduleTopic] = useState("Regular Class");
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);

  // Report Modal State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [lessonTitle, setLessonTitle] = useState("");
  const [reportDate, setReportDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [vocabulary, setVocabulary] = useState("");
  const [strengths, setStrengths] = useState("");
  const [improvements, setImprovements] = useState("");
  const [homework, setHomework] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [homeworkFile, setHomeworkFile] = useState<File | null>(null);

  useEffect(() => {
    const action = searchParams.get("action");
    const dateParam = searchParams.get("date");

    if (action === "log_lesson") {
      if (dateParam) {
        setReportDate(dateParam);
      }
      setIsReportModalOpen(true);
    }
  }, [searchParams]);

  const fetchStudentData = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("teacher_aliases")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profile?.teacher_aliases && profile.teacher_aliases.length > 0) {
        setTeacherAliases(profile.teacher_aliases);
      }

      const { data: studentData, error } = await supabase
        .from("students")
        .select("*, books(id, title, level)")
        .eq("id", studentId)
        .single();

      if (error || !studentData) {
        router.push("/students");
        return;
      }

      setStudent(studentData);

      setName(studentData.name || "");
      setTeacherAlias(studentData.teacher_alias || "Teacher Gabi");
      setMeetingLink(studentData.meeting_link || "");
      setEmail(studentData.email || "");
      setPhone(studentData.phone || "");
      setAge(studentData.age ? String(studentData.age) : "");
      setCountry(studentData.country || "");
      setPaymentType(studentData.payment_type || "Monthly");
      setPaymentCurrency(studentData.payment_currency || "PHP");
      setPaymentAmount(
        studentData.payment_amount
          ? Number(studentData.payment_amount).toLocaleString()
          : ""
      );
      setPhpEquivalent(
        studentData.php_equivalent
          ? Number(studentData.php_equivalent).toLocaleString()
          : ""
      );
      setClassesIncluded(
        studentData.classes_included ? String(studentData.classes_included) : "30"
      );
      setClassesCompleted(
        studentData.classes_completed
          ? String(studentData.classes_completed)
          : "0"
      );
      setClassDuration(
        studentData.class_duration ? String(studentData.class_duration) : "40"
      );
      setPaymentStatus(studentData.payment_status || "Active");
      setStartDate(
        studentData.start_date || studentData.contract_start_date || ""
      );
      setEndDate(studentData.end_date || studentData.contract_end_date || "");
      setAssignedBookId(
        studentData.assigned_book_id || studentData.book_id || ""
      );
      setNotes(studentData.notes || "");

      const [{ data: scheds }, { data: bks }, { data: repList }] =
        await Promise.all([
          supabase.from("schedules").select("*").eq("student_id", studentId),
          supabase.from("books").select("*").eq("teacher_id", user.id).order("title", { ascending: true }),
          supabase
            .from("class_reports")
            .select("*")
            .eq("student_id", studentId)
            .order("report_date", { ascending: false }),
        ]);

      if (scheds) setSchedules(scheds);
      if (bks) setBooks(bks);
      if (repList) setReports(repList);
    } catch (err) {
      console.error("Error fetching student details:", err);
    } finally {
      setLoading(false);
    }
  }, [studentId, router]);

  useEffect(() => {
    fetchStudentData();
  }, [fetchStudentData]);

  useEffect(() => {
    if (student?.access_token) {
      const portal = `${window.location.origin}/portal/${student.access_token}`;
      QRCode.toDataURL(portal, {
        width: 160,
        margin: 1,
        color: { dark: "#1f2937", light: "#ffffff" },
      })
        .then((url) => setQrCodeDataUrl(url))
        .catch(() => setQrCodeDataUrl(""));
    }
  }, [student?.access_token]);

  async function calculatePHP(amount: string, currency: string) {
    const cleanAmount = amount.replace(/,/g, "");
    const numberAmount = Number(cleanAmount);

    if (!numberAmount || isNaN(numberAmount)) {
      setPhpEquivalent("");
      return;
    }

    try {
      const php = await convertToPHP(numberAmount, currency);
      setPhpEquivalent(Math.round(php).toLocaleString());
    } catch (error) {
      console.error("Currency conversion failed:", error);
      setPhpEquivalent("");
    }
  }

  async function handleBookChange(newBookId: string) {
    setAssignedBookId(newBookId);
    setSavingBook(true);

    const { error } = await supabase
      .from("students")
      .update({ 
        assigned_book_id: newBookId || null,
        book_id: newBookId || null 
      })
      .eq("id", studentId);

    setSavingBook(false);

    if (error) {
      alert("Failed to update assigned book: " + error.message);
    } else {
      fetchStudentData();
    }
  }

  async function handleUpdateStudent() {
    try {
      const { error } = await supabase
        .from("students")
        .update({
          name,
          teacher_alias: teacherAlias,
          meeting_link: meetingLink.trim() || null,
          email: email.trim() || null,
          phone: phone.trim() || null,
          age: age ? Number(age) : null,
          country,
          payment_type: paymentType,
          payment_currency: paymentCurrency,
          payment_amount: Number(paymentAmount.replace(/,/g, "")) || 0,
          php_equivalent: phpEquivalent
            ? Number(phpEquivalent.replace(/,/g, ""))
            : null,
          classes_included: Number(classesIncluded) || 0,
          classes_completed: Number(classesCompleted) || 0,
          class_duration: Number(classDuration) || 40,
          payment_status: paymentStatus,
          start_date: startDate || null,
          contract_start_date: startDate || null,
          end_date: endDate || null,
          assigned_book_id: assignedBookId || null,
          book_id: assignedBookId || null,
          notes: notes.trim() || null,
        })
        .eq("id", studentId);

      if (error) {
        alert(error.message);
        return;
      }

      setIsEditModalOpen(false);
      fetchStudentData();
    } catch (err) {
      console.error("Update error:", err);
    }
  }

  async function handleAddSchedule(e: React.FormEvent) {
    e.preventDefault();
    if (scheduleDays.length === 0) {
      alert("Please select at least one day of the week.");
      return;
    }
    if (!scheduleTime) {
      alert("Please select a time.");
      return;
    }

    setIsSavingSchedule(true);
    try {
      const insertPayload = scheduleDays.map((day) => ({
        student_id: studentId,
        day_of_week: day,
        schedule_time: scheduleTime,
        duration: Number(scheduleDuration) || 40,
        topic: scheduleTopic.trim() || "Regular Class",
        status: "Active",
      }));

      const { error } = await supabase.from("schedules").insert(insertPayload);
      if (error) throw error;

      setIsScheduleModalOpen(false);
      setScheduleDays([]);
      setScheduleTopic("Regular Class");
      fetchStudentData();
    } catch (err: any) {
      console.error("Error adding schedule:", err);
      alert(err.message || "Failed to add schedule");
    } finally {
      setIsSavingSchedule(false);
    }
  }

  async function handleDeleteSchedule(scheduleId: string) {
    if (!confirm("Are you sure you want to delete this schedule slot?")) return;
    try {
      const { error } = await supabase
        .from("schedules")
        .delete()
        .eq("id", scheduleId);
      if (error) throw error;
      fetchStudentData();
    } catch (err: any) {
      alert("Failed to delete schedule: " + err.message);
    }
  }

  async function handleDeleteReport(
    reportId: string,
    homeworkFileUrl?: string | null
  ) {
    if (
      !confirm(
        "Are you sure you want to delete this lesson report? This will decrease the completed class count by 1."
      )
    ) {
      return;
    }

    try {
      if (homeworkFileUrl) {
        const parts = homeworkFileUrl.split("/homework-files/");
        if (parts[1]) {
          await supabase.storage
            .from("homework-files")
            .remove([decodeURIComponent(parts[1])]);
        }
      }

      const { error } = await supabase
        .from("class_reports")
        .delete()
        .eq("id", reportId);
      if (error) throw error;

      const newCompletedCount = Math.max(
        (student?.classes_completed || 1) - 1,
        0
      );
      await supabase
        .from("students")
        .update({ classes_completed: newCompletedCount })
        .eq("id", studentId);

      fetchStudentData();
    } catch (err: any) {
      console.error("Error deleting report:", err);
      alert("Failed to delete report: " + (err.message || err));
    }
  }

  async function handleAddReport(e: React.FormEvent) {
    e.preventDefault();
    if (!lessonTitle.trim()) return alert("Please enter a lesson title");

    setIsSubmittingReport(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      let uploadedFileUrl: string | null = null;

      if (homeworkFile) {
        const fileExt = homeworkFile.name.split(".").pop();
        const fileName = `${studentId}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("homework-files")
          .upload(fileName, homeworkFile);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from("homework-files")
          .getPublicUrl(fileName);

        uploadedFileUrl = publicUrlData.publicUrl;
      }

      const { error: reportError } = await supabase
        .from("class_reports")
        .insert({
          student_id: studentId,
          teacher_id: user?.id,
          report_date: reportDate,
          lesson_title: lessonTitle.trim(),
          vocabulary: vocabulary.trim() || null,
          strengths: strengths.trim() || null,
          improvements: improvements.trim() || null,
          homework: homework.trim() || null,
          homework_file_url: uploadedFileUrl,
          teacher_alias: student?.teacher_alias || teacherAlias || "Teacher Gabi",
        });

      if (reportError) throw reportError;

      const currentCompleted = student.classes_completed || 0;
      const newCompletedCount = currentCompleted + 1;

      await supabase
        .from("students")
        .update({ classes_completed: newCompletedCount })
        .eq("id", studentId);

      setLessonTitle("");
      setVocabulary("");
      setStrengths("");
      setImprovements("");
      setHomework("");
      setHomeworkFile(null);
      setIsReportModalOpen(false);
      fetchStudentData();
    } catch (err: any) {
      console.error("Error saving report:", err);
      alert(err.message || "Failed to save report");
    } finally {
      setIsSubmittingReport(false);
    }
  }

  async function handleDeleteStudent() {
    if (!confirm(`Are you sure you want to delete ${student?.name}?`)) return;
    const { error } = await supabase
      .from("students")
      .delete()
      .eq("id", studentId);
    if (!error) {
      router.push("/students");
    } else {
      alert(error.message);
    }
  }

  function handleCopyPortalLink() {
    if (!student?.access_token) return;
    const portalUrl = `${window.location.origin}/portal/${student.access_token}`;
    navigator.clipboard.writeText(portalUrl);
    setCopiedPortal(true);
    setTimeout(() => setCopiedPortal(false), 2000);
  }

  async function downloadRenewalPdf() {
    if (!renewalPdfRef.current) return;
    setIsGeneratingPdf(true);

    try {
      // @ts-ignore
      const html2pdf = (await import("html2pdf.js")).default;
      const element = renewalPdfRef.current;
      const opt = {
        margin: 8,
        filename: `Renewal_Notice_${student?.name || "Student"}.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
        },
        jsPDF: { unit: "mm" as const, format: "a5" as const, orientation: "portrait" as const },
      };

      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error("PDF export error:", err);
      alert("Failed to export PDF. Please try again.");
    } finally {
      setIsGeneratingPdf(false);
    }
  }

  const combinedTotalClasses = Number(student?.classes_included || 5) + Number(student?.free_classes || 1);

  function handleCopyRenewalNoticeText() {
    const remaining = Math.max(
      combinedTotalClasses - (student?.classes_completed || 0),
      0
    );
    const portalUrl = student?.access_token
      ? `${window.location.origin}/portal/${student.access_token}`
      : "Available in your welcome pack";

    const scheduleSummary =
      schedules.length > 0
        ? schedules
            .map(
              (s) =>
                `${s.day_of_week} at ${s.schedule_time || s.start_time || s.time}`
            )
            .join(", ")
        : "Flexible Schedule";

    const currentTeacherAlias = student?.teacher_alias || teacherAlias || "Teacher";

    const noticeText = `🌸 LESSON PACKAGE RENEWAL NOTICE 🌸

Dear ${student?.name || "Parent"},

I hope you are having a wonderful week!

This is a gentle update regarding ${student?.name}'s English learning package. We have completed ${student?.classes_completed || 0} out of ${combinedTotalClasses} scheduled sessions, with only ${remaining} class${remaining === 1 ? "" : "es"} remaining in the current cycle.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 RENEWAL & PACKAGE DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Student: ${student?.name}
• Course Material: ${assignedBook?.title || "Custom Curriculum"}
• Upcoming Package: ${combinedTotalClasses} Sessions (${student?.class_duration || 40} mins / class)
• Schedule: ${scheduleSummary}
• Renewal Fee: ${currencyObj?.symbol || ""}${Number(student?.payment_amount || 0).toLocaleString()} ${student?.payment_currency || "PHP"}${student?.php_equivalent ? ` (≈ ₱${Number(student?.php_equivalent || 0).toLocaleString()} PHP)` : ""}

📱 Student Learning Portal:
${portalUrl}

To ensure our scheduled class time remains reserved without interruption, please let me know when you would like to renew.

Thank you so much for your continued support! ✨

Warm regards,
${currentTeacherAlias}`;

    navigator.clipboard.writeText(noticeText);
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 2500);
  }

  if (loading) {
    return (
      <div className="p-12 text-center text-pink-600 font-medium">
        Loading student profile...
      </div>
    );
  }

  const countryObj = countries.find((c) => c.name === student.country);
  const currencyObj = currencies[student.payment_currency];
  const assignedBook = books.find(
    (b) => b.id === (student.assigned_book_id || student.book_id)
  );
  const remainingCount = Math.max(
    combinedTotalClasses - (student.classes_completed || 0),
    0
  );
  const progressPercent = Math.min(
    Math.round(
      ((student.classes_completed || 0) / (combinedTotalClasses || 1)) * 100
    ),
    100
  );

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/students"
          className="text-xs font-semibold text-pink-600 hover:text-pink-700 flex items-center gap-1.5 transition"
        >
          <ArrowLeft size={16} />
          <span>Back to Students</span>
        </Link>
        <div className="flex items-center gap-2">
          {student.access_token && (
            <button
              onClick={handleCopyPortalLink}
              className="px-3.5 py-2 bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              {copiedPortal ? (
                <Check size={14} className="text-emerald-600" />
              ) : (
                <Copy size={14} />
              )}
              <span>
                {copiedPortal ? "Portal Link Copied!" : "Copy Portal Link"}
              </span>
            </button>
          )}

          <button
            onClick={() => setIsReportModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus size={14} />
            <span>Log Lesson & Homework</span>
          </button>

          <button
            onClick={() => setIsEditModalOpen(true)}
            className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Edit size={14} />
            <span>Edit Student</span>
          </button>
          <button
            onClick={handleDeleteStudent}
            className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 size={14} />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Profile Overview Card */}
      <div className="bg-white border border-pink-100 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-pink-950">
              {student.name}
            </h1>
            <span className="px-3 py-1 bg-pink-50 text-pink-700 border border-pink-200 text-xs font-bold rounded-xl uppercase">
              {student.teacher_alias || "Teacher Gabi"}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
            <span>
              {countryObj?.flag} {student.country || "International"}
            </span>
            <span>•</span>
            <span>Age: {student.age ? `${student.age} yrs` : "N/A"}</span>
            <span>•</span>
            <span>Email: {student.email || "N/A"}</span>
            <span>•</span>
            <span>Phone: {student.phone || "N/A"}</span>
          </div>
        </div>

        {/* Video Classroom Access Box */}
        <div className="bg-pink-50/50 border border-pink-100 p-4 rounded-2xl flex items-center gap-3 min-w-[280px]">
          <div className="p-3 bg-pink-600 text-white rounded-xl shadow-xs">
            <Video size={20} />
          </div>
          <div className="text-xs space-y-0.5 overflow-hidden">
            <p className="font-bold text-gray-900">Classroom Meeting Link</p>
            {student.meeting_link ? (
              <a
                href={student.meeting_link}
                target="_blank"
                rel="noreferrer"
                className="text-pink-600 font-mono hover:underline truncate block max-w-[200px]"
              >
                {student.meeting_link}
              </a>
            ) : (
              <p className="text-gray-400 italic">No link added yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Grid: Package Stats & Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Class Package Progress */}
        <div className="bg-white border border-pink-100 rounded-3xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">Class Package</h3>
            <span className="text-xs font-bold text-pink-600">
              {progressPercent}% Done
            </span>
          </div>
          <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-pink-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2.5 bg-pink-50/50 rounded-xl">
              <p className="text-gray-400 font-medium text-[10px] uppercase">
                Completed
              </p>
              <p className="font-bold text-gray-800 text-base mt-0.5">
                {student.classes_completed || 0}
              </p>
            </div>
            <div className="p-2.5 bg-pink-50/50 rounded-xl">
              <p className="text-gray-400 font-medium text-[10px] uppercase">
                Remaining
              </p>
              <p className="font-bold text-pink-600 text-base mt-0.5">
                {remainingCount}
              </p>
            </div>
            <div className="p-2.5 bg-pink-50/50 rounded-xl">
              <p className="text-gray-400 font-medium text-[10px] uppercase">
                Duration
              </p>
              <p className="font-bold text-gray-800 text-base mt-0.5">
                {student.class_duration || 40}m
              </p>
            </div>
          </div>
        </div>

        {/* Assigned Curriculum / Book Card with Dropdown */}
        <div className="bg-white border border-pink-100 rounded-3xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-pink-600 font-bold text-sm">
              <BookOpen size={16} />
              <span>Assigned Curriculum / Book</span>
            </div>
            {savingBook && <span className="text-[10px] text-gray-400">Saving...</span>}
          </div>
          <div className="p-3 bg-pink-50/50 rounded-2xl border border-pink-100 space-y-2">
            <select
              className="w-full bg-white border border-pink-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500 cursor-pointer"
              value={assignedBookId}
              onChange={(e) => handleBookChange(e.target.value)}
            >
              <option value="">No Book Assigned</option>
              <option value="free_talk">🗣️ Free Talk / Daily Conversation</option>
              <option value="to_follow">⏳ To Follow / Level Assessment</option>
              {books.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title} {b.level ? `(${b.level})` : ""}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-gray-400 px-1">
              {assignedBook?.level
                ? `Level: ${assignedBook.level}`
                : "Select or switch primary study material"}
            </p>
          </div>
        </div>

        {/* Tuition & Billing */}
        <div className="bg-white border border-pink-100 rounded-3xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">Tuition & Billing</h3>
            <button
              type="button"
              onClick={() => setIsRenewalModalOpen(true)}
              className="text-[11px] font-bold text-pink-600 hover:text-pink-700 flex items-center gap-1 cursor-pointer"
              title="Open and download Renewal Notice PDF"
            >
              <Sparkles size={13} className="text-pink-600" />
              <span>Renewal Notice</span>
            </button>
          </div>
          <div className="bg-pink-50/40 p-3.5 rounded-2xl space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Package Rate:</span>
              <span className="font-bold text-pink-600 text-sm">
                {currencyObj?.symbol || ""}
                {Number(student.payment_amount || 0).toLocaleString()}{" "}
                {student.payment_currency}
              </span>
            </div>
            {student.php_equivalent && (
              <div className="flex justify-between items-center text-gray-600">
                <span>PHP Value:</span>
                <span className="font-semibold text-gray-900">
                  ₱{Number(student.php_equivalent || 0).toLocaleString()}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center pt-1 border-t border-pink-100">
              <span className="text-gray-500">Payment Status:</span>
              <span className="font-bold text-emerald-600 uppercase text-[10px]">
                {student.payment_status || "Active"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Schedule & Notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Weekly Schedule */}
        <div className="bg-white border border-pink-100 rounded-3xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">Weekly Schedule</h3>
            <button
              type="button"
              onClick={() => setIsScheduleModalOpen(true)}
              className="text-xs font-bold text-pink-600 hover:text-pink-700 flex items-center gap-1 cursor-pointer"
            >
              <Plus size={14} />
              <span>Add Schedule</span>
            </button>
          </div>
          {schedules.length === 0 ? (
            <p className="text-xs text-gray-400 italic">
              No scheduled class times added yet.
            </p>
          ) : (
            <div className="space-y-1.5">
              {schedules.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between text-xs p-2.5 bg-pink-50/50 rounded-xl border border-pink-50"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-800">
                      {s.day_of_week}
                    </span>
                    <span className="text-gray-400">•</span>
                    <span className="text-pink-600 font-semibold">
                      {s.start_time || s.schedule_time || s.time}
                    </span>
                    <span className="text-gray-400">({s.duration || 40}m)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteSchedule(s.id)}
                    className="text-gray-400 hover:text-red-600 p-1 transition cursor-pointer"
                    title="Delete schedule slot"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Student Notes */}
        <div className="bg-white border border-pink-100 rounded-3xl p-5 shadow-xs space-y-2">
          <h3 className="text-sm font-bold text-gray-900">Notes & Objectives</h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            {student.notes || "No special notes recorded yet."}
          </p>
        </div>
      </div>

      {/* Class Reports & Homework Log History */}
      <div className="bg-white border border-pink-100 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-gray-900">
              Logged Lessons & Reports
            </h3>
            <span className="text-[11px] font-bold text-pink-600 bg-pink-50 px-2 py-0.5 rounded-lg border border-pink-200">
              {reports.length}
            </span>
          </div>
          <button
            onClick={() => setIsReportModalOpen(true)}
            className="text-xs font-bold text-pink-600 hover:text-pink-700 flex items-center gap-1 cursor-pointer"
          >
            <Plus size={14} />
            <span>Add Report</span>
          </button>
        </div>

        {reports.length === 0 ? (
          <p className="text-xs text-gray-400 italic">
            No lessons logged yet for this student.
          </p>
        ) : (
          <div className="space-y-3">
            {reports.map((rep) => (
              <div
                key={rep.id}
                className="p-4 bg-pink-50/30 rounded-2xl border border-pink-100 space-y-2.5 text-xs"
              >
                {/* Header Row with Date & Delete */}
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-900 text-sm">
                    {rep.lesson_title}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 text-[11px]">
                      {rep.report_date}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        handleDeleteReport(rep.id, rep.homework_file_url)
                      }
                      className="text-gray-400 hover:text-red-600 transition p-1 cursor-pointer"
                      title="Delete Lesson Report"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Vocabulary */}
                {rep.vocabulary && (
                  <p className="text-gray-600 font-mono text-[11px] bg-white/70 p-2 rounded-lg border border-pink-50">
                    <strong>Vocab/Structures:</strong> {rep.vocabulary}
                  </p>
                )}

                {/* Homework Instructions */}
                {rep.homework && (
                  <div className="p-2.5 bg-pink-100/50 rounded-xl border border-pink-200 text-pink-950 flex items-start gap-1.5">
                    <FileCheck
                      size={14}
                      className="text-pink-600 mt-0.5 shrink-0"
                    />
                    <div>
                      <strong className="text-pink-900 text-[11px]">
                        Homework:
                      </strong>
                      <p className="text-[11px] text-gray-800">{rep.homework}</p>
                    </div>
                  </div>
                )}

                {/* 1. Teacher Uploaded Worksheet / Page */}
                {rep.homework_file_url && (
                  <div className="p-2 bg-white rounded-xl border border-pink-200 flex items-center justify-between text-xs">
                    <span className="text-pink-950 font-bold flex items-center gap-1.5">
                      📄 <span>Attached Worksheet:</span>
                    </span>
                    <a
                      href={rep.homework_file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-pink-600 font-bold hover:underline"
                    >
                      View / Open Worksheet ↗
                    </a>
                  </div>
                )}

                {/* 2. Student Submitted Homework File */}
                {rep.homework_submission_url && (
                  <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between text-xs">
                    <span className="text-emerald-800 font-bold flex items-center gap-1.5">
                      ✓ <span>Student Homework Submission:</span>
                    </span>
                    <a
                      href={rep.homework_submission_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-pink-600 font-bold hover:underline"
                    >
                      View Submission ↗
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL: RENEWAL NOTICE PDF & PREVIEW */}
      {isRenewalModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setIsRenewalModalOpen(false)}
        >
          <div
            className="bg-white border border-pink-200 rounded-3xl p-6 w-full max-w-xl shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col relative z-60"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-pink-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-pink-50 text-pink-600 rounded-xl">
                  <Sparkles size={18} />
                </span>
                <div>
                  <h3 className="font-bold text-base text-pink-950">
                    Lesson Package Renewal Notice
                  </h3>
                  <p className="text-xs text-gray-500">
                    Download as a formatted A5 PDF or copy the text for messaging apps.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRenewalModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Printable Preview Sheet */}
            <div className="flex-1 overflow-y-auto border border-gray-200 rounded-2xl p-6 bg-white shadow-inner">
              <div
                ref={renewalPdfRef}
                style={{
                  backgroundColor: "#ffffff",
                  color: "#1f2937",
                  fontFamily: "sans-serif",
                }}
                className="space-y-4 text-xs p-4 bg-white"
              >
                {/* Header Graphic */}
                <div
                  style={{
                    borderBottom: "2px solid #db2777",
                    textAlign: "center",
                    paddingBottom: "12px",
                  }}
                >
                  <div style={{ fontSize: "24px" }}>🌸</div>
                  <h2
                    style={{
                      fontSize: "18px",
                      fontWeight: "900",
                      color: "#db2777",
                      textTransform: "uppercase",
                      margin: "4px 0",
                    }}
                  >
                    Package Renewal Notice
                  </h2>
                  <p style={{ fontSize: "11px", color: "#6b7280", margin: 0 }}>
                    {student?.teacher_alias || teacherAlias || "Teacher"} • Private English Learning Program
                  </p>
                </div>

                {/* Friendly Greeting & Alert */}
                <div
                  style={{
                    backgroundColor: "#fdf2f8",
                    border: "1px solid #fce7f3",
                    padding: "14px",
                    borderRadius: "16px",
                  }}
                >
                  <p style={{ color: "#374151", margin: 0, lineHeight: "1.5" }}>
                    Dear <strong>{student?.name || "Parent"}</strong>,<br />
                    This is a gentle update regarding your English learning cycle. We have completed{" "}
                    <strong>{student?.classes_completed || 0}</strong> out of{" "}
                    <strong>{combinedTotalClasses}</strong> scheduled sessions, with only{" "}
                    <strong style={{ color: "#db2777" }}>{remainingCount} class{remainingCount === 1 ? "" : "es"} remaining</strong>.
                  </p>
                </div>

                {/* Package Breakdown Grid */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "10px",
                  }}
                >
                  <div
                    style={{
                      backgroundColor: "#f9fafb",
                      border: "1px solid #f3f4f6",
                      padding: "12px",
                      borderRadius: "12px",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "10px",
                        textTransform: "uppercase",
                        fontWeight: "bold",
                        color: "#9ca3af",
                        margin: "0 0 4px 0",
                      }}
                    >
                      Upcoming Package
                    </p>
                    <p style={{ fontWeight: "bold", color: "#1f2937", fontSize: "14px", margin: "0 0 2px 0" }}>
                      {combinedTotalClasses} Sessions
                    </p>
                    <p
                      style={{
                        fontSize: "10px",
                        color: "#db2777",
                        fontWeight: "600",
                        margin: 0,
                      }}
                    >
                      {student?.class_duration || 40} minutes / class
                    </p>
                  </div>

                  <div
                    style={{
                      backgroundColor: "#f9fafb",
                      border: "1px solid #f3f4f6",
                      padding: "12px",
                      borderRadius: "12px",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "10px",
                        textTransform: "uppercase",
                        fontWeight: "bold",
                        color: "#9ca3af",
                        margin: "0 0 4px 0",
                      }}
                    >
                      Renewal Fee
                    </p>
                    <p
                      style={{
                        fontWeight: "bold",
                        color: "#1f2937",
                        fontSize: "14px",
                        margin: "0 0 2px 0",
                      }}
                    >
                      {currencyObj?.symbol || ""}
                      {Number(student?.payment_amount || 0).toLocaleString()}{" "}
                      {student?.payment_currency}
                    </p>
                    {student?.php_equivalent && (
                      <p style={{ fontSize: "10px", color: "#6b7280", margin: 0 }}>
                        ≈ ₱{Number(student.php_equivalent).toLocaleString()} PHP
                      </p>
                    )}
                  </div>
                </div>

                {/* Details & Portal Access */}
                <div
                  style={{
                    backgroundColor: "#f9fafb",
                    border: "1px solid #f3f4f6",
                    padding: "14px",
                    borderRadius: "14px",
                  }}
                  className="space-y-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5 text-[11px] flex-1">
                      <div>
                        <span style={{ color: "#6b7280", fontWeight: "500", display: "block" }}>
                          📚 Course Material:
                        </span>
                        <span style={{ fontWeight: "bold", color: "#1f2937" }}>
                          {assignedBook?.title || "Custom Curriculum"}
                        </span>
                      </div>
                      <div>
                        <span style={{ color: "#6b7280", fontWeight: "500", display: "block" }}>
                          🗓 Reserved Schedule:
                        </span>
                        <span style={{ fontWeight: "bold", color: "#db2777" }}>
                          {schedules.length > 0
                            ? schedules
                                .map(
                                  (s) =>
                                    `${s.day_of_week} at ${s.schedule_time || s.start_time || s.time}`
                                )
                                .join(", ")
                            : "Flexible Schedule"}
                        </span>
                      </div>
                      <div>
                        <span style={{ color: "#6b7280", fontWeight: "500", display: "block" }}>
                          📱 Student Learning Portal:
                        </span>
                        <span
                          style={{
                            fontFamily: "monospace",
                            color: "#db2777",
                            fontWeight: "600",
                            wordBreak: "break-all",
                            fontSize: "10px",
                          }}
                        >
                          {student?.access_token
                            ? `${typeof window !== "undefined" ? window.location.origin : ""}/portal/${student.access_token}`
                            : "Scan QR Code"}
                        </span>
                      </div>
                    </div>

                    {qrCodeDataUrl && (
                      <div
                        style={{
                          textAlign: "center",
                          backgroundColor: "#ffffff",
                          padding: "8px",
                          borderRadius: "12px",
                          border: "1px solid #e5e7eb",
                          minWidth: "90px",
                        }}
                      >
                        <img
                          src={qrCodeDataUrl}
                          alt="Student Portal QR Code"
                          style={{
                            width: "75px",
                            height: "75px",
                            display: "block",
                            margin: "0 auto",
                          }}
                        />
                        <span
                          style={{
                            fontSize: "8px",
                            fontWeight: "bold",
                            color: "#db2777",
                            marginTop: "4px",
                            display: "block",
                            textTransform: "uppercase",
                          }}
                        >
                          Scan Portal
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Commitment Note */}
                <div
                  style={{
                    backgroundColor: "#ecfdf5",
                    border: "1px solid #a7f3d0",
                    padding: "12px",
                    borderRadius: "12px",
                  }}
                >
                  <p
                    style={{
                      fontSize: "10.5px",
                      lineHeight: "1.5",
                      color: "#064e3b",
                      margin: 0,
                    }}
                  >
                    To ensure your preferred weekly class schedule remains reserved without interruption, please confirm when you would like to renew. Thank you for your continued dedication! ✨
                  </p>
                </div>

                <div
                  style={{
                    paddingTop: "8px",
                    textAlign: "center",
                    fontSize: "10px",
                    color: "#9ca3af",
                  }}
                >
                  Warm regards, {student?.teacher_alias || teacherAlias || "Your Teacher"}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={downloadRenewalPdf}
                  disabled={isGeneratingPdf}
                  className="px-4 py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Download size={14} />
                  <span>{isGeneratingPdf ? "Generating..." : "Download PDF Notice"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyRenewalNoticeText}
                  className="px-4 py-2.5 bg-white border border-pink-200 hover:bg-pink-50 text-pink-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedNotice ? (
                    <Check size={14} className="text-emerald-600" />
                  ) : (
                    <Copy size={14} />
                  )}
                  <span>{copiedNotice ? "Copied to Clipboard!" : "Copy for Chat"}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsRenewalModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD SCHEDULE */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-md p-6 rounded-3xl shadow-xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-pink-100 pb-3">
              <div>
                <h2 className="text-lg font-bold text-pink-950">
                  Add Weekly Schedule
                </h2>
                <p className="text-[11px] text-gray-500">
                  Select recurring class days and time for {student.name}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSchedule} className="space-y-3.5">
              <div>
                <label className="block mb-1.5 font-semibold text-gray-700">
                  Days of Week *
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {DAYS_OF_WEEK.map((day) => (
                    <label
                      key={day}
                      className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition text-xs ${
                        scheduleDays.includes(day)
                          ? "bg-pink-100/70 border-pink-300 font-bold text-pink-900"
                          : "bg-pink-50/30 border-pink-100 text-gray-700 hover:bg-pink-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={scheduleDays.includes(day)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setScheduleDays([...scheduleDays, day]);
                          } else {
                            setScheduleDays(
                              scheduleDays.filter((d) => d !== day)
                            );
                          }
                        }}
                        className="rounded text-pink-600 focus:ring-pink-500"
                      />
                      <span>{day}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-semibold text-gray-700">
                    Class Time *
                  </label>
                  <input
                    type="time"
                    required
                    className="input w-full text-xs"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-gray-700">
                    Duration (mins)
                  </label>
                  <input
                    type="number"
                    className="input w-full text-xs"
                    value={scheduleDuration}
                    onChange={(e) => setScheduleDuration(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 font-semibold text-gray-700">
                  Topic / Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Conversation Practice"
                  className="input w-full text-xs"
                  value={scheduleTopic}
                  onChange={(e) => setScheduleTopic(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-pink-100">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 font-semibold text-gray-600 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingSchedule}
                  className="btn-primary text-xs px-5 py-2 cursor-pointer"
                >
                  {isSavingSchedule ? "Saving..." : "Save Schedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LOG LESSON & HOMEWORK */}
      {isReportModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="card bg-white w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 rounded-3xl shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-pink-100 pb-3">
              <div>
                <h2 className="text-xl font-bold text-pink-950">
                  Log Lesson & Homework
                </h2>
                <p className="text-xs text-gray-500">
                  Record daily lesson feedback and assign homework tasks.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsReportModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddReport} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-semibold text-gray-700">
                    Lesson Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Unit 3: Animals & Habitats"
                    className="input w-full text-xs"
                    value={lessonTitle}
                    onChange={(e) => setLessonTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-gray-700">
                    Date
                  </label>
                  <input
                    type="date"
                    className="input w-full text-xs"
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 font-semibold text-gray-700">
                  Vocabulary / Target Patterns
                </label>
                <input
                  type="text"
                  placeholder="e.g. cheetah, mammal, fast, faster than"
                  className="input w-full text-xs"
                  value={vocabulary}
                  onChange={(e) => setVocabulary(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-semibold text-gray-700">
                    Strengths & Highlights
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Great pronunciation and enthusiasm today!"
                    className="input w-full text-xs"
                    value={strengths}
                    onChange={(e) => setStrengths(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-gray-700">
                    Next Focus / Improvement
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Practice past tense verb endings."
                    className="input w-full text-xs"
                    value={improvements}
                    onChange={(e) => setImprovements(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 font-semibold text-pink-700">
                  Assigned Homework / Instructions (Optional) 📚
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Complete Student Book Page 24 exercises 1-4. (Leave empty if no homework)"
                  className="input w-full text-xs border-pink-200 bg-pink-50/20"
                  value={homework}
                  onChange={(e) => setHomework(e.target.value)}
                />
              </div>

              <div className="p-3 bg-pink-50/40 rounded-2xl border border-pink-100 space-y-1.5">
                <label className="block font-semibold text-pink-900 text-xs">
                  Attach Homework Page / Worksheet (Optional) 📄
                </label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) =>
                    setHomeworkFile(e.target.files?.[0] || null)
                  }
                  className="file:mr-3 file:py-1.5 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-pink-600 file:text-white hover:file:bg-pink-700 text-xs text-gray-500 w-full cursor-pointer"
                />
                {homeworkFile && (
                  <p className="text-[11px] text-emerald-700 font-medium">
                    ✓ Selected file: {homeworkFile.name}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-pink-100">
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-600 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReport}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  {isSubmittingReport
                    ? "Uploading & Saving..."
                    : "Save Lesson & Send to Portal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT STUDENT */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="card bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 rounded-3xl shadow-xl space-y-4">
            <h2 className="text-2xl font-bold text-pink-600">Edit Student</h2>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-xs font-semibold text-gray-700">
                    Student Name *
                  </label>
                  <input
                    className="input w-full text-xs"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block mb-1 text-xs font-semibold text-gray-700">
                    Assigned Teacher Persona *
                  </label>
                  <select
                    className="input w-full text-xs bg-white"
                    value={teacherAlias}
                    onChange={(e) => setTeacherAlias(e.target.value)}
                  >
                    {teacherAliases.map((alias) => (
                      <option key={alias} value={alias}>
                        {alias}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block mb-1 text-xs font-semibold text-gray-700">
                  Classroom Video Link (Zoom / Google Meet URL)
                </label>
                <input
                  placeholder="https://meet.google.com/... or Zoom link"
                  className="input w-full text-xs font-mono"
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-xs font-semibold text-gray-700">
                    Assigned Curriculum / Book
                  </label>
                  <select
                    className="input w-full text-xs bg-white"
                    value={assignedBookId}
                    onChange={(e) => setAssignedBookId(e.target.value)}
                  >
                    <option value="">No Book Assigned</option>
                    <option value="free_talk">
                      🗣️ Free Talk / Daily Conversation (No Book)
                    </option>
                    <option value="to_follow">
                      ⏳ To Follow / Level Assessment in Progress
                    </option>
                    {books.length > 0 && (
                      <optgroup label="Library Curriculum">
                        {books.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.title}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block mb-1 text-xs font-semibold text-gray-700">
                    Contract / Package Start Date
                  </label>
                  <input
                    type="date"
                    className="input w-full text-xs"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-xs font-semibold text-gray-700">
                    Email
                  </label>
                  <input
                    className="input w-full text-xs"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block mb-1 text-xs font-semibold text-gray-700">
                    Phone
                  </label>
                  <input
                    className="input w-full text-xs"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-xs font-semibold text-gray-700">
                    Country *
                  </label>
                  <select
                    className="input w-full text-xs bg-white"
                    value={country}
                    onChange={(e) => {
                      const selected = e.target.value;
                      const selectedCountry = countries.find(
                        (item) => item.name === selected
                      );
                      setCountry(selected);
                      if (selectedCountry) {
                        setPaymentCurrency(selectedCountry.currency);
                        calculatePHP(paymentAmount, selectedCountry.currency);
                      }
                    }}
                  >
                    <option value="">Select Country</option>
                    {countries.map((item) => (
                      <option key={item.name} value={item.name}>
                        {item.name} {item.flag}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-1 text-xs font-semibold text-gray-700">
                    Payment Amount *
                  </label>
                  <input
                    className="input w-full text-xs font-semibold"
                    placeholder="e.g. 2,700,000"
                    value={paymentAmount}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, "");
                      if (raw === "") {
                        setPaymentAmount("");
                        setPhpEquivalent("");
                      } else {
                        const formatted = Number(raw).toLocaleString();
                        setPaymentAmount(formatted);
                        calculatePHP(formatted, paymentCurrency);
                      }
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block mb-1 text-xs font-semibold text-gray-700">
                    Classes Included
                  </label>
                  <input
                    type="number"
                    className="input w-full text-xs"
                    value={classesIncluded}
                    onChange={(e) => setClassesIncluded(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block mb-1 text-xs font-semibold text-gray-700">
                    Classes Completed
                  </label>
                  <input
                    type="number"
                    className="input w-full text-xs"
                    value={classesCompleted}
                    onChange={(e) => setClassesCompleted(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block mb-1 text-xs font-semibold text-gray-700">
                    Duration (mins)
                  </label>
                  <input
                    type="number"
                    className="input w-full text-xs"
                    value={classDuration}
                    onChange={(e) => setClassDuration(e.target.value)}
                  />
                </div>
              </div>

              <textarea
                placeholder="Student notes..."
                rows={2}
                className="input w-full text-xs"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-pink-100">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-600 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateStudent}
                className="btn-primary cursor-pointer text-xs"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}