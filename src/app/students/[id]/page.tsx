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
  Video,
  ChevronDown,
  ChevronUp,
  Receipt,
  X,
  Download,
  Calendar,
} from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

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
const DAY_ORDER = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

function groupSchedules(schedList: any[]) {
  if (!schedList || schedList.length === 0) return [];

  const groups: Record<string, { days: string[]; time: string; duration: number; ids: string[] }> = {};

  schedList.forEach((s) => {
    const time = s.start_time || s.schedule_time || s.time || "TBA";
    const duration = s.duration || 25;
    const key = `${time}-${duration}`;

    if (!groups[key]) {
      groups[key] = { days: [], time, duration, ids: [] };
    }
    if (s.day_of_week && !groups[key].days.includes(s.day_of_week)) {
      groups[key].days.push(s.day_of_week);
    }
    groups[key].ids.push(s.id);
  });

  return Object.values(groups).map((group) => {
    group.days.sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
    return group;
  });
}

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
  const [latestPayment, setLatestPayment] = useState<any>(null);
  const [teacherAliases, setTeacherAliases] = useState<string[]>(DEFAULT_ALIASES);
  const [loading, setLoading] = useState(true);
  const [copiedPortal, setCopiedPortal] = useState(false);
  const [copiedRenewalNotice, setCopiedRenewalNotice] = useState(false);
  const [expandedReportIds, setExpandedReportIds] = useState<string[]>([]);
  const [isParentRequestsOpen, setIsParentRequestsOpen] = useState(true);

  // Payment Instructions & QR Upload State
  const [paymentQrFile, setPaymentQrFile] = useState<File | null>(null);
  const [paymentQrPreviewUrl, setPaymentQrPreviewUrl] = useState<string>("");

  // Renewal Modal & PDF State
  const [isRenewalModalOpen, setIsRenewalModalOpen] = useState(false);
  const [renewalClassesCount, setRenewalClassesCount] = useState("20");
  const [renewalFreeCount, setRenewalFreeCount] = useState("0");
  const [renewalRate, setRenewalRate] = useState("");
  const [renewalDuration, setRenewalDuration] = useState("40");
  const [renewalStartDate, setRenewalStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [renewalCustomNotes, setRenewalCustomNotes] = useState("");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [invoiceQrDataUrl, setInvoiceQrDataUrl] = useState<string>("");
  const invoicePdfRef = useRef<HTMLDivElement>(null);

  function toggleExpandReport(id: string) {
    setExpandedReportIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

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
  const [classesIncluded, setClassesIncluded] = useState("0");
  const [freeClasses, setFreeClasses] = useState("0");
  const [classesCompleted, setClassesCompleted] = useState("0");
  const [classDuration, setClassDuration] = useState("40");
  const [paymentStatus, setPaymentStatus] = useState("Active");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [reportBookId, setReportBookId] = useState("");
  const [selectedChapterIndex, setSelectedChapterIndex] = useState<string>("");
  const [isChapterComplete, setIsChapterComplete] = useState(false);

  function handleOpenEditReport(rep: any) {
    setEditingReportId(rep.id);
    setLessonTitle(rep.lesson_title || rep.title || "");
    setReportDate(rep.report_date || rep.lesson_date || new Date().toISOString().split("T")[0]);
    setReportBookId(rep.book_id || "");
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

  // Report Modal State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportDate, setReportDate] = useState(new Date().toISOString().split("T")[0]);
  const [vocabulary, setVocabulary] = useState("");
  const [strengths, setStrengths] = useState("");
  const [improvements, setImprovements] = useState("");
  const [homework, setHomework] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [homeworkFile, setHomeworkFile] = useState<File | null>(null);
  const [lessonTitle, setLessonTitle] = useState("");
  const [startPageInput, setStartPageInput] = useState("");
  const [endPageInput, setEndPageInput] = useState("");

  // Handle URL Query Params
  useEffect(() => {
    const action = searchParams?.get("action");
    const renew = searchParams?.get("renew");
    const dateParam = searchParams?.get("date");

    if (action === "renew" || renew === "true") {
      setIsRenewalModalOpen(true);
    }

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

      const rawAmount = studentData.payment_amount ? String(studentData.payment_amount) : "";
      setPaymentAmount(
        rawAmount ? Number(rawAmount.replace(/[^0-9.]/g, "")).toLocaleString() : ""
      );
      setRenewalRate(rawAmount);

      if (studentData.access_token) {
        const portalLink = `${window.location.origin}/portal/${studentData.access_token}`;
        QRCode.toDataURL(portalLink, { width: 120, margin: 1 })
          .then((url) => setInvoiceQrDataUrl(url))
          .catch(() => {});
      }

      setPhpEquivalent(
        studentData.php_equivalent
          ? Number(studentData.php_equivalent).toLocaleString()
          : ""
      );

      const incClasses =
        studentData.classes_included !== undefined && studentData.classes_included !== null
          ? String(studentData.classes_included)
          : "0";
      setClassesIncluded(incClasses);
      setRenewalClassesCount(incClasses !== "0" ? incClasses : "20");

      const freeCls =
        studentData.free_classes !== undefined && studentData.free_classes !== null
          ? String(studentData.free_classes)
          : "0";
      setFreeClasses(freeCls);
      setRenewalFreeCount(freeCls);

      setClassesCompleted(
        studentData.classes_completed ? String(studentData.classes_completed) : "0"
      );

      const durationVal = studentData.class_duration ? String(studentData.class_duration) : "40";
      setClassDuration(durationVal);
      setRenewalDuration(durationVal);

      setPaymentStatus(studentData.payment_status || "Active");
      setStartDate(studentData.start_date || studentData.contract_start_date || "");
      setEndDate(studentData.end_date || studentData.contract_end_date || "");
      setNotes(studentData.notes || "");

      const [
        { data: scheds },
        { data: bks },
        { data: repList },
        { data: studentBks },
        { data: paymentList },
      ] = await Promise.all([
        supabase.from("schedules").select("*").eq("student_id", studentId),
        supabase.from("books").select("*").order("title", { ascending: true }),
        supabase
          .from("class_reports")
          .select("*")
          .eq("student_id", studentId)
          .order("report_date", { ascending: false }),
        supabase.from("student_books").select("*").eq("student_id", studentId),
        supabase
          .from("payments")
          .select("*")
          .or(`student_id.eq.${studentId},student_name.ilike.%${studentData.name.trim()}%`)
          .order("created_at", { ascending: false })
          .limit(1),
      ]);

      if (scheds) setSchedules(scheds);
      if (bks) setBooks(bks);
      if (repList) setReports(repList);
      if (paymentList && paymentList.length > 0) {
        setLatestPayment(paymentList[0]);
      } else {
        setLatestPayment(null);
      }

      if (studentBks && studentBks.length > 0 && bks) {
        setSelectedBookIds(studentBks.map((item) => item.book_id));
        const matchedBooks = studentBks.map((item) => ({
          book_id: item.book_id,
          completed_chapters: item.completed_chapters || [],
          books: bks.find((b: any) => b.id === item.book_id),
        }));
        setStudentBooks(matchedBooks);
      } else {
        setSelectedBookIds([]);
        setStudentBooks([]);
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
          free_classes: Number(freeClasses) || 0,
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
      const { error } = await supabase.from("schedules").delete().eq("id", scheduleId);
      if (error) throw error;
      fetchStudentData();
    } catch (err: any) {
      alert("Failed to delete schedule: " + err.message);
    }
  }

  async function handleDeleteReport(reportId: string, homeworkFileUrl?: string | null) {
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

      const { error } = await supabase.from("class_reports").delete().eq("id", reportId);
      if (error) throw error;

      const newCompletedCount = Math.max((student?.classes_completed || 1) - 1, 0);
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

      const validBookId = reportBookId && reportBookId.trim() !== "" ? reportBookId : null;

      const payload: any = {
        lesson_title: lessonTitle.trim(),
        title: lessonTitle.trim(),
        report_date: reportDate,
        lesson_date: reportDate,
        book_id: validBookId,
        vocabulary: vocabulary.trim() || null,
        strengths: strengths.trim() || null,
        improvements: improvements.trim() || null,
        homework: homework.trim() || null,
        teacher_alias: student?.teacher_alias || teacherAlias || "Teacher Gabi",
        status: "Completed",
      };

      const selectedBookItem = studentBooks.find((item: any) => item.books?.id === reportBookId);
      if (selectedBookItem?.books?.book_type === "pages") {
        payload.start_page = startPageInput ? Number(startPageInput) : null;
        payload.end_page = endPageInput ? Number(endPageInput) : null;
      }

      if (uploadedFileUrl) {
        payload.homework_file_url = uploadedFileUrl;
      }

      if (editingReportId) {
        const { error: updateError } = await supabase
          .from("class_reports")
          .update(payload)
          .eq("id", editingReportId);

        if (updateError) throw updateError;
      } else {
        payload.student_id = studentId;
        payload.teacher_id = user?.id;

        const { error: reportError } = await supabase
          .from("class_reports")
          .insert(payload);

        if (reportError) throw reportError;

        await supabase.from("lessons").insert({
          student_id: studentId,
          teacher_id: user?.id,
          title: lessonTitle.trim(),
          lesson_date: reportDate,
          status: "Completed",
          description: `Vocab: ${vocabulary}\nStrengths: ${strengths}\nHomework: ${homework}`,
          homework_file_url: uploadedFileUrl || null,
          book_id: validBookId,
        });

        if (validBookId && selectedChapterIndex !== "" && isChapterComplete) {
          const currentCompletedChapters = selectedBookItem?.completed_chapters || [];
          const chapterIdxNum = Number(selectedChapterIndex);

          if (!currentCompletedChapters.includes(chapterIdxNum)) {
            const updatedChapters = [...currentCompletedChapters, chapterIdxNum];

            await supabase
              .from("student_books")
              .update({ completed_chapters: updatedChapters })
              .eq("student_id", studentId)
              .eq("book_id", validBookId);
          }
        }

        const currentCompleted = student?.classes_completed || 0;
        await supabase
          .from("students")
          .update({ classes_completed: currentCompleted + 1 })
          .eq("id", studentId);
      }

      setEditingReportId(null);
      setLessonTitle("");
      setVocabulary("");
      setStrengths("");
      setImprovements("");
      setHomework("");
      setHomeworkFile(null);
      setSelectedChapterIndex("");
      setIsChapterComplete(false);
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
    const { error } = await supabase.from("students").delete().eq("id", studentId);
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

  function handleCopyRenewalMessage() {
    const portalUrl = student?.access_token
      ? `${window.location.origin}/portal/${student.access_token}`
      : "";

    const freeText = Number(renewalFreeCount) > 0 ? ` (+${renewalFreeCount} Free Bonus Classes)` : "";
    const currency = student?.payment_currency || "VND";
    const cleanNum = Number(String(renewalRate).replace(/[^0-9.]/g, "")) || 0;
    const formattedAmount = cleanNum.toLocaleString("en-US");
    const teacherName = student?.teacher_alias || teacherAlias || "Teacher Gabi";

    const renewalText = `🌟 CLASS PACKAGE RENEWAL NOTICE 🌟

Dear Parent,

Thank you for continuing with ${teacherName}'s private English classes! Here are the details for ${student?.name}'s upcoming lesson package:

📚 Package Details:
• Total Classes: ${renewalClassesCount} Classes${freeText}
• Class Duration: ${renewalDuration} minutes per session
• Tuition Fee: ${formattedAmount} ${currency}
• Target Start Date: ${renewalStartDate}

${portalUrl ? `🔗 Student Learning Portal:\n${portalUrl}\n` : ""}${renewalCustomNotes ? `📝 Note:\n${renewalCustomNotes}\n\n` : ""}Please let me know once payment has been sent so we can secure the weekly schedule slots. Thank you very much! 😊`;

    navigator.clipboard.writeText(renewalText);
    setCopiedRenewalNotice(true);
    setTimeout(() => setCopiedRenewalNotice(false), 2000);
  }

  async function handleDownloadInvoicePdf() {
    if (!invoicePdfRef.current) return;
    setIsGeneratingPdf(true);

    try {
      // @ts-ignore
      const html2pdf = (await import("html2pdf.js")).default;
      const element = invoicePdfRef.current;
      const opt = {
        margin: 10,
        filename: `Renewal_Invoice_${student?.name?.replace(/\s+/g, "_") || "Student"}_${renewalStartDate}.pdf`,
        image: { type: "png" as const, quality: 1.0 },
        html2canvas: {
          scale: 3,
          useCORS: true,
          backgroundColor: "#ffffff",
          letterRendering: true,
        },
        jsPDF: {
          unit: "mm" as const,
          format: "a4" as const,
          orientation: "portrait" as const,
        },
      };

      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error("Invoice PDF export error:", err);
      alert("Failed to export Invoice PDF.");
    } finally {
      setIsGeneratingPdf(false);
    }
  }

  const combinedTotalClasses =
    Number(student?.classes_included || 0) + Number(student?.free_classes || 0);

  const dynamicCompletedCount = reports ? reports.length : 0;
  const dynamicRemainingCount = Math.max(combinedTotalClasses - dynamicCompletedCount, 0);
  const dynamicProgressPercent = Math.min(
    Math.round((dynamicCompletedCount / (combinedTotalClasses || 1)) * 100),
    100
  );

  const totalRegularClasses = Number(student?.classes_included || 0);
  const totalFreeClasses = Number(student?.free_classes || 0);
  const isFreePackage = totalRegularClasses === 0 && totalFreeClasses > 0;

  const rawStudentStatus = (student?.payment_status || "Pending").trim().toLowerCase();
  const rawPaymentStatus = (latestPayment?.status || "").trim().toLowerCase();

  const isPaid =
    isFreePackage ||
    Boolean(latestPayment) ||
    rawStudentStatus === "paid" ||
    rawStudentStatus === "completed" ||
    rawStudentStatus === "active" ||
    rawPaymentStatus === "paid" ||
    rawPaymentStatus === "completed";

  const displayStatus = isPaid ? "PAID" : "PENDING";

  if (loading) {
    return (
      <div className="p-12 text-center text-pink-600 font-medium">
        Loading student profile...
      </div>
    );
  }

  const countryObj = countries.find((c) => c.name === student?.country);
  const currencyObj = currencies[student?.payment_currency];
  const teacherBrandName = student?.teacher_alias || teacherAlias || "Teacher Gabi";
  const cleanRenewAmount = Number(String(renewalRate).replace(/[^0-9.]/g, "")) || 0;
  const formattedRenewRate = cleanRenewAmount.toLocaleString("en-US");

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/students"
          className="text-xs font-semibold text-pink-600 hover:text-pink-700 flex items-center gap-1.5 transition"
        >
          <ArrowLeft size={16} />
          <span>Back to Students</span>
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {student?.access_token && (
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

          {/* Renewal Invoice / Notice Trigger Button */}
          <button
            type="button"
            onClick={() => setIsRenewalModalOpen(true)}
            className="px-3.5 py-2 bg-pink-100/70 hover:bg-pink-200/80 text-pink-900 border border-pink-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Receipt size={14} className="text-pink-600" />
            <span>Renewal Notice & Invoice</span>
          </button>

          <button
            onClick={() => {
              const today = new Date().toISOString().split("T")[0];
              setReportDate(today);
              setEditingReportId(null);
              setLessonTitle("");
              setVocabulary("");
              setStrengths("");
              setImprovements("");
              setHomework("");
              setHomeworkFile(null);
              setSelectedChapterIndex("");
              setIsChapterComplete(false);
              setIsReportModalOpen(true);
            }}
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

      <div className="bg-white border border-pink-100 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-pink-950">
              {student?.name}
            </h1>
            <span className="px-3 py-1 bg-pink-50 text-pink-700 border border-pink-200 text-xs font-bold rounded-xl uppercase">
              {student?.teacher_alias || "Teacher Gabi"}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
            <span>
              {countryObj?.flag} {student?.country || "International"}
            </span>
            <span>•</span>
            <span>Age: {student?.age ? `${student.age} yrs` : "N/A"}</span>
            <span>•</span>
            <span>Email: {student?.email || "N/A"}</span>
            <span>•</span>
            <span>Phone: {student?.phone || "N/A"}</span>
          </div>
        </div>

        <div className="bg-pink-50/50 border border-pink-100 p-4 rounded-2xl flex items-center gap-3 min-w-[280px]">
          <div className="p-3 bg-pink-600 text-white rounded-xl shadow-xs">
            <Video size={20} />
          </div>
          <div className="text-xs space-y-0.5 overflow-hidden">
            <p className="font-bold text-gray-900">Classroom Meeting Link</p>
            {student?.meeting_link ? (
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white border border-pink-100 rounded-3xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">Class Package</h3>
            <span className="text-xs font-bold text-pink-600">
              {dynamicProgressPercent}% Done
            </span>
          </div>
          <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-pink-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${dynamicProgressPercent}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2.5 bg-pink-50/50 rounded-xl">
              <p className="text-gray-400 font-medium text-[10px] uppercase">
                Completed
              </p>
              <p className="font-bold text-gray-800 text-base mt-0.5">
                {dynamicCompletedCount}
              </p>
            </div>
            <div className="p-2.5 bg-pink-50/50 rounded-xl">
              <p className="text-gray-400 font-medium text-[10px] uppercase">
                Remaining
              </p>
              <p className="font-bold text-pink-600 text-base mt-0.5">
                {dynamicRemainingCount}
              </p>
            </div>
            <div className="p-2.5 bg-pink-50/50 rounded-xl">
              <p className="text-gray-400 font-medium text-[10px] uppercase">
                Duration
              </p>
              <p className="font-bold text-gray-800 text-base mt-0.5">
                {student?.class_duration || 40}m
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-pink-100 rounded-3xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-pink-600 font-bold text-sm">
              <BookOpen size={16} />
              <span>Assigned Books & Progress</span>
            </div>
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="text-xs font-medium text-pink-600 hover:text-pink-700 bg-pink-50 hover:bg-pink-100 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
            >
              Edit Books
            </button>
          </div>
          <div className="space-y-2 max-h-[160px] overflow-y-auto">
            {studentBooks.length > 0 ? (
              studentBooks.map((item, index) => {
                const book = item.books;
                const isPageBased = book?.book_type === "pages";

                const bookReports = reports.filter((r) => r.book_id === book?.id);

                let bookProgress = 0;
                if (isPageBased) {
                  const maxPageReached = bookReports.reduce((max, r) => Math.max(max, r.end_page || 0), 0);
                  const totalPages = book?.total_pages || 1;
                  bookProgress = Math.min(100, Math.round((maxPageReached / totalPages) * 100));
                } else {
                  const totalChapters = book?.chapters?.length || 1;
                  const completedChapters = item?.completed_chapters || [];
                  bookProgress = Math.min(100, Math.round((completedChapters.length / totalChapters) * 100));
                }

                return (
                  <div key={book?.id || index} className="p-2.5 bg-pink-50/50 rounded-xl border border-pink-100 space-y-1">
                    <div className="flex justify-between items-center text-xs font-bold text-pink-950">
                      <span>📖 {book?.title || "Book"}</span>
                      <span className="text-pink-600 text-[10px]">{bookProgress}%</span>
                    </div>
                    <div className="w-full bg-pink-100 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-pink-600 h-1.5 rounded-full transition-all duration-300" style={{ width: `${bookProgress}%` }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-gray-400 italic">No books assigned yet.</p>
            )}
          </div>
        </div>

        <div className="bg-white border border-pink-100 rounded-3xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">Tuition & Billing</h3>
          </div>
          <div className="bg-pink-50/40 p-3.5 rounded-2xl space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Package Rate:</span>
              <span className="font-bold text-pink-600 text-sm">
                {currencyObj?.symbol || ""}
                {Number(student?.payment_amount || 0).toLocaleString()}{" "}
                {student?.payment_currency}
              </span>
            </div>
            {student?.php_equivalent && (
              <div className="flex justify-between items-center text-gray-600">
                <span>PHP Value:</span>
                <span className="font-semibold text-gray-900">
                  ₱{Number(student.php_equivalent || 0).toLocaleString()}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center pt-1 border-t border-pink-100">
              <span className="text-gray-500">Payment Status:</span>
              <span
                className={`font-bold uppercase text-[10px] px-2.5 py-0.5 rounded-lg border ${
                  isPaid
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}
              >
                {displayStatus}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2-Column Main Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (5/12): Weekly Schedule & Notes */}
        <div className="lg:col-span-5 space-y-5">
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
                {[...schedules]
                  .sort((a, b) => {
                    return DAY_ORDER.indexOf(a.day_of_week) - DAY_ORDER.indexOf(b.day_of_week);
                  })
                  .map((s) => (
                    <div
                      key={s.id}
                      className="grid grid-cols-[85px_65px_1fr_auto] items-center text-xs p-2.5 bg-pink-50/40 rounded-xl border border-pink-100/70 hover:bg-pink-50/80 transition"
                    >
                      <span className="font-bold text-gray-800">
                        {s.day_of_week}
                      </span>
                      <span className="text-pink-600 font-bold font-mono text-[12px]">
                        {s.start_time || s.schedule_time || s.time}
                      </span>
                      <div>
                        <span className="px-2 py-0.5 bg-white text-gray-600 text-[10px] font-semibold rounded-md border border-pink-100 shadow-2xs">
                          {s.duration || 25}m
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteSchedule(s.id)}
                        className="text-gray-400 hover:text-red-600 p-1 transition cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-pink-100 rounded-3xl p-5 shadow-xs space-y-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Teacher Notes & Objectives</h3>
              <p className="text-xs text-gray-600 leading-relaxed mt-1">
                {student?.notes || "No teacher notes recorded yet."}
              </p>
            </div>

            <div className="pt-2 border-t border-pink-100">
              <div
                onClick={() => setIsParentRequestsOpen(!isParentRequestsOpen)}
                className="flex items-center justify-between p-2 -mx-2 rounded-xl cursor-pointer hover:bg-pink-50/50 select-none transition"
              >
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="p-1 rounded-lg text-pink-600 bg-white border border-pink-200 shadow-2xs"
                  >
                    {isParentRequestsOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                  <span className="text-xs font-bold text-pink-900">
                    💬 Parent Notes & Requests
                  </span>
                </div>

                {student?.parent_requests && (
                  <span className="text-[10px] font-extrabold bg-pink-100 text-pink-700 px-2 py-0.5 rounded-md border border-pink-200">
                    New Message
                  </span>
                )}
              </div>

              {isParentRequestsOpen && (
                <div className="mt-2">
                  {student?.parent_requests ? (
                    <div className="p-3 bg-pink-50/50 border border-pink-200 rounded-2xl text-xs text-pink-950 font-medium whitespace-pre-wrap">
                      {student.parent_requests}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic px-1">
                      No notes received from parents yet.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (7/12): Logged Lessons & Reports */}
        <div className="lg:col-span-7">
          <div className="bg-white border border-pink-100 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-gray-900">
                  Logged Lessons & Reports
                </h3>
                <span className="text-[11px] font-bold text-pink-600 bg-pink-50 px-2 py-0.5 rounded-lg border border-pink-200">
                  {dynamicCompletedCount}
                </span>
              </div>
              <button
                onClick={() => {
                  const today = new Date().toISOString().split("T")[0];
                  setReportDate(today);
                  setEditingReportId(null);
                  setLessonTitle("");
                  setVocabulary("");
                  setStrengths("");
                  setImprovements("");
                  setHomework("");
                  setHomeworkFile(null);
                  setSelectedChapterIndex("");
                  setIsChapterComplete(false);
                  setIsReportModalOpen(true);
                }}
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
              <div className="space-y-2.5">
                {reports.map((rep) => {
                  const isExpanded = expandedReportIds.includes(rep.id);

                  return (
                    <div
                      key={rep.id}
                      className="bg-pink-50/30 rounded-2xl border border-pink-100 text-xs transition-all overflow-hidden"
                    >
                      <div
                        onClick={() => toggleExpandReport(rep.id)}
                        className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-pink-50/60 select-none"
                      >
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            className="p-1 rounded-lg text-pink-500 bg-white border border-pink-100 shadow-2xs cursor-pointer"
                          >
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                          <span className="font-bold text-gray-900 text-sm">
                            {rep.lesson_title || rep.title}
                          </span>
                        </div>

                        <div
                          className="flex items-center gap-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-gray-400 text-[11px] font-mono">
                            {rep.report_date || rep.lesson_date}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenEditReport(rep)}
                            className="text-gray-400 hover:text-pink-600 transition p-1 cursor-pointer"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteReport(rep.id, rep.homework_file_url)
                            }
                            className="text-gray-400 hover:text-red-600 transition p-1 cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="px-4 pb-4 pt-1 border-t border-pink-100/60 space-y-2.5 bg-white/40">
                          {rep.vocabulary && (
                            <div className="text-gray-600 font-mono text-[11px] bg-white/80 p-2.5 rounded-xl border border-pink-50 whitespace-pre-wrap">
                              <strong className="text-pink-900 font-sans">Vocab/Structures:</strong>
                              <p className="mt-1">{rep.vocabulary}</p>
                            </div>
                          )}

                          {(rep.strengths || rep.improvements) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                              {rep.strengths && (
                                <div className="p-2.5 bg-emerald-50/60 border border-emerald-100 rounded-xl text-emerald-950">
                                  <strong className="text-emerald-800">Strengths & Highlights:</strong>
                                  <p className="mt-0.5 whitespace-pre-wrap">{rep.strengths}</p>
                                </div>
                              )}
                              {rep.improvements && (
                                <div className="p-2.5 bg-amber-50/60 border border-amber-100 rounded-xl text-amber-950">
                                  <strong className="text-amber-800">Next Focus:</strong>
                                  <p className="mt-0.5 whitespace-pre-wrap">{rep.improvements}</p>
                                </div>
                              )}
                            </div>
                          )}

                          {rep.homework && (
                            <div className="p-2.5 bg-pink-100/50 rounded-xl border border-pink-200 text-pink-950 flex items-start gap-1.5">
                              <FileCheck size={14} className="text-pink-600 mt-0.5 shrink-0" />
                              <div>
                                <strong className="text-pink-900 text-[11px]">Homework:</strong>
                                <p className="text-[11px] text-gray-800 whitespace-pre-wrap">{rep.homework}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: RENEWAL INVOICE & PARENT NOTICE (WITH PDF GENERATION) */}
      {/* ========================================================================= */}
      {isRenewalModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="card bg-white w-full max-w-2xl max-h-[92vh] overflow-y-auto p-6 rounded-3xl shadow-2xl space-y-4 text-xs animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-pink-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-pink-50 text-pink-600 rounded-xl">
                  <Receipt size={18} />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-pink-950">
                    Package Renewal Notice & Invoice
                  </h2>
                  <p className="text-[11px] text-gray-500">
                    Generate, copy, or download a formal renewal invoice PDF for {student?.name}&apos;s parents.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRenewalModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-semibold text-gray-700">
                    Regular Classes Included *
                  </label>
                  <input
                    type="number"
                    className="input w-full text-xs font-semibold"
                    value={renewalClassesCount}
                    onChange={(e) => setRenewalClassesCount(e.target.value)}
                    placeholder="e.g. 20"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-gray-700">
                    Free / Bonus Classes
                  </label>
                  <input
                    type="number"
                    className="input w-full text-xs"
                    value={renewalFreeCount}
                    onChange={(e) => setRenewalFreeCount(e.target.value)}
                    placeholder="e.g. 0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-semibold text-gray-700">
                    Tuition Rate ({student?.payment_currency || "VND"}) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2,500,000"
                    className="input w-full text-xs font-bold text-pink-900"
                    value={
                      renewalRate
                        ? Number(String(renewalRate).replace(/[^0-9.]/g, "")).toLocaleString("en-US")
                        : ""
                    }
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, "");
                      setRenewalRate(raw);
                    }}
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-gray-700">
                    Class Duration (mins)
                  </label>
                  <select
                    className="input w-full text-xs bg-white cursor-pointer"
                    value={renewalDuration}
                    onChange={(e) => setRenewalDuration(e.target.value)}
                  >
                    <option value="25">25 minutes</option>
                    <option value="40">40 minutes</option>
                    <option value="50">50 minutes</option>
                    <option value="60">60 minutes</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block mb-1 font-semibold text-gray-700">
                  Target Renewal Start Date
                </label>
                <input
                  type="date"
                  className="input w-full text-xs"
                  value={renewalStartDate}
                  onChange={(e) => setRenewalStartDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block mb-1 font-semibold text-gray-700">
                  Custom Parent Note / Bank Instructions (Optional)
                </label>
                <textarea
                  rows={2}
                  className="input w-full text-xs"
                  value={renewalCustomNotes}
                  onChange={(e) => setRenewalCustomNotes(e.target.value)}
                  placeholder="e.g. Please send remittance via Wise / WeChat / Bank transfer and reply with receipt."
                />
              </div>

              {/* Upload Payment QR Image Box */}
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-gray-700">
                  Upload Payment QR Image (Optional)
                </label>
                <div className="p-2 bg-white rounded-xl border border-gray-200 flex items-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setPaymentQrFile(file);
                      if (file) {
                        setPaymentQrPreviewUrl(URL.createObjectURL(file));
                      }
                    }}
                    className="file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-pink-600 file:text-white hover:file:bg-pink-700 text-xs text-gray-500 w-full cursor-pointer"
                  />
                </div>
              </div>

              {/* PDF Document Render Container */}
              <div className="space-y-1.5 pt-1">
                <span className="block text-[11px] font-bold uppercase text-gray-400">
                  Document Preview & Printable Layout:
                </span>

                <div
                  ref={invoicePdfRef}
                  style={{
                    backgroundColor: "#ffffff",
                    color: "#1e293b",
                    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                    padding: "32px",
                    borderRadius: "16px",
                    border: "1px solid #f1f5f9",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                  }}
                  className="space-y-6 text-xs"
                >
                  {/* Clean Modern Header with Portal QR Code on Top */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1.5px solid #f472b6", paddingBottom: "16px" }}>
                    <div>
                      <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#831843", margin: 0, letterSpacing: "-0.5px" }}>
                        {teacherBrandName}
                      </h1>
                      <p style={{ fontSize: "11px", color: "#64748b", margin: "4px 0 0 0", fontWeight: "500" }}>
                        Private ESL & English Language Tutoring Services
                      </p>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{ textAlign: "right" }}>
                        <h2 style={{ fontSize: "16px", fontWeight: "800", color: "#db2777", margin: 0, letterSpacing: "0.5px" }}>
                          RENEWAL INVOICE
                        </h2>
                        <p style={{ fontSize: "10px", color: "#94a3b8", margin: "4px 0 0 0" }}>
                          Date: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                        </p>
                      </div>

                      {invoiceQrDataUrl && (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", backgroundColor: "#fdf2f8", padding: "6px", borderRadius: "8px", border: "1px solid #fce7f3", flexShrink: 0 }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={invoiceQrDataUrl}
                            alt="Portal QR"
                            style={{ width: "48px", height: "48px", borderRadius: "6px", backgroundColor: "#ffffff", display: "block", margin: "0 auto" }}
                          />
                          <span style={{ fontSize: "7px", color: "#db2777", display: "block", marginTop: "2px", fontWeight: "700", textTransform: "uppercase", textAlign: "center", width: "100%" }}>
                            Student Portal
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Metadata 2-Column Cards */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    <div style={{ backgroundColor: "#fdf2f8", padding: "14px 16px", borderRadius: "12px", border: "1px solid #fce7f3" }}>
                      <p style={{ fontSize: "10px", fontWeight: "700", color: "#be185d", textTransform: "uppercase", letterSpacing: "0.5px", margin: 0 }}>
                        STUDENT DETAILS
                      </p>
                      <p style={{ fontSize: "15px", fontWeight: "800", color: "#500724", margin: "4px 0 0 0" }}>
                        {student?.name}
                      </p>
                      <p style={{ fontSize: "11px", color: "#64748b", margin: "2px 0 0 0" }}>
                        Country: {student?.country || "International"}
                      </p>
                    </div>

                    <div style={{ backgroundColor: "#f8fafc", padding: "14px 16px", borderRadius: "12px", border: "1px solid #e2e8f0", textAlign: "right" }}>
                      <p style={{ fontSize: "10px", fontWeight: "700", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px", margin: 0 }}>
                        SCHEDULE INFORMATION
                      </p>
                      <p style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a", margin: "4px 0 0 0" }}>
                        Starts: {renewalStartDate}
                      </p>
                      <p style={{ fontSize: "11px", color: "#64748b", margin: "2px 0 0 0" }}>
                        Class Duration: {renewalDuration} mins / session
                      </p>
                    </div>
                  </div>

                  {/* Table */}
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#fdf2f8", borderBottom: "1.5px solid #fbcfe8", color: "#831843", textAlign: "left" }}>
                        <th style={{ padding: "10px 12px", fontWeight: "700" }}>Lesson Package Description</th>
                        <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: "700" }}>Classes</th>
                        <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: "700" }}>Tuition Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "14px 12px", verticalAlign: "top" }}>
                          <p style={{ fontWeight: "700", color: "#0f172a", margin: 0, fontSize: "12px" }}>
                            Private 1-on-1 English Course ({renewalDuration}m)
                          </p>
                          <p style={{ color: "#64748b", fontSize: "10.5px", margin: "4px 0 0 0", lineHeight: "1.4" }}>
                            Tailored curriculum, personalized homework review, and parent progress tracking.
                          </p>
                          {Number(renewalFreeCount) > 0 && (
                            <p style={{ color: "#059669", fontWeight: "700", fontSize: "10px", margin: "4px 0 0 0" }}>
                              🎁 Includes {renewalFreeCount} Complimentary Bonus Classes
                            </p>
                          )}
                        </td>
                        <td style={{ padding: "14px 12px", textAlign: "center", fontWeight: "700", color: "#334155", verticalAlign: "top" }}>
                          {renewalClassesCount} {Number(renewalFreeCount) > 0 ? `(+${renewalFreeCount})` : ""}
                        </td>
                        <td style={{ padding: "14px 12px", textAlign: "right", fontWeight: "800", color: "#be185d", fontSize: "12px", verticalAlign: "top" }}>
                          {formattedRenewRate} {student?.payment_currency || "VND"}
                        </td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={2} style={{ padding: "14px 12px 6px 12px", textAlign: "right", fontWeight: "700", color: "#64748b", fontSize: "11px" }}>
                          Total Package Amount:
                        </td>
                        <td style={{ padding: "14px 12px 6px 12px", textAlign: "right", fontWeight: "900", fontSize: "15px", color: "#db2777" }}>
                          {formattedRenewRate} {student?.payment_currency || "VND"}
                        </td>
                      </tr>
                    </tfoot>
                  </table>

                  {/* Footer Notes & Payment QR Code (Unified Box) */}
                  {(renewalCustomNotes || paymentQrPreviewUrl) ? (
                    <div style={{ backgroundColor: "#fdf2f8", border: "1px solid #fce7f3", padding: "12px 14px", borderRadius: "12px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px" }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: "10px", fontWeight: "700", color: "#831843", textTransform: "uppercase", margin: 0 }}>
                          Payment Instructions:
                        </p>
                        <p style={{ fontSize: "11px", color: "#334155", margin: "4px 0 0 0", whiteSpace: "pre-wrap", lineHeight: "1.4" }}>
                          {renewalCustomNotes || "Please send remittance via bank transfer or local payment method and reply with receipt."}
                        </p>
                      </div>

                      {paymentQrPreviewUrl && (
                        <div style={{ textAlign: "center", flexShrink: 0, backgroundColor: "#ffffff", padding: "6px", borderRadius: "8px", border: "1px solid #fce7f3" }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={paymentQrPreviewUrl}
                            alt="Payment QR"
                            style={{ width: "65px", height: "65px", borderRadius: "6px", display: "block", margin: "0 auto" }}
                          />
                          <span style={{ fontSize: "8px", color: "#db2777", display: "block", marginTop: "3px", fontWeight: "700", textTransform: "uppercase" }}>
                            Scan to Pay
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #f1f5f9", paddingTop: "12px" }}>
                      <p style={{ fontSize: "10.5px", color: "#64748b", margin: 0, lineHeight: "1.4" }}>
                        Thank you for learning with us! Please confirm once payment is sent to secure your schedule slots.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-pink-100">
              <button
                type="button"
                onClick={() => setIsRenewalModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 font-semibold text-gray-600 transition cursor-pointer"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyRenewalMessage}
                  className="px-4 py-2 bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedRenewalNotice ? (
                    <>
                      <Check size={14} className="text-emerald-600" />
                      <span>Copied Text!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copy Message</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleDownloadInvoicePdf}
                  disabled={isGeneratingPdf}
                  className="btn-primary text-xs px-5 py-2 flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Download size={14} />
                  <span>{isGeneratingPdf ? "Generating PDF..." : "Download Invoice PDF"}</span>
                </button>
              </div>
            </div>
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
                  {editingReportId ? "Edit Lesson Report" : "Log Lesson & Homework"}
                </h2>
                <p className="text-xs text-gray-500">
                  Record daily lesson feedback and track curriculum progress.
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
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block mb-1 font-semibold text-pink-700">
                    Select Book / Curriculum 📖
                  </label>
                  <select
                    className="input w-full text-xs bg-white cursor-pointer"
                    value={reportBookId}
                    onChange={(e) => {
                      setReportBookId(e.target.value);
                      setSelectedChapterIndex("");
                    }}
                  >
                    <option value="">-- Select Book --</option>
                    {studentBooks.map((item: any) => (
                      <option key={item.books?.id} value={item.books?.id}>
                        {item.books?.title} {item.books?.level ? `(${item.books.level})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {reportBookId && (() => {
                  const currentBookItem = studentBooks.find((item: any) => item.books?.id === reportBookId);
                  const book = currentBookItem?.books;
                  const isPageBased = book?.book_type === "pages";

                  return isPageBased ? (
                    <div className="p-3 bg-pink-50/50 rounded-xl border border-pink-100 space-y-3">
                      <label className="block font-semibold text-pink-900 text-xs">
                        Page Range Covered 📄 (Total Book Pages: {book?.total_pages || "N/A"})
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] text-gray-500 mb-0.5">Start Page</label>
                          <input
                            type="number"
                            min="1"
                            max={book?.total_pages || 999}
                            className="input w-full text-xs bg-white"
                            value={startPageInput}
                            onChange={(e) => setStartPageInput(e.target.value)}
                            placeholder="e.g. 1"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-500 mb-0.5">End Page</label>
                          <input
                            type="number"
                            min="1"
                            max={book?.total_pages || 999}
                            className="input w-full text-xs bg-white"
                            value={endPageInput}
                            onChange={(e) => setEndPageInput(e.target.value)}
                            placeholder="e.g. 5"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-pink-50/50 rounded-xl border border-pink-100 space-y-2">
                      <label className="block mb-1 font-semibold text-pink-900 text-xs">
                        Chapter / Lesson Focus 📑
                      </label>
                      <select
                        className="input w-full text-xs bg-white cursor-pointer"
                        value={selectedChapterIndex}
                        onChange={(e) => setSelectedChapterIndex(e.target.value)}
                      >
                        <option value="">-- Select Chapter --</option>
                        {(() => {
                          const chapters = book?.chapters || [];
                          const completedList = currentBookItem?.completed_chapters || [];

                          return chapters
                            .map((chap: any, idx: number) => ({ ...chap, index: idx }))
                            .filter((chap: any) => !completedList.includes(chap.index))
                            .map((chap: any) => (
                              <option key={chap.index} value={chap.index}>
                                Chapter {chap.index + 1}: {chap.title || `Lesson ${chap.index + 1}`}
                              </option>
                            ));
                        })()}
                      </select>

                      <label className="flex items-center gap-2 cursor-pointer pt-1 text-xs text-pink-950 font-medium">
                        <input
                          type="checkbox"
                          checked={isChapterComplete}
                          onChange={(e) => setIsChapterComplete(e.target.checked)}
                          className="rounded border-pink-300 text-pink-600 focus:ring-pink-500 w-4 h-4"
                        />
                        <span>Mark this chapter as fully completed 🎯</span>
                      </label>
                    </div>
                  );
                })()}
              </div>

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
                <textarea
                  rows={2}
                  placeholder="e.g. cheetah, mammal, fast, faster than"
                  className="input w-full text-xs"
                  value={vocabulary}
                  onChange={(e) => setVocabulary(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.stopPropagation();
                    }
                  }}
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
                  onChange={(e) => setHomeworkFile(e.target.files?.[0] || null)}
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
                  className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 font-semibold text-gray-600 cursor-pointer"
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
                    Teacher Alias
                  </label>
                  <select
                    className="input w-full text-xs bg-white"
                    value={teacherAlias}
                    onChange={(e) => setTeacherAlias(e.target.value)}
                  >
                    {teacherAliases.map((alias) => (
                      <option key={alias} value={alias}>{alias}</option>
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
                    {books && books.length > 0 ? (
                      books
                        .filter((b) => !selectedBookIds.includes(b.id))
                        .map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.title} {b.level ? `(${b.level})` : ""}
                          </option>
                        ))
                    ) : (
                      <option disabled value="">No books found in database</option>
                    )}
                  </select>

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
                  <div className="relative">
                    <DatePicker
                      selected={startDate ? new Date(startDate) : null}
                      onChange={(date: Date | null) => {
                        if (date) {
                          const y = date.getFullYear();
                          const m = String(date.getMonth() + 1).padStart(2, "0");
                          const d = String(date.getDate()).padStart(2, "0");
                          setStartDate(`${y}-${m}-${d}`);
                        } else {
                          setStartDate("");
                        }
                      }}
                      dateFormat="yyyy-MM-dd"
                      placeholderText="Select start date"
                      className="input w-full text-xs bg-white cursor-pointer pr-9"
                      wrapperClassName="w-full"
                    />
                    <div className="absolute right-3 top-2.5 text-pink-600 pointer-events-none">
                      <Calendar size={14} />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block mb-1 text-xs font-semibold text-gray-700">
                    Email
                  </label>
                  <input
                    className="input w-full text-xs"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="parent@example.com"
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
                    Free Classes
                  </label>
                  <input
                    type="number"
                    className="input w-full text-xs"
                    value={freeClasses}
                    onChange={(e) => setFreeClasses(e.target.value)}
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
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-600 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateStudent}
                className="btn-primary cursor-pointer text-xs"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD WEEKLY SCHEDULE */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="card bg-white w-full max-w-md p-6 rounded-3xl shadow-xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-pink-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-pink-950">Add Weekly Schedule</h3>
                <p className="text-gray-500">Set regular class slots for this student.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSchedule} className="space-y-3.5">
              <div>
                <label className="block mb-1.5 font-semibold text-gray-700">Select Days of the Week *</label>
                <div className="grid grid-cols-2 gap-2">
                  {DAYS_OF_WEEK.map((day) => {
                    const isSelected = scheduleDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setScheduleDays(scheduleDays.filter((d) => d !== day));
                          } else {
                            setScheduleDays([...scheduleDays, day]);
                          }
                        }}
                        className={`py-2 px-3 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                          isSelected
                            ? "bg-pink-600 text-white border-pink-600 shadow-xs"
                            : "bg-white text-gray-700 border-gray-200 hover:bg-pink-50"
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-semibold text-gray-700">Class Time *</label>
                  <input
                    type="time"
                    required
                    className="input w-full text-xs"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-gray-700">Duration (mins)</label>
                  <select
                    className="input w-full text-xs bg-white"
                    value={scheduleDuration}
                    onChange={(e) => setScheduleDuration(e.target.value)}
                  >
                    <option value="25">25 minutes</option>
                    <option value="40">40 minutes</option>
                    <option value="50">50 minutes</option>
                    <option value="60">60 minutes</option>
                    <option value="90">90 minutes</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block mb-1 font-semibold text-gray-700">Topic / Focus</label>
                <input
                  type="text"
                  placeholder="e.g. Regular Class / Conversation"
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
    </div>
  );
}