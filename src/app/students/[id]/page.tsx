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
  FileText,
  Video,
  ChevronDown,
  ChevronUp,
  Receipt,
  X,
  Download,
  Calendar,
  Edit2,
  Sparkles,
} from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import StudentEditModal from "@/components/StudentEditModal";
import LessonLogModal from "@/components/LessonLogModal";

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
  const [makeupClasses, setMakeupClasses] = useState<any[]>([]);
  const [latestPayment, setLatestPayment] = useState<any>(null);
  const [teacherAliases, setTeacherAliases] = useState<string[]>(DEFAULT_ALIASES);
  const [loading, setLoading] = useState(true);
  const [copiedPortal, setCopiedPortal] = useState(false);
  const [copiedRenewalNotice, setCopiedRenewalNotice] = useState(false);
  const [copiedWelcome, setCopiedWelcome] = useState(false);
  const [copiedContract, setCopiedContract] = useState(false);
  const [expandedReportIds, setExpandedReportIds] = useState<string[]>([]);
  const [isParentRequestsOpen, setIsParentRequestsOpen] = useState(true);
  

  // Template Customization State
  const [customParentName, setCustomParentName] = useState("");
  const [customTeacherName, setCustomTeacherName] = useState("");
  const [customContractDate, setCustomContractDate] = useState("");
  const [customClasses, setCustomClasses] = useState("");
  const [customFreeClasses, setCustomFreeClasses] = useState("");
  const [customClassDuration, setCustomClassDuration] = useState("");
  const [customPaymentAmount, setCustomPaymentAmount] = useState("");
  const [renewalParentName, setRenewalParentName] = useState("");
  
  
  const [selectedLesson, setSelectedLesson] = useState<{
    eventId: string;
    studentId: string;
    studentName: string;
    type: "regular" | "makeup";
    dateString?: string;
  } | null>(null);

  // Payment Instructions & QR Upload State
  const [renewalBankDetails, setRenewalBankDetails] = useState("");
  const [isRenewalModalOpen, setIsRenewalModalOpen] = useState(false);
  const [renewalClassesCount, setRenewalClassesCount] = useState("20");
  const [renewalFreeCount, setRenewalFreeCount] = useState("0");
  const [renewalRate, setRenewalRate] = useState("");
  const [renewalDuration, setRenewalDuration] = useState("40");
  const [renewalStartDate, setRenewalStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [renewalQrCode, setRenewalQrCode] = useState("");
  const [renewalCustomNotes, setRenewalCustomNotes] = useState("");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [invoiceQrDataUrl, setInvoiceQrDataUrl] = useState("");
  const [portalQrDataUrl, setPortalQrDataUrl] = useState("");
  const invoicePdfRef = useRef<HTMLDivElement>(null);

  function toggleExpandReport(id: string) {
    setExpandedReportIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  // Improved Professional Print Layout Helper for Lesson Reports
  function handlePrintLessonReport(lessonData: {
    title: string;
    date: string;
    studentName?: string;
    teacherAlias?: string;
    bookTitle?: string;
    vocabulary?: string;
    strengths?: string;
    improvements?: string;
    homework?: string;
    teacherMessage?: string;
  }) {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Lesson Report - ${lessonData.title}</title>
          <style>
            @page {
              size: A4;
              margin: 15mm;
            }
            body {
              font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
              padding: 0;
              margin: 0;
              color: #1f2937;
              background-color: #ffffff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .report-container {
              border: 2px solid #fbcfe8;
              border-radius: 14px;
              padding: 20px 24px;
              background: #fff;
              max-width: 100%;
              box-sizing: border-box;
            }
            .header {
              border-bottom: 2px solid #db2777;
              padding-bottom: 10px;
              margin-bottom: 16px;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
            }
            .header h2 {
              color: #be185d;
              margin: 0 0 2px 0;
              font-size: 18px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .meta {
              font-size: 11px;
              color: #4b5563;
              font-weight: 600;
            }
            .badge {
              background: #fdf2f8;
              color: #be185d;
              padding: 3px 8px;
              border-radius: 6px;
              font-size: 10px;
              font-weight: bold;
              border: 1px solid #fbcfe8;
            }
            .section {
              margin-bottom: 12px;
              break-inside: avoid;
              page-break-inside: avoid;
            }
            .label {
              font-size: 10px;
              font-weight: 800;
              text-transform: uppercase;
              color: #be185d;
              margin-bottom: 4px;
              letter-spacing: 0.5px;
            }
            .box {
              background: #fdf2f8;
              border: 1px solid #fbcfe8;
              padding: 10px 14px;
              border-radius: 8px;
              font-size: 12px;
              line-height: 1.5;
              color: #374151;
              white-space: pre-wrap;
            }
            .grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px;
              margin-bottom: 12px;
              break-inside: avoid;
              page-break-inside: avoid;
            }
            .footer {
              margin-top: 16px;
              text-align: center;
              font-size: 10px;
              color: #9ca3af;
              border-top: 1px solid #e5e7eb;
              padding-top: 10px;
            }
          </style>
        </head>
        <body>
          <div class="report-container">
            <div class="header">
              <div>
                <h2>Lesson Report Card</h2>
                <div class="meta">Student: <strong>${lessonData.studentName || "Student"}</strong> &bull; Date: ${lessonData.date}</div>
              </div>
              <div class="badge">${lessonData.teacherAlias || "Teacher"}</div>
            </div>

            <div style="font-size: 14px; font-weight: bold; color: #111827; margin-bottom: 12px;">
              Topic: ${lessonData.title}
            </div>

            ${lessonData.bookTitle ? `<div class="section"><div class="label">Book / Material Covered</div><div class="box">📚 ${lessonData.bookTitle}</div></div>` : ""}
            
            ${lessonData.vocabulary ? `<div class="section"><div class="label">Vocabulary & Structures</div><div class="box" style="font-family: monospace; font-size: 11px;">${lessonData.vocabulary}</div></div>` : ""}

            <div class="grid">
              ${lessonData.strengths ? `<div class="section" style="margin-bottom: 0;"><div class="label" style="color: #047857;">Strengths & Highlights</div><div class="box" style="background: #ecfdf5; border-color: #a7f3d0; color: #065f46;">${lessonData.strengths}</div></div>` : ""}
              ${lessonData.improvements ? `<div class="section" style="margin-bottom: 0;"><div class="label" style="color: #b45309;">Next Focus / Tips</div><div class="box" style="background: #fffbeb; border-color: #fde68a; color: #92400e;">${lessonData.improvements}</div></div>` : ""}
            </div>

            ${lessonData.homework ? `<div class="section"><div class="label">Assigned Homework</div><div class="box">📖 ${lessonData.homework}</div></div>` : ""}
            
            ${lessonData.teacherMessage ? `<div class="section"><div class="label">Message from Teacher</div><div class="box" style="background: #eff6ff; border-color: #bfdbfe; color: #1e40af;">💌 ${lessonData.teacherMessage}</div></div>` : ""}

            <div class="footer">
              Private English Tutoring Program &bull; Keep up the great work!
            </div>
          </div>

          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  // Edit Student Modal State & Fields
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
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
  const [renewalThankYouMessage, setRenewalThankYouMessage] = useState(
    "Thank you for continuing your private English classes! Please remit payment using the options below to confirm your schedule slots.\n\nIf payment has been made already, kindly disregard this notice. After remitting the payment, please send me a screenshot confirmation."
  );

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

      // Initialize template customization states
      setCustomParentName(studentData.name || "");
      setRenewalParentName(studentData.parent_name || "");
      setCustomTeacherName(studentData.teacher_alias || "Teacher Gabi");
      setCustomContractDate(studentData.start_date || new Date().toISOString().split("T")[0]);
      setCustomClasses(studentData.classes_included !== undefined ? String(studentData.classes_included) : "20");
      setCustomFreeClasses(studentData.free_classes !== undefined ? String(studentData.free_classes) : "0");
      setCustomClassDuration(studentData.class_duration !== undefined ? String(studentData.class_duration) : "40");
      setCustomPaymentAmount(studentData.payment_amount !== undefined ? String(studentData.payment_amount) : "");

      const rawAmount = studentData.payment_amount ? String(studentData.payment_amount) : "";
      setPaymentAmount(
        rawAmount ? Number(rawAmount.replace(/[^0-9.]/g, "")).toLocaleString() : ""
      );
      setRenewalRate(rawAmount);

      if (studentData.access_token) {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://teacher-saas-pink.vercel.app";
        const portalLink = `${baseUrl}/portal/${studentData.access_token}`;
        QRCode.toDataURL(portalLink, { width: 120, margin: 1 })
          .then((url) => {
            setInvoiceQrDataUrl(url);
            setPortalQrDataUrl(url);
          })
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
        { data: makeupList },
      ] = await Promise.all([
        supabase.from("schedules").select("*").eq("student_id", studentId).eq("user_id", user.id),
        supabase.from("books").select("*").eq("user_id", user.id).order("title", { ascending: true }),
        supabase
          .from("class_reports")
          .select("*")
          .eq("student_id", studentId)
          .eq("teacher_id", user.id),
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
        supabase.from("makeup_classes").select("*").eq("student_id", studentId).eq("user_id", user.id),
      ]);

      if (scheds) setSchedules(scheds);
      if (bks) setBooks(bks);
      if (repList) setReports(repList);
      if (lessonList) setLessons(lessonList);
      if (makeupList) setMakeupClasses(makeupList);
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

  async function handleSaveCustomName(newName: string) {
    setCustomParentName(newName);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("students")
        .update({ name: newName })
        .eq("id", studentId)
        .eq("user_id", user.id);

      if (error) throw error;
      
      setStudent((prev: any) => ({ ...prev, name: newName }));
      setName(newName);
    } catch (err: any) {
      console.error("Error updating student name:", err);
    }
  }

async function handleSaveParentName(newParentName: string) {
    setRenewalParentName(newParentName);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("students")
        .update({ parent_name: newParentName })
        .eq("id", studentId)
        .eq("user_id", user.id);

      if (error) throw error;
      
      setStudent((prev: any) => ({ ...prev, parent_name: newParentName }));
    } catch (err: any) {
      console.error("Error updating parent name:", err);
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

      if (error) throw error;

      setIsEditModalOpen(false);
      await fetchStudentData();
    } catch (err: any) {
      console.error("Error updating student:", err);
      alert("Failed to update student: " + err.message);
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
    if (!confirm("Are you sure you want to delete this lesson report?")) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: reportRow } = await supabase
        .from("class_reports")
        .select("report_date, lesson_title")
        .eq("id", reportId)
        .single();

      if (homeworkFileUrl) {
        const parts = homeworkFileUrl.split("/homework-files/");
        if (parts[1]) {
          await supabase.storage.from("homework-files").remove([decodeURIComponent(parts[1])]);
        }
      }

      const { error } = await supabase
        .from("class_reports")
        .delete()
        .eq("id", reportId);

      if (error) throw error;

      if (reportRow) {
        await supabase
          .from("lessons")
          .delete()
          .eq("student_id", studentId)
          .eq("lesson_date", reportRow.report_date)
          .eq("title", reportRow.lesson_title);
      }

      fetchStudentData();
    } catch (err: any) {
      console.error("Error deleting report:", err);
      alert("Failed to delete report: " + (err.message || err));
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

  // Document Template Generators & Clipboard Helpers using Custom Inputs
  const portalUrl = student?.access_token ? `${window.location.origin}/portal/${student.access_token}` : "[Portal Link]";
  const teacherName = customTeacherName.trim() || student?.teacher_alias || teacherAlias || "Teacher Gabi";
  const parentOrStudentName = customParentName.trim() || student?.name || "Student";
  const totalClsCount = Number(customClasses !== "" ? customClasses : (student?.classes_included || 20));
  const freeClsCount = Number(customFreeClasses !== "" ? customFreeClasses : (student?.free_classes || 0));
  const clsDuration = Number(customClassDuration !== "" ? customClassDuration : (student?.class_duration || 40));
  const cleanPkgRateInput = Number(String(customPaymentAmount !== "" ? customPaymentAmount : (student?.payment_amount || 0)).replace(/[^0-9.]/g, "")) || 0;
  const pkgRate = cleanPkgRateInput.toLocaleString();
  const pkgCurrency = student?.payment_currency || "PHP";
  const contractDate = customContractDate.trim() || student?.start_date || new Date().toISOString().split("T")[0];

  const welcomeCardText = `Welcome to Private English Classes! 🎉

Dear ${parentOrStudentName},

A huge warm welcome to our English learning journey together! I am so excited to have you in class. 

Our lessons are designed to be fun, interactive, and completely tailored to help you reach your language goals—whether that is building speaking confidence, mastering new vocabulary, or excelling in school.

🔗 Your Student Learning Portal:
You can track your lesson history, view assigned homework, and check your class progress anytime here:
${portalUrl}

Let's make this learning journey amazing! See you in class soon. 😊

Warmly,
${teacherName}`;

  const contractText = `PRIVATE ENGLISH TUTORING SERVICE AGREEMENT

1. PARTIES INVOLVED
• Teacher / Instructor: ${teacherName}
• Student / Parent & Guardian: ${parentOrStudentName}
• Effective Date: ${contractDate}

2. LESSON PACKAGE & STRUCTURE
• Total Classes Included: ${totalClsCount} Regular Classes${freeClsCount > 0 ? ` + ${freeClsCount} Free Bonus Classes` : ""}
• Class Duration: ${clsDuration} minutes per session
• Tuition Fee: ${pkgRate} ${pkgCurrency}

3. ATTENDANCE, CANCELLATIONS & MAKEUP CLASSES
• Flexibility: Absences and makeup classes are fully accommodated and stress-effective.
• Scheduling Makeups: If a student needs to miss or reschedule a session, simply notify the teacher in advance, and a makeup class will be easily arranged based on mutual availability.
• Punctuality: Lessons will begin and end on scheduled times.

4. HOMEWORK & MATERIALS (AS APPLICABLE)
• Homework Practice: Assigned when appropriate to reinforce key vocabulary and grammar structures.
• Learning Resources: Custom textbooks, worksheets, and interactive exercises provided via the Student Learning Portal.

5. STUDENT LEARNING PORTAL
• Access Link: ${portalUrl}
• Use: Track attendance, review lesson reports, and check homework completion status anytime.

6. RENEWAL & PAYMENT POLICY
• Tuition fee is remitted in advance or upon package renewal to secure regular weekly time slots.`;

  function handleCopyWelcome() {
    navigator.clipboard.writeText(welcomeCardText);
    setCopiedWelcome(true);
    setTimeout(() => setCopiedWelcome(false), 2000);
  }

  function handleCopyContract() {
    navigator.clipboard.writeText(contractText);
    setCopiedContract(true);
    setTimeout(() => setCopiedContract(false), 2000);
  }

function handlePrintContract() {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Tutoring Agreement - ${parentOrStudentName}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 30px; color: #1f2937; max-width: 800px; margin: 0 auto; line-height: 1.6; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .agreement-container { border: 2px solid #fbcfe8; border-radius: 16px; padding: 40px; background: #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
            .header-banner { background: linear-gradient(135deg, #be185d, #db2777); color: white; padding: 25px 30px; border-radius: 12px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
            .header-banner h1 { margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 1px; font-weight: 800; }
            .header-banner p { margin: 4px 0 0 0; font-size: 12px; opacity: 0.9; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; background: #fdf2f8; border: 1px solid #fbcfe8; padding: 20px; border-radius: 12px; margin-bottom: 25px; }
            .info-item label { display: block; font-size: 10px; font-weight: bold; text-transform: uppercase; color: #be185d; margin-bottom: 2px; }
            .info-item span { font-size: 13px; font-weight: 600; color: #111827; }
            .section-title { font-size: 13px; font-weight: 800; color: #be185d; text-transform: uppercase; margin-top: 25px; margin-bottom: 8px; border-bottom: 1px solid #fce7f3; padding-bottom: 4px; letter-spacing: 0.5px; }
            ul { padding-left: 20px; margin: 5px 0 15px 0; }
            li { font-size: 12px; margin-bottom: 4px; color: #374151; }
            .portal-box { background: #eff6ff; border: 1px solid #bfdbfe; padding: 14px 16px; border-radius: 10px; font-size: 12px; color: #1e40af; margin-top: 15px; display: flex; justify-content: space-between; align-items: center; gap: 15px; }
            .signature-section { margin-top: 50px; display: flex; justify-content: space-between; gap: 40px; }
            .sig-box { flex: 1; border-top: 2px solid #374151; padding-top: 10px; font-size: 12px; font-weight: bold; color: #374151; display: flex; justify-content: space-between; align-items: center; }
            .sig-date { font-weight: normal; color: #4b5563; font-size: 11px; }
            .footer-note { margin-top: 40px; text-align: center; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 15px; }
          </style>
        </head>
        <body>
          <div class="agreement-container">
            <div class="header-banner">
              <div>
                <h1>Private English Tutoring Agreement</h1>
                <p>Terms & Conditions</p>
              </div>
              <div style="text-align: right; font-size: 11px; font-weight: bold;">
                CONFIRMED
              </div>
            </div>

            <div class="info-grid">
              <div class="info-item">
                <label>Teacher / Instructor</label>
                <span>${teacherName}</span>
              </div>
              <div class="info-item">
                <label>Student / Parent & Guardian</label>
                <span>${parentOrStudentName}</span>
              </div>
              <div class="info-item">
                <label>Effective Date</label>
                <span>${contractDate}</span>
              </div>
              <div class="info-item">
                <label>Tuition Investment</label>
                <span>${pkgRate} ${pkgCurrency}</span>
              </div>
            </div>

            <div class="section-title">1. Lesson Package & Structure</div>
            <ul>
              <li><strong>Total Classes:</strong> ${totalClsCount} Regular Classes${freeClsCount > 0 ? ` + ${freeClsCount} Free Bonus Classes` : ""}</li>
              <li><strong>Session Duration:</strong> ${clsDuration} minutes per class</li>
              <li><strong>Curriculum:</strong> Customized interactive speaking, vocabulary, and grammar modules.</li>
            </ul>

            <div class="section-title">2. Attendance, Rescheduling & Makeups</div>
            <ul>
              <li><strong>Flexible Policy:</strong> Absences and schedule changes are fully accommodated without penalty.</li>
              <li><strong>Makeup Coordination:</strong> If a lesson must be missed, notify the teacher in advance to reschedule based on mutual calendar availability.</li>
              <li><strong>Punctuality:</strong> Sessions begin promptly at the scheduled hour.</li>
            </ul>

            <div class="section-title">3. Homework & Learning Resources</div>
            <ul>
              <li><strong>Practice:</strong> Targeted assignments are provided when appropriate following each session to reinforce retention.</li>
              <li><strong>Portal Tracking:</strong> All materials, books, and reports are available via the student portal.</li>
            </ul>

            <div class="portal-box">
              <div>
                🔗 <strong>Student Learning Portal Link:</strong><br/>
                <em style="word-break: break-all;">${portalUrl}</em>
              </div>
              ${portalQrDataUrl ? `<div style="text-align: center; background: #ffffff; padding: 6px; border-radius: 8px; border: 1px solid #bfdbfe;"><img src="${portalQrDataUrl}" style="width: 80px; height: 80px; display: block;" /><span style="font-size: 9px; font-weight: bold; color: #1e40af;">Scan to Open</span></div>` : ""}
            </div>

            <div class="section-title">4. Renewal & Terms</div>
            <ul>
              <li>Package renewal payment is requested upon completion or prior to the start of a new series to secure preferred weekly slots.</li>
            </ul>

            <div class="signature-section">
              <div class="sig-box">
                <span>Teacher's Signature</span>
                <span class="sig-date">Date: ${contractDate}</span>
              </div>
              <div class="sig-box">
                <span>Parent's / Student's Signature</span>
                <span class="sig-date">Date: ${contractDate}</span>
              </div>
            </div>

            <div class="footer-note">
              Thank you for trusting me with your English learning journey! Let's achieve great milestones together. ✨
            </div>
          </div>

          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

function handleCopyRenewalMessage() {
    const freeText = Number(freeClsCount) > 0 ? ` (+${freeClsCount} Free Bonus Classes)` : "";
    const cleanNum = Number(String(renewalRate).replace(/[^0-9.]/g, "")) || 0;
    const formattedAmount = cleanNum.toLocaleString("en-US");
    const parentGreeting = renewalParentName.trim() || "Parent";

    const renewalText = `🌟 CLASS PACKAGE RENEWAL NOTICE 🌟

Dear ${parentGreeting},

Thank you for continuing with ${teacherName}'s private English classes! Here are the details for ${parentOrStudentName}'s upcoming lesson package:

📚 Package Details:
• Total Classes: ${totalClsCount} Classes${freeText}
• Class Duration: ${renewalDuration} minutes per session
• Tuition Fee: ${formattedAmount} ${pkgCurrency}
• Target Start Date: ${renewalStartDate}

${portalUrl ? `🔗 Student Learning Portal:\n${portalUrl}\n` : ""}${renewalCustomNotes ? `📝 Note:\n${renewalCustomNotes}\n\n` : ""}💳 Payment Instructions:
${renewalThankYouMessage}

${renewalBankDetails ? `🏦 Bank Details:\n${renewalBankDetails}\n` : ""}Please let me know once payment has been sent so we can secure the weekly schedule slots. Thank you very much! 😊`;

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
        filename: `Renewal_Invoice_${parentOrStudentName.replace(/\s+/g, "_")}_${renewalStartDate}.pdf`,
        image: { type: "png" as const, quality: 1.0 },
        html2canvas: {
          scale: 5,
          useCORS: true,
          backgroundColor: "#ffffff",
          letterRendering: true,
          scrollY: 0,
        },
        jsPDF: {
          unit: "mm" as const,
          format: "a4" as const,
          orientation: "portrait" as const,
        },
      };

      await html2pdf().set(opt).from(element).save();
    } catch (err: any) {
      console.error("Invoice PDF export error:", err);
      alert("Failed to export Invoice PDF: " + (err.message || err));
    } finally {
      setIsGeneratingPdf(false);
    }
  }

  const combinedTotalClasses = totalClsCount + freeClsCount;

  const validReports = reports.filter(
    (r) => {
      const title = (r.lesson_title || r.title || "").toLowerCase();
      const status = (r.status || "").toLowerCase();
      return !title.includes("cancelled") && 
             !title.includes("absent") && 
             status !== "cancelled" && 
             status !== "absent";
    }
  );

  const validLessons = lessons.filter(
    (l) => {
      const title = (l.title || "").toLowerCase();
      const status = (l.status || "").toLowerCase();
      return !title.includes("cancelled") && 
             !title.includes("absent") && 
             status !== "cancelled" && 
             status !== "absent";
    }
  );

  const completedMakeups = makeupClasses.filter(
    (m) => {
      const s = (m.status || "").trim().toLowerCase();
      return s !== "cancelled" && s !== "absent";
    }
  );

  const dynamicCompletedCount = Math.max(validReports.length, validLessons.length) + completedMakeups.length;
  const dynamicRemainingCount = Math.max(combinedTotalClasses - dynamicCompletedCount, 0);
  const dynamicProgressPercent = Math.min(
    Math.round((dynamicCompletedCount / (combinedTotalClasses || 1)) * 100),
    100
  );

  const totalRegularClasses = totalClsCount;
  const totalFreeClasses = freeClsCount;
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
          <div className="w-full bg-pink-100 h-2.5 rounded-full overflow-hidden border border-pink-200">
            <div
              className="bg-pink-600 h-full rounded-full transition-all duration-300 min-w-[2px]"
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
              onClick={() => setIsBookModalOpen(true)}
              className="text-xs font-medium text-pink-600 hover:text-pink-700 bg-pink-50 hover:bg-pink-100 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
            >
              Edit Books
            </button>
          </div>
          <div className="space-y-2 max-h-[160px] overflow-y-auto">
            {studentBooks.length > 0 ? (
              studentBooks.map((item, index) => {
                const book = item.books || item;
                const bookId = book?.id || item.book_id;
                const isPageBased = book?.book_type === "pages";

                let maxPageReached = 0;
                if (isPageBased && bookId) {
                  const reportMax = reports
                    .filter((r) => r.book_id === bookId)
                    .reduce((max, r) => Math.max(max, r.end_page || 0), 0);

                  let lessonMax = 0;
                  lessons.forEach((l) => {
                    if (Array.isArray(l.book_progress)) {
                      l.book_progress.forEach((bp: any) => {
                        if (bp.book_id === bookId) {
                          const ep = Number(bp.end_page) || 0;
                          if (ep > lessonMax) lessonMax = ep;
                        }
                      });
                    } else if (l.book_id === bookId) {
                      const ep = Number(l.end_page) || 0;
                      if (ep > lessonMax) lessonMax = ep;
                    }
                  });

                  let makeupMax = 0;
                  makeupClasses.forEach((mc) => {
                    if (Array.isArray(mc.book_progress)) {
                      mc.book_progress.forEach((bp: any) => {
                        if (bp.book_id === bookId) {
                          const ep = Number(bp.end_page) || 0;
                          if (ep > makeupMax) makeupMax = ep;
                        }
                      });
                    } else if (mc.book_id === bookId) {
                      const ep = Number(mc.end_page) || 0;
                      if (ep > makeupMax) makeupMax = ep;
                    }
                  });

                  maxPageReached = Math.max(reportMax, lessonMax, makeupMax);
                }

                const totalPages = Number(book?.total_pages) || 1;
                const totalChapters = Array.isArray(book?.chapters) ? book.chapters.length : Number(book?.total_chapters) || 1;
                const completedChapters = item?.completed_chapters || [];

                const bookProgress = isPageBased
                  ? Math.min(100, Math.round((maxPageReached / totalPages) * 100))
                  : Math.min(100, Math.round((completedChapters.length / totalChapters) * 100));

                return (
                  <div key={bookId || index} className="p-2.5 bg-pink-50/50 rounded-xl border border-pink-100 space-y-1">
                    <div className="flex justify-between items-center text-xs font-bold text-pink-950">
                      <span>📖 {book?.title || book?.name || "Book"}</span>
                      <span className="text-pink-600 text-[10px]">{bookProgress}% Done</span>
                    </div>
                    <div className="w-full bg-pink-100 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-pink-600 h-1.5 rounded-full transition-all duration-300" style={{ width: `${bookProgress}%` }} />
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-500">
                      <span>{isPageBased ? `Page ${maxPageReached} / ${totalPages}` : `Chapters: ${completedChapters.length}/${totalChapters}`}</span>
                      <span className="capitalize text-pink-700 font-medium">{isPageBased ? "Page-based" : "Chapter-based"}</span>
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

          {/* DOCUMENTS & CONTRACT TAB SECTION */}
          <div className="bg-white border border-pink-100 rounded-3xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-pink-100 pb-3">
              <div className="flex items-center gap-2 text-pink-900 font-bold text-sm">
                <FileText size={16} className="text-pink-600" />
                <span>Welcome Card & Contract</span>
              </div>
              <span className="text-[10px] font-bold text-pink-600 bg-pink-50 px-2 py-0.5 rounded-md border border-pink-200 uppercase">
                Templates
              </span>
            </div>

            {/* Customization Inputs for Parent, Teacher, Date, Classes, Duration, and Amount */}
            <div className="p-3 bg-pink-50/60 rounded-2xl border border-pink-200 space-y-2.5 text-xs">
              <p className="font-bold text-pink-950 text-[11px] uppercase">Customization Fields</p>
              <div className="grid grid-cols-1 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-gray-600 mb-1">Student's Name / Parent's Name</label>
                  <input
                    type="text"
                    value={customParentName}
                    onChange={(e) => setCustomParentName(e.target.value)}
                    onBlur={(e) => handleSaveCustomName(e.target.value)}
                    className="w-full bg-white border border-pink-200 rounded-xl p-2 text-xs text-gray-800"
                    placeholder="e.g. An Nhien (Chip)"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-600 mb-1">Teacher Name</label>
                    <input
                      type="text"
                      value={customTeacherName}
                      onChange={(e) => setCustomTeacherName(e.target.value)}
                      className="w-full bg-white border border-pink-200 rounded-xl p-2 text-xs text-gray-800"
                      placeholder="e.g. Teacher Gabi"
                    />
                  </div>
                <div>
  <label className="block text-[10px] font-semibold text-gray-600 mb-1">Effective Date</label>
  <DatePicker
    selected={customContractDate ? new Date(customContractDate) : new Date()}
    onChange={(date: Date | null) => {
      if (date) {
        const formatted = date.toISOString().split("T")[0];
        setCustomContractDate(formatted);
      }
    }}
    dateFormat="yyyy-MM-dd"
    className="w-full bg-white border border-pink-200 rounded-xl p-2 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-400"
    wrapperClassName="w-full"
    calendarClassName="pink-datepicker"
  />
</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-600 mb-1">Classes Count</label>
                    <input
                      type="number"
                      value={customClasses}
                      onChange={(e) => setCustomClasses(e.target.value)}
                      className="w-full bg-white border border-pink-200 rounded-xl p-2 text-xs text-gray-800"
                      placeholder="20"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-600 mb-1">Free Classes</label>
                    <input
                      type="number"
                      value={customFreeClasses}
                      onChange={(e) => setCustomFreeClasses(e.target.value)}
                      className="w-full bg-white border border-pink-200 rounded-xl p-2 text-xs text-gray-800"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-600 mb-1">Class Duration (mins)</label>
                    <input
                      type="number"
                      value={customClassDuration}
                      onChange={(e) => setCustomClassDuration(e.target.value)}
                      className="w-full bg-white border border-pink-200 rounded-xl p-2 text-xs text-gray-800"
                      placeholder="40"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-600 mb-1">Payment Amount</label>
                    <input
                      type="text"
                      value={customPaymentAmount}
                      onChange={(e) => setCustomPaymentAmount(e.target.value)}
                      className="w-full bg-white border border-pink-200 rounded-xl p-2 text-xs text-gray-800"
                      placeholder="e.g. 5000"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Welcome Card Sub-card */}
            <div className="p-3.5 bg-pink-50/40 rounded-2xl border border-pink-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-pink-950 flex items-center gap-1.5">
                  <Sparkles size={13} className="text-pink-600" />
                  <span>Welcome Card</span>
                </span>
                <button
                  type="button"
                  onClick={handleCopyWelcome}
                  className="px-2.5 py-1 bg-white hover:bg-pink-100 text-pink-700 rounded-lg text-[10px] font-bold border border-pink-200 transition cursor-pointer flex items-center gap-1 shadow-2xs"
                >
                  {copiedWelcome ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                  <span>{copiedWelcome ? "Copied!" : "Copy Note"}</span>
                </button>
              </div>
              <div className="text-[11px] text-gray-600 h-44 overflow-y-auto font-mono bg-white p-3 rounded-xl border border-pink-100 whitespace-pre-wrap">
                {welcomeCardText}
              </div>
            </div>

            {/* Formal Contract Sub-card */}
            <div className="p-3.5 bg-pink-50/40 rounded-2xl border border-pink-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-pink-950 flex items-center gap-1.5">
                  <FileText size={13} className="text-pink-600" />
                  <span>Tutoring Agreement</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handlePrintContract}
                    className="px-2.5 py-1 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-[10px] font-bold transition cursor-pointer flex items-center gap-1 shadow-2xs"
                  >
                    <span>🖨️ Print / PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyContract}
                    className="px-2.5 py-1 bg-white hover:bg-pink-100 text-pink-700 rounded-lg text-[10px] font-bold border border-pink-200 transition cursor-pointer flex items-center gap-1 shadow-2xs"
                  >
                    {copiedContract ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                    <span>{copiedContract ? "Copied!" : "Copy"}</span>
                  </button>
                </div>
              </div>
              <div className="text-[11px] text-gray-600 h-44 overflow-y-auto font-mono bg-white p-3 rounded-xl border border-pink-100 whitespace-pre-wrap">
                {contractText}
              </div>
            </div>
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
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-white border border-pink-100 rounded-3xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-gray-900">
                  Logged Lessons & Reports
                </h3>
                <span className="px-2 py-0.5 bg-pink-50 text-pink-600 font-bold text-xs rounded-full border border-pink-100">
                  {validReports.length + validLessons.length + completedMakeups.length}
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

            {validReports.length === 0 && validLessons.length === 0 && completedMakeups.length === 0 ? (
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
                {validReports.map((rep) => {
                  const isExpanded = expandedReportIds.includes(rep.id);
                  const matchedBook = books.find((b) => b.id === rep.book_id);

                  return (
                    <div key={rep.id} className="bg-pink-50/30 rounded-2xl border border-pink-100 text-xs transition-all overflow-hidden">
                      <div
                        onClick={() => toggleExpandReport(rep.id)}
                        className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-pink-100/40 select-none transition"
                      >
                        <div className="flex items-center gap-2">
                          <button type="button" className="p-1 rounded-lg text-pink-600 bg-white border border-pink-200 shadow-2xs">
                            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          </button>
                          <h4 className="font-bold text-pink-950 text-xs">{rep.lesson_title || rep.title || "Class Report"}</h4>
                        </div>

                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <span className="text-[11px] font-mono text-gray-500">{rep.report_date?.substring(0, 10)}</span>
                          <button
                            type="button"
                            onClick={() => handlePrintLessonReport({
                              title: rep.lesson_title || rep.title || "Class Report",
                              date: rep.report_date?.substring(0, 10) || "",
                              studentName: parentOrStudentName,
                              teacherAlias: teacherName,
                              bookTitle: books.find((b) => b.id === rep.book_id)?.title,
                              vocabulary: rep.vocabulary,
                              strengths: rep.strengths,
                              improvements: rep.improvements,
                              homework: rep.homework,
                              teacherMessage: rep.teacher_message || rep.message || rep.teacher_notes,
                            })}
                            className="px-2 py-1 bg-pink-50 hover:bg-pink-100 text-pink-700 text-[10px] font-bold rounded-lg border border-pink-200 transition cursor-pointer"
                            title="Print Report"
                          >
                            🖨️ Print
                          </button>
                          <button onClick={() => handleOpenEditReport(rep)} className="text-gray-400 hover:text-pink-600 p-1 cursor-pointer">
                            <Edit2 size={13} />
                          </button>
                          <button onClick={() => handleDeleteReport(rep.id, rep.homework_file_url)} className="text-gray-400 hover:text-red-600 p-1 cursor-pointer">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="px-4 pb-4 pt-1 border-t border-pink-100/60 space-y-2.5 bg-white/50">
                          {matchedBook && (
                            <div className="pt-1">
                              <span className="text-[10px] font-bold text-pink-800 bg-pink-100/70 px-2.5 py-0.5 rounded-lg border border-pink-200">
                                📖 {matchedBook.title}: p. {rep.start_page || 1} - {rep.end_page || "N/A"}
                              </span>
                            </div>
                          )}

                          {rep.vocabulary && (
                            <div className="p-2.5 bg-white rounded-xl border border-pink-100">
                              <p className="font-bold text-gray-900 text-[11px] mb-0.5">✨ Vocabulary & Structures:</p>
                              <p className="text-gray-700 font-mono text-xs whitespace-pre-wrap">{rep.vocabulary}</p>
                            </div>
                          )}

                          {(rep.strengths || rep.improvements) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {rep.strengths && (
                                <div className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-100">
                                  <p className="font-bold text-emerald-900 text-[11px] mb-0.5">🏆 Strengths & Highlights:</p>
                                  <p className="text-emerald-950 text-xs whitespace-pre-wrap">{rep.strengths}</p>
                                </div>
                              )}
                              {rep.improvements && (
                                <div className="p-2.5 bg-amber-50/60 rounded-xl border border-amber-100">
                                  <p className="font-bold text-amber-900 text-[11px] mb-0.5">📈 Next Focus / Tips:</p>
                                  <p className="text-amber-950 text-xs whitespace-pre-wrap">{rep.improvements}</p>
                                </div>
                              )}
                            </div>
                          )}

                          {(rep.homework || rep.homework_file_url) && (
                            <div className="p-3 bg-pink-100/50 rounded-xl border border-pink-200 space-y-1.5">
                              <p className="font-bold text-pink-950 text-[11px]">📚 Assigned Homework:</p>
                              {rep.homework && <p className="text-gray-800 text-xs whitespace-pre-wrap">{rep.homework}</p>}
                              {rep.homework_file_url && (
                                <a
                                  href={rep.homework_file_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-white text-pink-700 font-bold rounded-lg text-[10px] border border-pink-200 hover:bg-pink-50"
                                >
                                  📄 View Attached Worksheet
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {validLessons.map((les: any) => {
                  const isExpanded = expandedReportIds.includes(les.id);
                  const text = les.description || "";

                  const vocabMatch = text.match(/Vocab[:\-]?\s*([\s\S]*?)(?=\n(?:Strengths|Improvements|Homework):|$)/i);
                  const strengthsMatch = text.match(/Strengths[:\-]?\s*([\s\S]*?)(?=\n(?:Vocab|Improvements|Homework):|$)/i);
                  const improvementsMatch = text.match(/(?:Improvements|Next Focus)[:\-]?\s*([\s\S]*?)(?=\n(?:Vocab|Strengths|Homework):|$)/i);
                  const homeworkMatch = text.match(/Homework[:\-]?\s*([\s\S]*?)(?=\n(?:Message|Vocab|Strengths|Improvements):|$)/i);

                  const displayVocab = les.vocab_notes || les.vocabulary || (vocabMatch ? vocabMatch[1].trim() : "");
                  const displayStrengths = les.strengths_notes || les.strengths || (strengthsMatch ? strengthsMatch[1].trim() : "");
                  const displayImprovements = les.improvement_notes || les.improvements || (improvementsMatch ? improvementsMatch[1].trim() : "");
                  const displayHomework = les.homework_notes || les.homework || (homeworkMatch ? homeworkMatch[1].trim() : "");

                  const fallbackMain = !displayStrengths && !displayImprovements && !displayVocab ? text : "";

                  return (
                    <div key={les.id} className="bg-pink-50/30 rounded-2xl border border-pink-100 text-xs transition-all overflow-hidden">
                      <div
                        onClick={() => toggleExpandReport(les.id)}
                        className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-pink-100/40 select-none transition"
                      >
                        <div className="flex items-center gap-2">
                          <button type="button" className="p-1 rounded-lg text-pink-600 bg-white border border-pink-200 shadow-2xs">
                            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          </button>
                          <h4 className="font-bold text-pink-950 text-xs">{les.title || "Lesson Log"}</h4>
                        </div>

                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <span className="text-[11px] font-mono text-gray-500">
                            {les.lesson_date?.substring(0, 10)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handlePrintLessonReport({
                              title: les.title || "Lesson Log",
                              date: les.lesson_date?.substring(0, 10) || "",
                              studentName: parentOrStudentName,
                              teacherAlias: teacherName,
                              vocabulary: displayVocab,
                              strengths: displayStrengths,
                              improvements: displayImprovements,
                              homework: displayHomework,
                              teacherMessage: les.teacher_message || les.message || les.teacher_notes,
                            })}
                            className="px-2 py-1 bg-pink-50 hover:bg-pink-100 text-pink-700 text-[10px] font-bold rounded-lg border border-pink-200 transition cursor-pointer"
                            title="Print Lesson"
                          >
                            🖨️ Print
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLesson({
                                eventId: les.id,
                                studentId: student.id,
                                studentName: parentOrStudentName,
                                type: "regular",
                                dateString: les.lesson_date,
                              });
                            }}
                            className="px-2.5 py-1 bg-pink-50 hover:bg-pink-100 text-pink-700 text-[10px] font-bold rounded-lg border border-pink-200 transition cursor-pointer flex items-center gap-1"
                          >
                            ✏️ Edit
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="px-4 pb-4 pt-1 border-t border-pink-100/60 space-y-2.5 bg-white/50">
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

                          {displayVocab && (
                            <div className="p-2.5 bg-white rounded-xl border border-pink-100">
                              <p className="font-bold text-gray-900 text-[11px] mb-0.5">✨ Vocabulary & Structures:</p>
                              <p className="text-gray-700 font-mono text-xs whitespace-pre-wrap">{displayVocab}</p>
                            </div>
                          )}

                          {(displayStrengths || displayImprovements) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {displayStrengths && (
                                <div className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-100">
                                  <p className="font-bold text-emerald-900 text-[11px] mb-0.5">🏆 Strengths & Highlights:</p>
                                  <p className="text-emerald-950 text-xs whitespace-pre-wrap">{displayStrengths}</p>
                                </div>
                              )}
                              {displayImprovements && (
                                <div className="p-2.5 bg-amber-50/60 rounded-xl border border-amber-100">
                                  <p className="font-bold text-amber-900 text-[11px] mb-0.5">📈 Next Focus / Tips:</p>
                                  <p className="text-amber-950 text-xs whitespace-pre-wrap">{displayImprovements}</p>
                                </div>
                              )}
                            </div>
                          )}

                          {fallbackMain && (
                            <div className="p-3 bg-white rounded-xl border border-pink-100">
                              <p className="font-bold text-gray-900 text-[11px] mb-0.5">📝 Teacher Feedback & Notes:</p>
                              <p className="text-gray-800 text-xs whitespace-pre-wrap leading-relaxed">{fallbackMain}</p>
                            </div>
                          )}

                          {les.teacher_message && (
                            <div className="p-3 bg-pink-50/70 rounded-xl border border-pink-200 space-y-1">
                              <p className="font-bold text-pink-950 text-[11px]">💌 Message from Teacher:</p>
                              <p className="text-gray-800 text-xs whitespace-pre-wrap">{les.teacher_message}</p>
                            </div>
                          )}

                          {(displayHomework || les.homework_file_url || les.homework_submission_url) && (
                            <div className="p-3 bg-pink-100/50 rounded-xl border border-pink-200 space-y-1.5">
                              <p className="font-bold text-pink-950 text-[11px]">📚 Assigned Homework:</p>
                              {displayHomework && <p className="text-gray-800 text-xs whitespace-pre-wrap">{displayHomework}</p>}
                              
                              {les.homework_file_url && (
                                <div>
                                  <a
                                    href={les.homework_file_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border-2 border-pink-300 text-pink-800 font-bold rounded-lg text-[10px] hover:bg-pink-50 transition shadow-2xs"
                                  >
                                    <span>📄 View Teacher Worksheet / Page</span>
                                  </a>
                                </div>
                              )}

                              {les.homework_submission_url && (
                                <div className="pt-2 border-t border-pink-300/80 flex items-center gap-2">
                                  <span className="text-xs text-emerald-800 font-bold">Completed File:</span>
                                  <a
                                    href={les.homework_submission_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs text-pink-700 font-bold underline hover:text-pink-800"
                                  >
                                    View Submitted Homework
                                  </a>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {completedMakeups.map((mc: any) => {
                  const isExpanded = expandedReportIds.includes(mc.id);
                  const matchedBook = books.find((b) => b.id === mc.book_id);
                  const text = mc.notes || "";

                  const vocabMatch = text.match(/Vocab[:\-]?\s*([\s\S]*?)(?=\n(?:Strengths|Improvements|Homework):|$)/i);
                  const strengthsMatch = text.match(/Strengths[:\-]?\s*([\s\S]*?)(?=\n(?:Vocab|Improvements|Homework):|$)/i);
                  const improvementsMatch = text.match(/(?:Improvements|Next Focus)[:\-]?\s*([\s\S]*?)(?=\n(?:Vocab|Strengths|Homework):|$)/i);
                  const homeworkMatch = text.match(/Homework[:\-]?\s*([\s\S]*?)(?=\n(?:Message|Vocab|Strengths|Improvements):|$)/i);

                  const displayVocab = vocabMatch ? vocabMatch[1].trim() : "";
                  const displayStrengths = strengthsMatch ? strengthsMatch[1].trim() : "";
                  const displayImprovements = improvementsMatch ? improvementsMatch[1].trim() : "";
                  const displayHomework = homeworkMatch ? homeworkMatch[1].trim() : "";
                  const fallbackMain = !displayStrengths && !displayImprovements && !displayVocab ? text : "";

                  return (
                    <div key={mc.id} className="bg-pink-50/30 rounded-2xl border border-pink-100 text-xs transition-all overflow-hidden">
                      <div
                        onClick={() => toggleExpandReport(mc.id)}
                        className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-pink-100/40 select-none transition"
                      >
                        <div className="flex items-center gap-2">
                          <button type="button" className="p-1 rounded-lg text-pink-600 bg-white border border-pink-200 shadow-2xs">
                            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          </button>
                          <h4 className="font-bold text-pink-950 text-xs">⭐ Makeup Class: {mc.topic || mc.title || "Makeup Session"}</h4>
                        </div>

                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <span className="text-[11px] font-mono text-gray-500">
                            {(mc.makeup_date || mc.date || "").substring(0, 10)}
                          </span>
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold text-[10px] rounded-md uppercase border border-emerald-200">
                            {mc.status || "Attended"}
                          </span>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="px-4 pb-4 pt-1 border-t border-pink-100/60 space-y-2.5 bg-white/50">
                          {matchedBook && (
                            <div className="pt-1">
                              <span className="text-[10px] font-bold text-pink-800 bg-pink-100/70 px-2.5 py-0.5 rounded-lg border border-pink-200">
                                📖 {matchedBook.title}
                              </span>
                            </div>
                          )}

                          {displayVocab && (
                            <div className="p-2.5 bg-white rounded-xl border border-pink-100">
                              <p className="font-bold text-gray-900 text-[11px] mb-0.5">✨ Vocabulary & Structures:</p>
                              <p className="text-gray-700 font-mono text-xs whitespace-pre-wrap">{displayVocab}</p>
                            </div>
                          )}

                          {(displayStrengths || displayImprovements) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {displayStrengths && (
                                <div className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-100">
                                  <p className="font-bold text-emerald-900 text-[11px] mb-0.5">🏆 Strengths & Highlights:</p>
                                  <p className="text-emerald-950 text-xs whitespace-pre-wrap">{displayStrengths}</p>
                                </div>
                              )}
                              {displayImprovements && (
                                <div className="p-2.5 bg-amber-50/60 rounded-xl border border-amber-100">
                                  <p className="font-bold text-amber-900 text-[11px] mb-0.5">📈 Next Focus / Tips:</p>
                                  <p className="text-amber-950 text-xs whitespace-pre-wrap">{displayImprovements}</p>
                                </div>
                              )}
                            </div>
                          )}

                          {fallbackMain && (
                            <div className="p-3 bg-white rounded-xl border border-pink-100">
                              <p className="font-bold text-gray-900 text-[11px] mb-0.5">📝 Makeup Notes:</p>
                              <p className="text-gray-800 text-xs whitespace-pre-wrap leading-relaxed">{fallbackMain}</p>
                            </div>
                          )}

                          {displayHomework && (
                            <div className="p-3 bg-pink-100/50 rounded-xl border border-pink-200 space-y-1.5">
                              <p className="font-bold text-pink-950 text-[11px]">📚 Assigned Homework:</p>
                              <p className="text-gray-800 text-xs whitespace-pre-wrap">{displayHomework}</p>
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

      {/* RENEWAL INVOICE & PARENT NOTICE MODAL */}
      {isRenewalModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl p-6 rounded-3xl shadow-2xl space-y-5 border border-pink-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-pink-100 pb-3">
              <div>
                <h2 className="text-lg font-extrabold text-pink-950">Package Renewal & Invoice</h2>
                <p className="text-xs text-pink-700/80">Generate a renewal notice message and printable invoice for {parentOrStudentName}.</p>
              </div>
              <button onClick={() => setIsRenewalModalOpen(false)} className="p-2 rounded-full hover:bg-pink-50 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block mb-1 font-semibold text-gray-700">Parent / Guardian Name</label>
                <input
                  type="text"
                  className="w-full border border-pink-200 rounded-xl p-2.5 bg-white text-gray-800"
                  value={renewalParentName}
                  onChange={(e) => setRenewalParentName(e.target.value)}
                  onBlur={(e) => handleSaveParentName(e.target.value)}
                  placeholder="e.g. Mommy Sarah"
                />
              </div>
              <div>
                <label className="block mb-1 font-semibold text-gray-700">Renewal Classes Count</label>
                <input
                  type="number"
                  className="w-full border border-pink-200 rounded-xl p-2.5 bg-white text-gray-800"
                  value={renewalClassesCount}
                  onChange={(e) => setRenewalClassesCount(e.target.value)}
                />
              </div>
              <div>
                <label className="block mb-1 font-semibold text-gray-700">Free Bonus Classes</label>
                <input
                  type="number"
                  className="w-full border border-pink-200 rounded-xl p-2.5 bg-white text-gray-800"
                  value={renewalFreeCount}
                  onChange={(e) => setRenewalFreeCount(e.target.value)}
                />
              </div>
              <div>
                <label className="block mb-1 font-semibold text-gray-700">Tuition Fee Amount</label>
                <input
                  type="text"
                  className="w-full border border-pink-200 rounded-xl p-2.5 bg-white text-gray-800"
                  value={renewalRate}
                  onChange={(e) => setRenewalRate(e.target.value)}
                />
              </div>
            <div>
            <label className="block mb-1 font-semibold text-gray-700">Class Duration (minutes)</label>
            <input
              type="text"
              className="w-full border border-pink-200 rounded-xl p-2.5 bg-white text-gray-800"
              value={renewalDuration}
              onChange={(e) => setRenewalDuration(e.target.value)}
            />
          </div>
          <div>
            <label className="block mb-1 font-semibold text-gray-700">Target Start Date</label>
            <DatePicker
              selected={renewalStartDate ? new Date(renewalStartDate) : new Date()}
              onChange={(date: Date | null) => {
                if (date) {
                  const formatted = date.toISOString().split("T")[0];
                  setRenewalStartDate(formatted);
                }
              }}
              dateFormat="yyyy-MM-dd"
              className="w-full bg-white border border-pink-200 rounded-xl p-2.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-400"
              wrapperClassName="w-full"
              calendarClassName="pink-datepicker"
            />
          </div>
              <div className="md:col-span-2">
                <label className="block mb-1 font-semibold text-gray-700">Thank You / Payment Message</label>
                <textarea
                  rows={3}
                  className="w-full border border-pink-200 rounded-xl p-2.5 bg-white text-gray-800 text-xs"
                  value={renewalThankYouMessage}
                  onChange={(e) => setRenewalThankYouMessage(e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block mb-1 font-semibold text-gray-700">Bank Account Details (Optional)</label>
                <textarea
                  rows={2}
                  className="w-full border border-pink-200 rounded-xl p-2.5 bg-white text-gray-800 text-xs font-mono"
                  value={renewalBankDetails}
                  onChange={(e) => setRenewalBankDetails(e.target.value)}
                  placeholder="e.g. Bank Name: BPI / KBANK&#10;Account Name: Teacher Gabi&#10;Account Number: 1234-5678-90"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block mb-1 font-semibold text-gray-700">Payment QR Code (Optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setRenewalQrCode(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="w-full border border-pink-200 rounded-xl p-2 bg-white text-gray-800 text-xs file:mr-4 file:py-1 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-pink-50 file:text-pink-700 hover:file:bg-pink-100 cursor-pointer"
                />
                {renewalQrCode && (
                  <div className="mt-2 flex items-center gap-3">
                    <img src={renewalQrCode} alt="QR Preview" className="w-16 h-16 object-cover rounded-xl border border-pink-200 shadow-sm" />
                    <button
                      type="button"
                      onClick={() => setRenewalQrCode("")}
                      className="text-xs text-red-600 hover:text-red-700 font-semibold cursor-pointer"
                    >
                      Remove QR Image
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Printable Invoice Element for PDF Download (High Resolution) */}
            <div style={{ position: "absolute", left: "-9999px", top: 0, width: "800px", backgroundColor: "#ffffff", color: "#111827" }}>
              <div 
                ref={invoicePdfRef} 
                style={{ 
                  padding: "45px", 
                  fontFamily: "Helvetica, Arial, sans-serif", 
                  backgroundColor: "#ffffff", 
                  color: "#111827",
                  boxSizing: "border-box"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "3px solid #db2777", paddingBottom: "16px", marginBottom: "24px" }}>
                  <div>
                    <h1 style={{ fontSize: "24px", fontWeight: "900", color: "#db2777", margin: "0 0 4px 0", textTransform: "uppercase" }}>
                      Invoice & Renewal Notice
                    </h1>
                    <p style={{ fontSize: "12px", color: "#4b5563", margin: 0, fontWeight: "600" }}>
                      Private English Tutoring Services
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: "11px", color: "#6b7280", margin: 0 }}>Instructor: <strong>{teacherName}</strong></p>
                    <p style={{ fontSize: "11px", color: "#6b7280", margin: "2px 0 0 0" }}>Date: {new Date().toLocaleDateString()}</p>
                  </div>
                </div>

                <div style={{ marginBottom: "24px", padding: "16px", backgroundColor: "#fdf2f8", borderRadius: "10px", border: "1px solid #fbcfe8" }}>
                  <p style={{ fontSize: "10px", fontWeight: "bold", color: "#9d174d", textTransform: "uppercase", margin: "0 0 4px 0" }}>Billed To:</p>
                  <p style={{ fontSize: "15px", fontWeight: "bold", color: "#111827", margin: "0 0 2px 0" }}>{parentOrStudentName}</p>
                  <p style={{ fontSize: "11px", color: "#4b5563", margin: 0 }}>Country: {student?.country || "International"} {student?.age ? `• Age: ${student.age}` : ""}</p>
                </div>

                <div style={{ marginBottom: "24px", border: "1px solid #e5e7eb", borderRadius: "10px", overflow: "hidden" }}>
                  <div style={{ backgroundColor: "#f9fafb", padding: "10px 16px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: "bold", color: "#374151", textTransform: "uppercase" }}>
                    <span>Package Description</span>
                    <span>Amount</span>
                  </div>
                  <div style={{ padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px" }}>
                    <div>
                      <p style={{ fontWeight: "bold", color: "#111827", margin: "0 0 4px 0" }}>
                        English Class Package ({renewalClassesCount} Classes{Number(renewalFreeCount) > 0 ? ` + ${renewalFreeCount} Free` : ""})
                      </p>
                      <p style={{ fontSize: "11px", color: "#6b7280", margin: 0 }}>
                        Duration: {renewalDuration} minutes per session • Target Start: {renewalStartDate}
                      </p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: "16px", fontWeight: "900", color: "#db2777" }}>
                        {formattedRenewRate} {student?.payment_currency || "PHP"}
                      </span>
                    </div>
                  </div>
                </div>

                {renewalCustomNotes && (
                  <div style={{ marginBottom: "20px", padding: "14px", backgroundColor: "#fffbeb", border: "1px solid #fde68a", borderRadius: "10px" }}>
                    <p style={{ fontSize: "11px", fontWeight: "bold", color: "#b45309", margin: "0 0 4px 0" }}>Important Notes:</p>
                    <p style={{ fontSize: "11px", color: "#374151", margin: 0, whiteSpace: "pre-wrap" }}>{renewalCustomNotes}</p>
                  </div>
                )}

                <div style={{ display: "flex", gap: "20px", marginBottom: "30px", padding: "18px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: "13px", fontWeight: "bold", color: "#0f172a", margin: "0 0 8px 0" }}>
                      💳 Payment Instructions
                    </h3>
                    <p style={{ fontSize: "11px", color: "#475569", lineHeight: "1.5", margin: "0 0 10px 0", whiteSpace: "pre-wrap" }}>
                      {renewalThankYouMessage}
                    </p>

                    {renewalBankDetails && (
                      <div style={{ marginTop: "8px", padding: "10px", backgroundColor: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "8px" }}>
                        <p style={{ fontSize: "10px", fontWeight: "bold", color: "#334155", margin: "0 0 2px 0" }}>Bank Transfer Details:</p>
                        <p style={{ fontSize: "11px", fontFamily: "monospace", color: "#0f172a", margin: 0, whiteSpace: "pre-wrap" }}>{renewalBankDetails}</p>
                      </div>
                    )}

                    {renewalQrCode && (
                      <div style={{ marginTop: "12px", textAlign: "center" }}>
                        <p style={{ fontSize: "10px", fontWeight: "bold", color: "#334155", margin: "0 0 6px 0" }}>Scan to Pay:</p>
                        <img src={renewalQrCode} alt="Payment QR" style={{ width: "110px", height: "110px", objectFit: "cover", borderRadius: "8px", border: "1px solid #cbd5e1", margin: "0 auto" }} />
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ paddingTop: "16px", borderTop: "1px solid #e5e7eb", textAlign: "center" }}>
                  <p style={{ fontSize: "11px", fontWeight: "bold", color: "#374151", margin: "0 0 2px 0" }}>If payment has been made already, kindly disregard this notice.</p>
                  <p style={{ fontSize: "10px", color: "#9ca3af", margin: 0 }}>After remitting the payment, please send a screenshot confirmation. Thank you!</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-pink-100">
              <button
                type="button"
                onClick={handleCopyRenewalMessage}
                className="px-4 py-2.5 bg-pink-50 hover:bg-pink-100 text-pink-700 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                {copiedRenewalNotice ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                <span>{copiedRenewalNotice ? "Notice Copied!" : "Copy Parent Message"}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadInvoicePdf}
                  disabled={isGeneratingPdf}
                  className="px-4 py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Download size={14} />
                  <span>{isGeneratingPdf ? "Generating PDF..." : "Download Invoice PDF"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ASSIGN BOOKS MODAL */}
      {isBookModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="card bg-white w-full max-w-md p-6 rounded-3xl shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-pink-600">Assign Books</h2>
              <button onClick={() => setIsBookModalOpen(false)} className="p-2 rounded-full hover:bg-pink-50 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {books.map((b) => {
                const isAssigned = studentBooks.some((sb) => sb.book_id === b.id);
                return (
                  <div key={b.id} className="flex items-center justify-between p-3 bg-pink-50/50 rounded-xl border border-pink-100 text-xs">
                    <span className="font-bold text-gray-800">📖 {b.title}</span>
                    <button
                      type="button"
                      onClick={async () => {
                        if (isAssigned) {
                          await supabase.from("student_books").delete().eq("student_id", studentId).eq("book_id", b.id);
                        } else {
                          await supabase.from("student_books").insert({ student_id: studentId, book_id: b.id });
                        }
                        const { data: sbList } = await supabase.from("student_books").select("*, books(*)").eq("student_id", studentId);
                        if (sbList) setStudentBooks(sbList);
                      }}
                      className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                        isAssigned ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100" : "bg-pink-600 text-white hover:bg-pink-700"
                      }`}
                    >
                      {isAssigned ? "Remove" : "Assign"}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-3 border-t border-pink-100">
              <button
                onClick={() => setIsBookModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-pink-600 text-white text-xs font-bold hover:bg-pink-700 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT STUDENT MODAL */}
      {isEditModalOpen && (
        <StudentEditModal
          student={student}
          onClose={() => setIsEditModalOpen(false)}
          onSave={handleUpdateStudent}
          books={books}
          selectedBookIds={selectedBookIds}
          setSelectedBookIds={setSelectedBookIds}
          teacherAliases={teacherAliases}
          name={name}
          setName={setName}
          teacherAlias={teacherAlias}
          setTeacherAlias={setTeacherAlias}
          meetingLink={meetingLink}
          setMeetingLink={setMeetingLink}
          email={email}
          setEmail={setEmail}
          phone={phone}
          setPhone={setPhone}
          age={age}
          setAge={setAge}
          country={country}
          setCountry={setCountry}
          paymentCurrency={paymentCurrency}
          setPaymentCurrency={setPaymentCurrency}
          paymentAmount={paymentAmount}
          setPaymentAmount={setPaymentAmount}
          phpEquivalent={phpEquivalent}
          classesIncluded={classesIncluded}
          setClassesIncluded={setClassesIncluded}
          freeClasses={freeClasses}
          setFreeClasses={setFreeClasses}
          classesCompleted={classesCompleted}
          setClassesCompleted={setClassesCompleted}
          classDuration={classDuration}
          setClassDuration={setClassDuration}
          paymentStatus={paymentStatus}
          setPaymentStatus={setPaymentStatus}
          notes={notes}
          setNotes={setNotes}
        />
      )}

      {/* SCHEDULE MODAL */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="card bg-white w-full max-w-md p-6 rounded-3xl shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-pink-600">Add Schedule</h2>
              <button onClick={() => setIsScheduleModalOpen(false)} className="p-2 rounded-full hover:bg-pink-50 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSchedule} className="space-y-4 text-xs">
              <div>
                <label className="block mb-1 font-semibold text-gray-700">Days of the Week *</label>
                <div className="grid grid-cols-2 gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <label key={day} className="flex items-center gap-2 p-2 bg-pink-50/50 rounded-xl border border-pink-100 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={scheduleDays.includes(day)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setScheduleDays([...scheduleDays, day]);
                          } else {
                            setScheduleDays(scheduleDays.filter((d) => d !== day));
                          }
                        }}
                        className="rounded text-pink-600 focus:ring-pink-500"
                      />
                      <span className="font-medium text-gray-800">{day}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-semibold text-gray-700">Start Time *</label>
                  <input
                    type="time"
                    className="input w-full border border-gray-200 rounded-xl p-2.5 bg-white text-gray-800"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    required
                  />
                </div>
                
                <div>
                  <label className="block mb-1 font-semibold text-gray-700">Duration (mins)</label>
                  <select
                    className="input w-full border border-gray-200 rounded-xl p-2.5 bg-white text-gray-800"
                    value={scheduleDuration}
                    onChange={(e) => setScheduleDuration(e.target.value)}
                  >
                    <option value="25">25 mins</option>
                    <option value="40">40 mins</option>
                    <option value="50">50 mins</option>
                    <option value="60">60 mins</option>
                    <option value="90">90 mins</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block mb-1 font-semibold text-gray-700">Topic / Label</label>
                <input
                  type="text"
                  className="input w-full border border-gray-200 rounded-xl p-2.5 bg-white text-gray-800"
                  value={scheduleTopic}
                  onChange={(e) => setScheduleTopic(e.target.value)}
                  placeholder="Regular Class"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-pink-100">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingSchedule}
                  className="px-5 py-2 rounded-xl bg-pink-600 text-white font-bold hover:bg-pink-700 cursor-pointer disabled:opacity-50"
                >
                  {isSavingSchedule ? "Saving..." : "Add Schedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT SCHEDULE MODAL */}
      {editingSchedule && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="card bg-white w-full max-w-md p-6 rounded-3xl shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-pink-600">Edit Schedule Slot</h2>
              <button onClick={() => setEditingSchedule(null)} className="p-2 rounded-full hover:bg-pink-50 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateSchedule} className="space-y-4 text-xs">
              <div>
                <label className="block mb-1 font-semibold text-gray-700">Day of the Week *</label>
                <select
                  className="input w-full border border-gray-200 rounded-xl p-2.5 bg-white text-gray-800"
                  value={editDayOfWeek}
                  onChange={(e) => setEditDayOfWeek(e.target.value)}
                  required
                >
                  {DAYS_OF_WEEK.map((day) => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-semibold text-gray-700">Start Time *</label>
                  <input
                    type="time"
                    className="input w-full border border-gray-200 rounded-xl p-2.5 bg-white text-gray-800"
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-gray-700">Duration (mins)</label>
                  <select
                    className="input w-full border border-gray-200 rounded-xl p-2.5 bg-white text-gray-800"
                    value={editDuration}
                    onChange={(e) => setEditDuration(Number(e.target.value))}
                  >
                    <option value={25}>25 mins</option>
                    <option value={40}>40 mins</option>
                    <option value={50}>50 mins</option>
                    <option value={60}>60 mins</option>
                    <option value={90}>90 mins</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-pink-100">
                <button
                  type="button"
                  onClick={() => setEditingSchedule(null)}
                  className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingSchedule}
                  className="px-5 py-2 rounded-xl bg-pink-600 text-white font-bold hover:bg-pink-700 cursor-pointer disabled:opacity-50"
                >
                  {isUpdatingSchedule ? "Saving..." : "Update Schedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lesson Log Modal for Editing */}
      {selectedLesson && (
        <LessonLogModal
          isOpen={true}
          onClose={() => {
            setSelectedLesson(null);
            fetchStudentData();
          }}
          eventId={selectedLesson.eventId}
          studentId={selectedLesson.studentId}
          studentName={parentOrStudentName}
          eventType={selectedLesson.type}
          dateString={selectedLesson.dateString}
          studentBooks={studentBooks.map((sb: any) => sb.books || sb)}
        />
      )}
    </div>
  );
}