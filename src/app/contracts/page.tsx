"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { currencies } from "@/constants/currencies";
import { countries } from "@/constants/countries";
import QRCode from "qrcode";
import {
  FileText,
  Sparkles,
  Download,
  Copy,
  Check,
  X,
} from "lucide-react";

export default function ContractsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [selectedStudentForAgreement, setSelectedStudentForAgreement] = useState<any | null>(null);
  const [selectedStudentForWelcome, setSelectedStudentForWelcome] = useState<any | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [copiedChat, setCopiedChat] = useState(false);

  // Form custom fields
  const [teacherName, setTeacherName] = useState("Teacher Gabi");
  const [parentName, setParentName] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [meetingLink, setMeetingLink] = useState("");
  const [classroomPlatform, setClassroomPlatform] = useState("Google Meet");
  const [portalUrl, setPortalUrl] = useState("");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");

  const agreementPdfRef = useRef<HTMLDivElement>(null);
  const welcomePdfRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    try {
      const [{ data: studentsData }, { data: schedulesData }] = await Promise.all([
        supabase.from("students").select("*").order("name", { ascending: true }),
        supabase.from("schedules").select("*"),
      ]);

      if (studentsData) setStudents(studentsData);
      if (schedulesData) setSchedules(schedulesData);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Generate QR code pointing to the Student Portal URL
  useEffect(() => {
    const linkToEncode = portalUrl.trim() || meetingLink.trim();
    if (linkToEncode && linkToEncode.startsWith("http")) {
      QRCode.toDataURL(linkToEncode, {
        width: 180,
        margin: 1,
        color: {
          dark: "#1f2937",
          light: "#ffffff",
        },
      })
        .then((url) => setQrCodeDataUrl(url))
        .catch(() => setQrCodeDataUrl(""));
    } else {
      setQrCodeDataUrl("");
    }
  }, [portalUrl, meetingLink]);

  // Helper to format schedules with multiple column fallbacks
  function getStudentSchedules(student: any) {
    if (!student) return "Schedule to be confirmed";

    const studentId = typeof student === "string" ? student : student.id;
    const list = schedules.filter((s) => s.student_id === studentId);

    if (list && list.length > 0) {
      return list
        .map((s) => {
          const day = s.day_of_week || s.day || "Day";
          const rawTime = s.schedule_time || s.start_time || s.time || s.class_time || "";
          return rawTime && rawTime !== "undefined" ? `${day} at ${rawTime}` : day;
        })
        .join(", ");
    }

    if (student.schedule) return student.schedule;
    if (student.preferred_days || student.preferred_time) {
      const days = student.preferred_days || "";
      const time = student.preferred_time ? ` at ${student.preferred_time}` : "";
      return `${days}${time}`.trim();
    }

    return "Schedule to be confirmed";
  }

  // Handle Formal Agreement Modal
  function handleOpenAgreement(student: any) {
    setSelectedStudentForAgreement(student);
    setTeacherName(student.teacher_alias || "Teacher Gabi");
    setParentName(student.parent_name || `${student.name}'s Parent`);
    setStartDate(student.contract_start_date || student.start_date || new Date().toISOString().split("T")[0]);
    setMeetingLink(student.meeting_link || "");
    setClassroomPlatform(student.classroom_platform || "Google Meet");

    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const portal = student.access_token
      ? `${origin}/portal/${student.access_token}`
      : student.meeting_link || "";
    setPortalUrl(portal);
  }

  // Handle Informal Welcome Card Modal
  function handleOpenWelcome(student: any) {
    setSelectedStudentForWelcome(student);
    setTeacherName(student.teacher_alias || "Teacher Gabi");
    setMeetingLink(student.meeting_link || "");
    setClassroomPlatform(student.classroom_platform || "Google Meet");
    setCopiedChat(false);

    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const portal = student.access_token
      ? `${origin}/portal/${student.access_token}`
      : student.meeting_link || "";
    setPortalUrl(portal);
  }

  // Safe PDF Exporter
  async function downloadPdf(
    elementRef: React.RefObject<HTMLDivElement | null>,
    filename: string,
    format: "a4" | "a5" = "a5"
  ) {
    if (!elementRef.current) return;
    setIsGeneratingPdf(true);

    try {
      // @ts-ignore
      const html2pdf = (await import("html2pdf.js")).default;
      const element = elementRef.current;
      const opt = {
        margin: format === "a4" ? 10 : 8,
        filename: `${filename}.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
        },
        jsPDF: { unit: "mm" as const, format, orientation: "portrait" as const },
      };

      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error("PDF export error:", err);
      alert("An issue occurred while generating the PDF. Please try again.");
    } finally {
      setIsGeneratingPdf(false);
    }
  }

  function handleCopyChatText(student: any) {
    const sched = getStudentSchedules(student);
    const activeLink = meetingLink || student.meeting_link || "Link available inside your Student Portal";
    const pUrl = portalUrl || (student.access_token ? `${window.location.origin}/portal/${student.access_token}` : "");

    const text =
      `🌟 Welcome to Class with ${teacherName}! 🌟\n\n` +
      `👤 Student: ${student.name}\n` +
      `📚 Package: ${Number(student?.classes_included || 5) + Number(student?.free_classes || 1)} Classes (${student?.class_duration || 40} mins each)\n` +
      `🗓 Schedule: ${sched}\n` +
      `💻 Classroom Platform: ${classroomPlatform}\n` +
      `🔗 Direct Class Link: ${activeLink}\n` +
      (pUrl ? `📱 Student & Parent Learning Hub: ${pUrl}\n\n` : `\n`) +
      `✨ What you can do inside your Learning Portal:\n` +
      `• 🚀 1-Click Classroom Launch\n` +
      `• 📊 Track Remaining Lessons & Package Progress\n` +
      `• 📝 View Daily Lesson Reports & Homework\n` +
      `• 💬 Submit Special Study Requests directly to teacher\n\n` +
      `✨ Flexible Rescheduling Policy:\n` +
      `If you ever need to reschedule a class, simply message me in advance and we will easily arrange a makeup session!\n\n` +
      `Looking forward to wonderful learning sessions! 🚀`;

    navigator.clipboard.writeText(text);
    setCopiedChat(true);
    setTimeout(() => setCopiedChat(false), 2500);
  }

  return (
    <div className="flex flex-col min-h-screen bg-pink-50/20">
      <div className="p-8 space-y-6 flex-1 max-w-7xl w-full mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-pink-600">Student Agreements & Onboarding</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Generate official contract agreements or friendly welcome cards linked directly to student learning hubs.
            </p>
          </div>
        </div>

        {/* Student Cards List */}
        {loading ? (
          <div className="p-12 text-center text-pink-600 font-medium">Loading contracts & packages...</div>
        ) : students.length === 0 ? (
          <div className="bg-white border border-pink-100 rounded-3xl p-12 text-center text-gray-400 text-xs">
            No students registered yet. Add students in "My Students" first.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {students.map((student) => {
              const countryObj = countries.find((c) => c.name === student.country);
              const schedText = getStudentSchedules(student);

              return (
                <div
                  key={student.id}
                  className="bg-white border border-pink-100 rounded-3xl p-5 shadow-xs flex flex-col justify-between hover:border-pink-300 transition space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-base text-pink-950">{student.name}</h3>
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <span>{countryObj?.flag}</span>
                          <span>{student.country || "International"}</span>
                        </p>
                      </div>
                      <span className="px-2.5 py-1 bg-pink-50 text-pink-700 border border-pink-200 text-[10px] font-bold rounded-lg uppercase">
                        {student.teacher_alias || "Teacher Gabi"}
                      </span>
                    </div>

                    <div className="bg-pink-50/40 p-3 rounded-2xl border border-pink-50 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Package:</span>
                        <span className="font-bold text-gray-800">
                          {student.classes_included || 30} Classes ({student.class_duration || 40}m)
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Rate:</span>
                        <span className="font-semibold text-pink-600">
                          {currencies[student.payment_currency]?.symbol || ""}
                          {Number(student.payment_amount || 0).toLocaleString()} {student.payment_currency}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-gray-500">Schedule:</span>
                        <span className="font-medium text-gray-700 text-right truncate max-w-[170px]">
                          {schedText}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Dual Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-pink-50">
                    <button
                      type="button"
                      onClick={() => handleOpenWelcome(student)}
                      className="p-2.5 bg-pink-50 hover:bg-pink-100 text-pink-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border border-pink-200"
                    >
                      <Sparkles size={14} className="text-pink-600" />
                      <span>Welcome Card</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenAgreement(student)}
                      className="p-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <FileText size={14} />
                      <span>Formal PDF</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 1. INFORMAL WELCOME CARD MODAL */}
      {selectedStudentForWelcome && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedStudentForWelcome(null)}
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
                    Welcome & Package Overview
                  </h3>
                  <p className="text-xs text-gray-500">
                    Includes dynamic QR code pointing to the live student learning portal.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudentForWelcome(null)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick Edit Links & Platform */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs bg-pink-50 p-3 rounded-2xl border border-pink-100">
              <div>
                <label className="block text-gray-600 font-semibold mb-0.5">Platform</label>
                <input
                  type="text"
                  placeholder="e.g. Google Meet, Zoom, ClassIn"
                  className="input text-xs w-full bg-white"
                  value={classroomPlatform}
                  onChange={(e) => setClassroomPlatform(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-gray-600 font-semibold mb-0.5">Classroom URL</label>
                <input
                  type="text"
                  placeholder="https://meet.google.com/..."
                  className="input text-xs w-full bg-white font-mono"
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                />
              </div>
            </div>

            {/* Printable Preview Sheet */}
            <div className="flex-1 overflow-y-auto border border-gray-200 rounded-2xl p-6 bg-white shadow-inner">
              <div
                ref={welcomePdfRef}
                style={{ backgroundColor: "#ffffff", color: "#1f2937", fontFamily: "sans-serif" }}
                className="space-y-4 text-xs p-4 bg-white"
              >
                <div style={{ borderBottom: "2px solid #db2777", textAlign: "center", paddingBottom: "12px" }}>
                  <div style={{ fontSize: "24px" }}>🌟</div>
                  <h2 style={{ fontSize: "18px", fontWeight: "900", color: "#db2777", textTransform: "uppercase", margin: "4px 0" }}>
                    Welcome to Class!
                  </h2>
                  <p style={{ fontSize: "11px", color: "#6b7280", margin: 0 }}>
                    {teacherName} • Private English Learning Program
                  </p>
                </div>

                <div style={{ backgroundColor: "#fdf2f8", border: "1px solid #fce7f3", padding: "14px", borderRadius: "16px" }}>
                  <p style={{ color: "#374151", margin: 0, lineHeight: "1.5" }}>
                    Hello! We are thrilled to welcome <strong>{selectedStudentForWelcome.name}</strong> to our private ESL lessons. Here is a quick overview of your package and student learning hub.
                  </p>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div style={{ backgroundColor: "#f9fafb", border: "1px solid #f3f4f6", padding: "12px", borderRadius: "12px" }}>
                    <p style={{ fontSize: "10px", textTransform: "uppercase", fontWeight: "bold", color: "#9ca3af", margin: "0 0 4px 0" }}>Class Package</p>
                    <p style={{ fontWeight: "bold", color: "#1f2937", fontSize: "14px", margin: "0 0 2px 0" }}>
                      {Number(selectedStudentForWelcome?.classes_included || 5) + Number(selectedStudentForWelcome?.free_classes || 1)} Sessions
                    </p>
                    <p style={{ fontSize: "10px", color: "#db2777", fontWeight: "600", margin: 0 }}>
                      {selectedStudentForWelcome.class_duration || 40} minutes / class
                    </p>
                  </div>

                  <div style={{ backgroundColor: "#f9fafb", border: "1px solid #f3f4f6", padding: "12px", borderRadius: "12px" }}>
                    <p style={{ fontSize: "10px", textTransform: "uppercase", fontWeight: "bold", color: "#9ca3af", margin: "0 0 4px 0" }}>Tuition Rate</p>
                    <p style={{ fontWeight: "bold", color: "#1f2937", fontSize: "14px", margin: "0 0 2px 0" }}>
                      {currencies[selectedStudentForWelcome.payment_currency]?.symbol || ""}
                      {Number(selectedStudentForWelcome.payment_amount || 0).toLocaleString()} {selectedStudentForWelcome.payment_currency}
                    </p>
                    <p style={{ fontSize: "10px", color: "#6b7280", margin: 0 }}>Prepaid Package</p>
                  </div>
                </div>

                {/* Schedule & QR Code Section with Feature Breakdown */}
                <div style={{ backgroundColor: "#f9fafb", border: "1px solid #f3f4f6", padding: "14px", borderRadius: "14px" }} className="space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5 text-[11px] flex-1">
                      <div>
                        <span style={{ color: "#6b7280", fontWeight: "500", display: "block" }}>🗓 Class Times:</span>
                        <span style={{ fontWeight: "bold", color: "#1f2937" }}>
                          {getStudentSchedules(selectedStudentForWelcome)}
                        </span>
                      </div>
                      <div>
                        <span style={{ color: "#6b7280", fontWeight: "500", display: "block" }}>💻 Classroom Platform:</span>
                        <span style={{ fontWeight: "bold", color: "#db2777" }}>
                          {classroomPlatform}
                        </span>
                      </div>
                      <div>
                        <span style={{ color: "#6b7280", fontWeight: "500", display: "block" }}>📱 Dedicated Student Learning Portal:</span>
                        <span style={{ fontFamily: "monospace", color: "#db2777", fontWeight: "600", wordBreak: "break-all", fontSize: "10px" }}>
                          {portalUrl || "Scan Portal QR Code"}
                        </span>
                      </div>
                    </div>

                    {qrCodeDataUrl && (
                      <div style={{ textAlign: "center", backgroundColor: "#ffffff", padding: "8px", borderRadius: "12px", border: "1px solid #e5e7eb", minWidth: "90px" }}>
                        <img src={qrCodeDataUrl} alt="Student Portal QR Code" style={{ width: "75px", height: "75px", display: "block", margin: "0 auto" }} />
                        <span style={{ fontSize: "8px", fontWeight: "bold", color: "#db2777", marginTop: "4px", display: "block", textTransform: "uppercase" }}>
                          Scan to Access
                        </span>
                      </div>
                    )}
                  </div>

                  <div style={{ backgroundColor: "#fdf2f8", border: "1px solid #fce7f3", padding: "8px 12px", borderRadius: "10px" }}>
                    <p style={{ fontSize: "9px", fontWeight: "bold", color: "#db2777", textTransform: "uppercase", margin: "0 0 3px 0", letterSpacing: "0.5px" }}>
                      ✨ What Parents & Students Can Find in the Portal:
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px", fontSize: "9.5px", color: "#4b5563" }}>
                      <span>• 🚀 1-Click Live Classroom Button</span>
                      <span>• 📊 Completed vs Remaining Balance</span>
                      <span>• 📝 Daily Class Reports & Homework</span>
                      <span>• 💬 Submit Special Learning Requests</span>
                    </div>
                  </div>
                </div>

                <div style={{ backgroundColor: "#ecfdf5", border: "1px solid #a7f3d0", padding: "14px", borderRadius: "12px" }}>
                  <h4 style={{ fontWeight: "bold", fontSize: "12px", color: "#065f46", margin: "0 0 4px 0" }}>
                    ✨ Flexible Rescheduling Guarantee
                  </h4>
                  <p style={{ fontSize: "11px", lineHeight: "1.5", color: "#064e3b", margin: 0 }}>
                    If you ever need to reschedule a session, simply message your teacher in advance and we will easily set up a makeup class.
                  </p>
                </div>

                <div style={{ paddingTop: "8px", textAlign: "center", fontSize: "10px", color: "#9ca3af" }}>
                  {teacherName} • Dedicated to your English fluency and confidence!
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    downloadPdf(
                      welcomePdfRef,
                      `Welcome_Overview_${selectedStudentForWelcome.name}`,
                      "a5"
                    )
                  }
                  disabled={isGeneratingPdf}
                  className="px-4 py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Download size={14} />
                  <span>{isGeneratingPdf ? "Generating..." : "Download PDF"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCopyChatText(selectedStudentForWelcome)}
                  className="px-4 py-2.5 bg-white border border-pink-200 hover:bg-pink-50 text-pink-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedChat ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  <span>{copiedChat ? "Copied to Clipboard!" : "Copy for Chat"}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSelectedStudentForWelcome(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. FORMAL CONTRACT AGREEMENT MODAL */}
      {selectedStudentForAgreement && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedStudentForAgreement(null)}
        >
          <div
            className="bg-white border border-pink-200 rounded-3xl p-6 w-full max-w-2xl shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col relative z-60"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-pink-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-pink-950">
                  ESL Tutoring Service Agreement
                </h3>
                <p className="text-xs text-gray-500">
                  Formal agreement with terms, schedule, live portal QR code, and signatures.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudentForAgreement(null)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Config Fields */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-pink-50 p-3 rounded-2xl border border-pink-100">
              <div>
                <label className="block text-gray-600 font-semibold mb-0.5">Teacher Persona</label>
                <input
                  type="text"
                  className="input text-xs w-full bg-white"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-gray-600 font-semibold mb-0.5">Parent / Signatory</label>
                <input
                  type="text"
                  className="input text-xs w-full bg-white"
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-gray-600 font-semibold mb-0.5">Start Date</label>
                <input
                  type="date"
                  className="input text-xs w-full bg-white"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-gray-600 font-semibold mb-0.5">Classroom Platform</label>
                <input
                  type="text"
                  placeholder="e.g. Google Meet"
                  className="input text-xs w-full bg-white"
                  value={classroomPlatform}
                  onChange={(e) => setClassroomPlatform(e.target.value)}
                />
              </div>
            </div>

            {/* Printable Sheet */}
            <div className="flex-1 overflow-y-auto border border-gray-200 rounded-2xl p-6 bg-white shadow-inner">
              <div
                ref={agreementPdfRef}
                style={{ backgroundColor: "#ffffff", color: "#1f2937", fontFamily: "sans-serif" }}
                className="space-y-4 text-xs p-4 bg-white leading-relaxed"
              >
                <div style={{ borderBottom: "2px solid #db2777", textAlign: "center", paddingBottom: "12px" }}>
                  <h1 style={{ fontSize: "16px", fontWeight: "900", color: "#db2777", textTransform: "uppercase", margin: "0 0 4px 0" }}>
                    Private ESL Tutoring Service Agreement
                  </h1>
                  <p style={{ fontSize: "10px", color: "#9ca3af", margin: 0 }}>
                    Agreement between {teacherName} and {parentName || "Parent/Guardian"}
                  </p>
                </div>

                <p style={{ color: "#374151", margin: 0 }}>
                  This Agreement is entered into on <strong>{startDate}</strong>, by and between <strong>{teacherName}</strong> (Instructor) and <strong>{parentName || "Parent/Guardian"}</strong> on behalf of the student, <strong>{selectedStudentForAgreement.name}</strong>.
                </p>

                {/* Section 1 with QR Code and Feature Breakdown */}
                <div style={{ backgroundColor: "#f9fafb", border: "1px solid #f3f4f6", padding: "12px", borderRadius: "12px" }} className="space-y-2.5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <h4 style={{ fontWeight: "bold", color: "#111827", margin: "0 0 4px 0" }}>1. Package & Student Learning Portal</h4>
                     <p style={{ color: "#4b5563", margin: "0 0 3px 0" }}>
                        • <strong>Total Package:</strong> {Number(selectedStudentForAgreement?.classes_included || 5) + Number(selectedStudentForAgreement?.free_classes || 1)} Sessions ({selectedStudentForAgreement.class_duration || 40} minutes per class)
                      </p>
                      <p style={{ color: "#4b5563", margin: "0 0 3px 0" }}>
                        • <strong>Class Schedule:</strong> {getStudentSchedules(selectedStudentForAgreement)}
                      </p>
                      <p style={{ color: "#4b5563", margin: "0 0 3px 0" }}>
                        • <strong>Platform:</strong> {classroomPlatform} (Accessible directly via Student Portal)
                      </p>
                      <p style={{ color: "#4b5563", margin: "0 0 3px 0" }}>
                        • <strong>Package Rate:</strong> {currencies[selectedStudentForAgreement.payment_currency]?.symbol || ""}{Number(selectedStudentForAgreement.payment_amount || 0).toLocaleString()} {selectedStudentForAgreement.payment_currency}
                      </p>
                      <p style={{ color: "#4b5563", margin: 0 }}>
                        • <strong>Portal Link:</strong> <span style={{ fontFamily: "monospace", color: "#db2777" }}>{portalUrl || "Scan Portal QR Code"}</span>
                      </p>
                    </div>

                    {qrCodeDataUrl && (
                      <div style={{ textAlign: "center", backgroundColor: "#ffffff", padding: "6px", borderRadius: "8px", border: "1px solid #e5e7eb", minWidth: "85px" }}>
                        <img src={qrCodeDataUrl} alt="Student Hub QR Code" style={{ width: "70px", height: "70px", display: "block", margin: "0 auto" }} />
                        <span style={{ fontSize: "8px", fontWeight: "bold", color: "#db2777", marginTop: "3px", display: "block" }}>
                          Scan Student Hub
                        </span>
                      </div>
                    )}
                  </div>

                  <div style={{ backgroundColor: "#ffffff", border: "1px solid #e5e7eb", padding: "6px 10px", borderRadius: "8px", fontSize: "9px", color: "#4b5563" }}>
                    <strong style={{ color: "#1f2937" }}>Parent Portal Features:</strong> Real-time classroom launch link • Live remaining lesson counter • Daily lesson summaries & homework • Interactive teacher request submission box.
                  </div>
                </div>

                <div style={{ backgroundColor: "#f9fafb", border: "1px solid #f3f4f6", padding: "12px", borderRadius: "12px" }}>
                  <h4 style={{ fontWeight: "bold", color: "#111827", margin: "0 0 4px 0" }}>2. Rescheduling & Attendance Policy</h4>
                  <p style={{ color: "#4b5563", margin: 0 }}>
                    Sessions may be rescheduled with prior notice. The Instructor will make every reasonable effort to accommodate makeup lessons for planned absences.
                  </p>
                </div>

                <div style={{ backgroundColor: "#f9fafb", border: "1px solid #f3f4f6", padding: "12px", borderRadius: "12px" }}>
                  <h4 style={{ fontWeight: "bold", color: "#111827", margin: "0 0 4px 0" }}>3. Learning Commitment</h4>
                  <p style={{ color: "#4b5563", margin: 0 }}>
                    The Instructor agrees to provide structured lesson materials, regular conversational practice, and constructive feedback through the student portal.
                  </p>
                </div>

                <div style={{ borderTop: "1px solid #e5e7eb", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px", paddingTop: "24px" }}>
                  <div>
                    <div style={{ borderBottom: "1px solid #9ca3af", paddingBottom: "4px", fontWeight: "600", color: "#1f2937" }}>
                      {teacherName}
                    </div>
                    <p style={{ fontSize: "10px", color: "#9ca3af", margin: "4px 0 0 0" }}>Instructor Signature & Date</p>
                  </div>

                  <div>
                    <div style={{ borderBottom: "1px solid #9ca3af", paddingBottom: "4px", fontWeight: "600", color: "#1f2937" }}>
                      {parentName}
                    </div>
                    <p style={{ fontSize: "10px", color: "#9ca3af", margin: "4px 0 0 0" }}>Parent / Guardian Signature & Date</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() =>
                  downloadPdf(
                    agreementPdfRef,
                    `Agreement_${selectedStudentForAgreement.name}`,
                    "a4"
                  )
                }
                disabled={isGeneratingPdf}
                className="px-5 py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Download size={14} />
                <span>{isGeneratingPdf ? "Generating PDF..." : "Download Agreement PDF"}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedStudentForAgreement(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}