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
  const [studentBooks, setStudentBooks] = useState<any[]>([]);
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
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [savingBook, setSavingBook] = useState(false);
const [editingReportId, setEditingReportId] = useState<string | null>(null);

function handleOpenEditReport(rep: any) {
  setEditingReportId(rep.id);
  setLessonTitle(rep.lesson_title || "");
  setReportDate(rep.report_date || new Date().toISOString().split("T")[0]);
  setVocabulary(rep.vocabulary || "");
  setStrengths(rep.strengths || "");
  setImprovements(rep.improvements || "");
  setHomework(rep.homework || "");
  setHomeworkFile(null);
  setIsReportModalOpen(true);
}

  // Schedule Modal State
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleDays, setScheduleDays] = useState<string[]>([]);
  const [scheduleTime, setScheduleTime] = useState("18:00");
  const [scheduleDuration, setScheduleDuration] = useState("40");
  const [scheduleTopic, setScheduleTopic] = useState("Regular Class");
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);

// Report Modal State initialized instantly from window URL search params
  const [isReportModalOpen, setIsReportModalOpen] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("action") === "log_lesson";
    }
    return false;
  });

  const [reportDate, setReportDate] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("date") || new Date().toISOString().split("T")[0];
    }
    return new Date().toISOString().split("T")[0];
  });
  const [vocabulary, setVocabulary] = useState("");
  const [strengths, setStrengths] = useState("");
  const [improvements, setImprovements] = useState("");
  const [homework, setHomework] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [homeworkFile, setHomeworkFile] = useState<File | null>(null);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonDate, setLessonDate] = useState(new Date().toISOString().split("T")[0]);
  const [lessonDuration, setLessonDuration] = useState("40");
  const [lessonStatus, setLessonStatus] = useState("Completed");

useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const action = params.get("action");
    const dateParam = params.get("date");

    if (action === "log_lesson") {
      if (dateParam) {
        setReportDate(dateParam);
      }
      setIsReportModalOpen(true);
    }
  }, []);

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
        .select("*")
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
      setNotes(studentData.notes || "");

      const [{ data: scheds }, { data: bks }, { data: repList }, { data: studentBks }] =
        await Promise.all([
          supabase.from("schedules").select("*").eq("student_id", studentId),
          supabase.from("books").select("*").order("title", { ascending: true }), // Removed .eq("teacher_id", user?.id) if books are global or shared
          supabase
            .from("class_reports")
            .select("*")
            .eq("student_id", studentId)
            .order("report_date", { ascending: false }),
          supabase
            .from("student_books")
            .select("book_id, books(*)")
            .eq("student_id", studentId),
        ]);

      if (scheds) setSchedules(scheds);
      if (bks) setBooks(bks);
      if (repList) setReports(repList);
      if (studentBks) {
        setStudentBooks(studentBks);
        setSelectedBookIds(studentBks.map((item) => item.book_id));
      }
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
          notes: notes.trim() || null,
        })
        .eq("id", studentId);

      if (error) {
        alert(error.message);
        return;
      }

      // Update multiple books association in student_books table
      await supabase.from("student_books").delete().eq("student_id", studentId);
      if (selectedBookIds.length > 0) {
        const rows = selectedBookIds.map((bookId) => ({
          student_id: studentId,
          book_id: bookId,
        }));
        await supabase.from("student_books").insert(rows);
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
    const { data: { user } } = await supabase.auth.getUser();
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

    const payload: any = {
      lesson_title: lessonTitle.trim(),
      report_date: reportDate,
      vocabulary: vocabulary.trim() || null,
      strengths: strengths.trim() || null,
      improvements: improvements.trim() || null,
      homework: homework.trim() || null,
      teacher_alias: student?.teacher_alias || teacherAlias || "Teacher Gabi",
    };

    if (uploadedFileUrl) {
      payload.homework_file_url = uploadedFileUrl;
    }

    if (editingReportId) {
      // Update existing report
      const { error: updateError } = await supabase
        .from("class_reports")
        .update(payload)
        .eq("id", editingReportId);

      if (updateError) throw updateError;
    } else {
      // Insert new report & increment completed classes
      payload.student_id = studentId;
      payload.teacher_id = user?.id;

      const { error: reportError } = await supabase
        .from("class_reports")
        .insert(payload);

      if (reportError) throw reportError;

      const currentCompleted = student.classes_completed || 0;
      await supabase
        .from("students")
        .update({ classes_completed: currentCompleted + 1 })
        .eq("id", studentId);
    }

    // Reset form states
    setEditingReportId(null);
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

  if (loading) {
    return (
      <div className="p-12 text-center text-pink-600 font-medium">
        Loading student profile...
      </div>
    );
  }

  const countryObj = countries.find((c) => c.name === student.country);
  const currencyObj = currencies[student.payment_currency];
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

        {/* Assigned Curriculum / Books Progress Cards */}
        <div className="bg-white border border-pink-100 rounded-3xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-pink-600 font-bold text-sm">
              <BookOpen size={16} />
              <span>Assigned Books & Progress</span>
            </div>
          </div>
          <div className="space-y-2 max-h-[160px] overflow-y-auto">
            {studentBooks.length > 0 ? (
              studentBooks.map((item, index) => {
                const book = item.books;
                const totalBookLessons = book?.total_lessons || 20;
                const completedForBook = student.classes_completed || 0;
                const bookProgress = Math.min(100, Math.round((completedForBook / totalBookLessons) * 100));

                return (
                  <div key={book?.id || index} className="p-2.5 bg-pink-50/50 rounded-xl border border-pink-100 space-y-1">
                    <div className="flex justify-between items-center text-xs font-bold text-pink-950">
                      <span>📖 {book?.title || "Book"}</span>
                      <span className="text-pink-600 text-[10px]">{bookProgress}%</span>
                    </div>
                    <div className="w-full bg-pink-100 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-pink-600 h-1.5 rounded-full" style={{ width: `${bookProgress}%` }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-gray-400 italic">No books assigned yet.</p>
            )}
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
    onClick={() => handleOpenEditReport(rep)}
    className="text-gray-400 hover:text-pink-600 transition p-1 cursor-pointer"
    title="Edit Lesson Report"
  >
    <Edit size={14} />
  </button>
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

                {rep.vocabulary && (
                  <p className="text-gray-600 font-mono text-[11px] bg-white/70 p-2 rounded-lg border border-pink-50">
                    <strong>Vocab/Structures:</strong> {rep.vocabulary}
                  </p>
                )}

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
                  placeholder="e.g. Complete Student Book Page 24 exercises 1-4."
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

              {/* Multiple Books Selection Checkboxes */}
              <div>
               <label className="block mb-1 text-xs font-semibold text-gray-700">
                  Assigned Curriculum / Books (Select up to 2)
                </label>
                <div className="space-y-2">
                  <select
                    className="input w-full text-xs bg-white cursor-pointer"
                    value=""
                    onChange={(e) => {
                      const bookId = e.target.value;
                      if (!bookId) return;
                      if (selectedBookIds.includes(bookId)) return;
                      if (selectedBookIds.length >= 2) {
                        alert("You can select a maximum of 2 books.");
                        return;
                      }
                      setSelectedBookIds([...selectedBookIds, bookId]);
                    }}
                  >
                    <option value="">+ Add a book...</option>
                    {books
                      .filter((b) => !selectedBookIds.includes(b.id))
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.title} {b.level ? `(${b.level})` : ""}
                        </option>
                      ))}
                  </select>

                  {/* Selected Books Tags */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {selectedBookIds.length === 0 ? (
                      <span className="text-[11px] text-gray-400 italic">No books selected yet.</span>
                    ) : (
                      selectedBookIds.map((id) => {
                        const book = books.find((b) => b.id === id);
                        return (
                          <span
                            key={id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-pink-50 text-pink-700 border border-pink-200 rounded-xl text-xs font-semibold"
                          >
                            <span>📖 {book?.title || "Book"}</span>
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedBookIds(selectedBookIds.filter((bId) => bId !== id))
                              }
                              className="text-pink-400 hover:text-red-600 transition cursor-pointer"
                            >
                              ✕
                            </button>
                          </span>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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