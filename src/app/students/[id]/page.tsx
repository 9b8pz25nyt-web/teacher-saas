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
  Edit2,
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

export default function StudentDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const studentId = resolvedParams.id;
  const router = useRouter();
  const searchParams = useSearchParams();

  // State Declarations
  const [student, setStudent] = useState<any>(null);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [studentBooks, setStudentBooks] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
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

  // Edit Student Modal State
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

  // Duration State
  const [durationSelect, setDurationSelect] = useState<string>("40");
  const [customDuration, setCustomDuration] = useState<number>(40);
  const finalDuration = durationSelect === "custom" ? Number(customDuration) : Number(durationSelect);

  // Edit Schedule Modal State
  const [editingSchedule, setEditingSchedule] = useState<any>(null);
  const [editDayOfWeek, setEditDayOfWeek] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editDuration, setEditDuration] = useState(40);
  const [isUpdatingSchedule, setIsUpdatingSchedule] = useState(false);

  function handleOpenEditSchedule(sched: any) {
    setEditingSchedule(sched);
    setEditDayOfWeek(sched.day_of_week || "Tuesday");
    setEditStartTime(sched.start_time || sched.schedule_time || sched.time || "17:00");
    setEditDuration(Number(sched.duration_minutes || sched.duration || 40));
  }

  async function handleUpdateSchedule(e: React.FormEvent) {
    e.preventDefault();
    if (!editingSchedule) return;

    setIsUpdatingSchedule(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("schedules")
        .update({
          day_of_week: editDayOfWeek,
          schedule_time: editStartTime,
          duration: editDuration,
        })
        .eq("id", editingSchedule.id)
        .eq("user_id", user.id);

      if (error) throw error;

      setEditingSchedule(null);
      await fetchStudentData();
    } catch (err: any) {
      console.error("Error updating schedule:", err);
      alert("Failed to update schedule: " + err.message);
    } finally {
      setIsUpdatingSchedule(false);
    }
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
        .eq("user_id", user.id)
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
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://teacher-saas-pink.vercel.app";
        const portalLink = `${baseUrl}/portal/${studentData.access_token}`;
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
      const standardOptions = ["25", "40", "50", "60", "90"];
      if (standardOptions.includes(durationVal)) {
        setDurationSelect(durationVal);
        setCustomDuration(Number(durationVal));
      } else {
        setDurationSelect("custom");
        setCustomDuration(Number(durationVal));
      }

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
        { data: lessonList },
      ] = await Promise.all([
        supabase.from("schedules").select("*").eq("student_id", studentId).eq("user_id", user.id),
        supabase.from("books").select("*").eq("user_id", user.id).order("title", { ascending: true }),
        supabase
          .from("class_reports")
          .select("*")
          .eq("student_id", studentId)
          .eq("user_id", user.id)
          .order("report_date", { ascending: false }),
        supabase.from("student_books").select("*").eq("student_id", studentId),
        supabase
          .from("payments")
          .select("*")
          .eq("student_id", studentId)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1),
        supabase
          .from("lessons")
          .select("*")
          .eq("student_id", studentId)
          .order("lesson_date", { ascending: false }),
      ]);

      if (scheds) setSchedules(scheds);
      if (bks) setBooks(bks);
      if (repList) setReports(repList);
      if (lessonList) setLessons(lessonList);
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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
          class_duration: finalDuration,
          payment_status: paymentStatus,
          start_date: startDate || null,
          contract_start_date: startDate || null,
          end_date: endDate || null,
          notes: notes.trim() || null,
        })
        .eq("id", studentId)
        .eq("user_id", user.id);

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

    setIsSavingSchedule(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const insertPayload = scheduleDays.map((day) => ({
        user_id: user.id,
        student_id: studentId,
        day_of_week: day,
        schedule_time: scheduleTime,
        duration: Number(scheduleDuration),
        topic: scheduleTopic || "Regular Class",
      }));

      const { error } = await supabase.from("schedules").insert(insertPayload);

      if (error) throw error;

      setIsScheduleModalOpen(false);
      setScheduleDays([]);
      setScheduleTopic("");

      await fetchStudentData();
    } catch (err: any) {
      console.error("Error adding schedule:", err);
      alert("Failed to add schedule: " + err.message);
    } finally {
      setIsSavingSchedule(false);
    }
  }

  async function handleDeleteSchedule(scheduleId: string) {
    if (!confirm("Are you sure you want to delete this schedule slot?")) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("schedules")
        .delete()
        .eq("id", scheduleId)
        .eq("user_id", user.id);

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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
        .eq("id", reportId)
        .eq("user_id", user.id);

      if (error) throw error;

      const newCompletedCount = Math.max((student?.classes_completed || 1) - 1, 0);
      await supabase
        .from("students")
        .update({ classes_completed: newCompletedCount })
        .eq("id", studentId)
        .eq("user_id", user.id);

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
      if (!user) return;

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
        user_id: user.id,
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
          .eq("id", editingReportId)
          .eq("user_id", user.id);

        if (updateError) throw updateError;
      } else {
        payload.student_id = studentId;

        const { error: reportError } = await supabase
          .from("class_reports")
          .insert(payload);

        if (reportError) throw reportError;

        await supabase.from("lessons").insert({
          user_id: user.id,
          student_id: studentId,
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
          .eq("id", studentId)
          .eq("user_id", user.id);
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("students")
      .delete()
      .eq("id", studentId)
      .eq("user_id", user.id);

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
          scale: 4,
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

  const dynamicCompletedCount = Math.max(reports.length, lessons.length, Number(student?.classes_completed || 0));
  const dynamicRemainingCount = Math.max(combinedTotalClasses - dynamicCompletedCount, 0);
  const dynamicProgressPercent = Math.min(
    Math.round((dynamicCompletedCount / (combinedTotalClasses || 1)) * 100),
    100
  );

  const totalRegularClasses = Number(student?.classes_included || 0);
  const totalFreeClasses = Number(student?.free_classes || 0);
  const isFreePackage = totalRegularClasses === 0 && totalFreeClasses > 0;

  const rawStudentStatus = (student?.payment_status || "Pending").trim().toLowerCase();
  const rawPaymentStatus = (latestPayment?.payment_status || latestPayment?.status || "").trim().toLowerCase();

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

                let maxPageReached = 0;

                if (isPageBased) {
                  const reportMax = reports
                    .filter((r) => r.book_id === book?.id)
                    .reduce((max, r) => Math.max(max, r.end_page || 0), 0);

                  let lessonMax = 0;
                  lessons.forEach((l) => {
                    if (Array.isArray(l.book_progress)) {
                      l.book_progress.forEach((bp: any) => {
                        if (bp.book_id === book?.id) {
                          const ep = Number(bp.end_page) || 0;
                          if (ep > lessonMax) lessonMax = ep;
                        }
                      });
                    } else if (l.book_id === book?.id) {
                      const ep = Number(l.end_page) || 0;
                      if (ep > lessonMax) lessonMax = ep;
                    }
                  });

                  maxPageReached = Math.max(reportMax, lessonMax);
                }

                let bookProgress = 0;
                if (isPageBased) {
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

      {/* Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (5/12) */}
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
                  .sort((a, b) => DAY_ORDER.indexOf(a.day_of_week) - DAY_ORDER.indexOf(b.day_of_week))
                  .map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between text-xs p-2.5 bg-pink-50/40 rounded-xl border border-pink-100/70 hover:bg-pink-50/80 transition"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-gray-800 w-16">
                          {s.day_of_week}
                        </span>
                        <span className="text-pink-600 font-bold font-mono text-[12px] bg-pink-50 px-2 py-0.5 rounded-md border border-pink-100">
                          {s.start_time || s.schedule_time || s.time || "17:00"}
                        </span>
                        <span className="text-gray-400 font-medium text-[10px]">
                          {s.duration_minutes || s.duration || 40}m
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditSchedule(s)}
                          className="text-gray-400 hover:text-pink-600 p-1 transition cursor-pointer"
                          title="Edit Schedule Time"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSchedule(s.id)}
                          className="text-gray-400 hover:text-red-600 p-1 transition cursor-pointer"
                          title="Delete Schedule"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
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
          <div className="bg-white border border-pink-100 rounded-3xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-gray-900">
                  Logged Lessons & Reports
                </h3>
                <span className="px-2 py-0.5 bg-pink-50 text-pink-600 font-bold text-xs rounded-full border border-pink-100">
                  {reports.length + lessons.length}
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

            {reports.length === 0 && lessons.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400 space-y-2">
                <p className="italic">No class reports logged yet.</p>
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(true)}
                  className="text-pink-600 font-bold hover:underline"
                >
                  Click here to log your first lesson
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Render Class Reports */}
                {reports.map((rep) => (
                  <div key={rep.id} className="p-4 bg-pink-50/30 rounded-2xl border border-pink-100 space-y-2">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-pink-950 text-xs">{rep.lesson_title || rep.title || "Class Report"}</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-gray-500">{rep.report_date?.substring(0, 10)}</span>
                        <button onClick={() => handleOpenEditReport(rep)} className="text-gray-400 hover:text-pink-600 p-1">
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => handleDeleteReport(rep.id, rep.homework_file_url)} className="text-gray-400 hover:text-red-600 p-1">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    {rep.vocabulary && <p className="text-xs text-gray-700"><span className="font-bold">Vocab:</span> {rep.vocabulary}</p>}
                    {rep.strengths && <p className="text-xs text-gray-700"><span className="font-bold">Strengths:</span> {rep.strengths}</p>}
                    {rep.homework && <p className="text-xs text-pink-700 font-medium"><span className="font-bold">Homework:</span> {rep.homework}</p>}
                  </div>
                ))}

                {/* Render Lessons */}
                {lessons.map((les) => (
                  <div key={les.id} className="p-4 bg-pink-50/30 rounded-2xl border border-pink-100 space-y-2">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-pink-950 text-xs">{les.title || "Lesson Log"}</h4>
                      <span className="text-[11px] font-mono text-gray-500">{les.lesson_date?.substring(0, 10)}</span>
                    </div>

                    {Array.isArray(les.book_progress) && les.book_progress.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {les.book_progress.map((bp: any, idx: number) => {
                          const matchedBook = books.find((b) => b.id === bp.book_id);
                          return (
                            <span key={idx} className="text-[10px] font-bold text-pink-800 bg-pink-100/70 px-2.5 py-0.5 rounded-lg border border-pink-200">
                              📖 {matchedBook?.title || "Book"}: p. {bp.start_page || 1} - {bp.end_page}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {les.description && <p className="text-xs text-gray-600 italic pl-1 pt-1">"{les.description}"</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}