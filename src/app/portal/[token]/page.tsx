"use client";

import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import {
  Video,
  BookOpen,
  Calendar,
  MessageSquare,
  CheckCircle2,
  Sparkles,
  Award,
  TrendingUp,
  FileCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export default function StudentPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;

  const [student, setStudent] = useState<any>(null);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [makeupClasses, setMakeupClasses] = useState<any[]>([]);
  const [studentBooks, setStudentBooks] = useState<any[]>([]);
  const [allBooks, setAllBooks] = useState<any[]>([]);
  const [parentRequestText, setParentRequestText] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadingReportId, setUploadingReportId] = useState<string | null>(null);
  const [expandedReportIds, setExpandedReportIds] = useState<string[]>([]);
  const [submissionText, setSubmissionText] = useState("");
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  function toggleExpandReport(id: string) {
    setExpandedReportIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  async function handleStudentHomeworkUpload(reportId: string, file: File, isLesson: boolean = false) {
    if (!file || !student) return;
    setUploadingReportId(reportId);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `submissions/${student.id}/${reportId}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("homework-files")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("homework-files")
        .getPublicUrl(fileName);

      const submissionUrl = publicUrlData.publicUrl;

      const tableName = isLesson ? "lessons" : "class_reports";
      const { error: dbError } = await supabase
        .from(tableName)
        .update({
          homework_submission_url: submissionUrl,
          homework_submitted_at: new Date().toISOString(),
          homework_status: "Submitted",
        })
        .eq("id", reportId);

      if (dbError) throw dbError;

      if (isLesson) {
        setLessons((prev) =>
          prev.map((l) =>
            l.id === reportId
              ? {
                  ...l,
                  homework_submission_url: submissionUrl,
                  homework_submitted_at: new Date().toISOString(),
                  homework_status: "Submitted",
                }
              : l
          )
        );
      } else {
        setReports((prev) =>
          prev.map((r) =>
            r.id === reportId
              ? {
                  ...r,
                  homework_submission_url: submissionUrl,
                  homework_submitted_at: new Date().toISOString(),
                  homework_status: "Submitted",
                }
              : r
          )
        );
      }

      alert("Homework uploaded successfully!");
    } catch (err: any) {
      console.error("Upload error:", err);
      alert("Failed to upload homework. Please try again.");
    } finally {
      setUploadingReportId(null);
    }
  }

  useEffect(() => {
    async function loadPortalData() {
      try {
        const { data: studentData, error } = await supabase
          .from("students")
          .select("*")
          .eq("access_token", token)
          .single();

        if (error || !studentData) return;

        setStudent(studentData);
        setParentRequestText(studentData.parent_requests || "");

        const [
          { data: scheds },
          { data: repList },
          { data: studentBks },
          { data: booksData },
          { data: lessonList },
          { data: makeupList },
        ] = await Promise.all([
          supabase.from("schedules").select("*").eq("student_id", studentData.id),
          supabase
            .from("class_reports")
            .select("*")
            .eq("student_id", studentData.id)
            .order("report_date", { ascending: false }),
          supabase.from("student_books").select("*").eq("student_id", studentData.id),
          supabase.from("books").select("*"),
          supabase
            .from("lessons")
            .select("*")
            .eq("student_id", studentData.id)
            .order("lesson_date", { ascending: false }),
          supabase.from("makeup_classes").select("*").eq("student_id", studentData.id),
        ]);

        if (scheds) setSchedules(scheds);
        if (repList) {
          setReports(repList);
          if (repList.length > 0) {
            setExpandedReportIds([repList[0].id]);
          }
        }
        if (lessonList) setLessons(lessonList);
        if (makeupList) setMakeupClasses(makeupList);
        if (studentBks) setStudentBooks(studentBks);
        if (booksData) setAllBooks(booksData);
      } catch (err) {
        console.error("Failed to load portal data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadPortalData();
  }, [token]);

  async function handleSaveRequest() {
    if (!student) return;
    const { error } = await supabase
      .from("students")
      .update({ parent_requests: parentRequestText.trim() })
      .eq("id", student.id);

    if (!error) {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } else {
      alert("Failed to send note to teacher.");
    }
  }

  async function handleSubmitHomework(e: React.FormEvent) {
    e.preventDefault();
    if (!submissionText.trim() && !submissionFile) {
      alert("Please enter your answers or attach a file.");
      return;
    }

    setIsSubmitting(true);
    try {
      let fileUrl = null;

      if (submissionFile) {
        const fileExt = submissionFile.name.split(".").pop();
        const fileName = `submissions/${student.id}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("homework-files")
          .upload(fileName, submissionFile);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from("homework-files")
          .getPublicUrl(fileName);

        fileUrl = publicUrlData.publicUrl;
      }

      const targetReport = reports.find((r) => r.homework_status !== "Submitted");
      const targetLesson = lessons.find((l) => l.homework_status !== "Submitted");

      if (targetReport) {
        const { error: updateError } = await supabase
          .from("class_reports")
          .update({
            homework_submission_url: fileUrl,
            homework_submitted_at: new Date().toISOString(),
            homework_status: "Submitted",
          })
          .eq("id", targetReport.id);

        if (updateError) throw updateError;
      } else if (targetLesson) {
        const { error: updateError } = await supabase
          .from("lessons")
          .update({
            homework_submission_url: fileUrl,
            homework_submitted_at: new Date().toISOString(),
            homework_status: "Submitted",
          })
          .eq("id", targetLesson.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("homework_submissions")
          .insert({
            student_id: student.id,
            answer_text: submissionText.trim() || null,
            file_url: fileUrl,
            status: "Submitted",
          });

        if (insertError) throw insertError;
      }

      setSubmitSuccess(true);
      setSubmissionText("");
      setSubmissionFile(null);
      
      setTimeout(() => {
        setSubmitSuccess(false);
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      alert("Failed to submit homework: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 text-pink-600 font-bold text-sm">
        Loading Student Learning Hub...
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 text-gray-500 text-sm">
        Student portal link is invalid or expired.
      </div>
    );
  }

  const validReports = reports.filter((r) => {
    const title = (r.lesson_title || r.title || "").toLowerCase();
    const status = (r.status || "").toLowerCase();
    return !title.includes("cancelled") && !title.includes("absent") && status !== "cancelled" && status !== "absent";
  });
  
  const validLessons = lessons.filter((les) => {
    const title = (les.title || "").toLowerCase();
    const status = (les.status || "").toLowerCase();
    return !title.includes("cancelled") && !title.includes("absent") && status !== "cancelled" && status !== "absent";
  });

  const completedMakeups = makeupClasses.filter((m) => {
    const s = (m.status || "").trim().toLowerCase();
    return s === "completed" || s === "attended";
  });

  const allSessionDates = new Set([
    ...validReports.map(r => r.report_date || r.lesson_date),
    ...validLessons.map(l => l.lesson_date),
    ...completedMakeups.map(m => m.makeup_date || m.date)
  ]);
  const dynamicCompletedClasses = allSessionDates.size || Math.max(validReports.length, validLessons.length) + completedMakeups.length;
  
  const totalIncludedClasses = Number(student.classes_included || 0) + Number(student.free_classes || 0);
  const remainingClasses = Math.max(totalIncludedClasses - dynamicCompletedClasses, 0);
  const progressPercentage = Math.min(
    100,
    Math.round((dynamicCompletedClasses / (totalIncludedClasses || 1)) * 100)
  );

  const pendingHomeworkCount = validReports.filter(
    (report) => (report.homework || report.homework_file_url) && report.homework_status !== "Submitted"
  ).length + validLessons.filter(
    (lesson) => (lesson.homework || lesson.homework_file_url || lesson.homework_notes) && lesson.homework_status !== "Submitted"
  ).length;

  return (
    <div className="min-h-screen bg-neutral-50/60 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Column (Col 1): Sidebar */}
        <div className="lg:col-span-1 space-y-5 lg:sticky lg:top-8 self-start">
          <div className="bg-white border-2 border-pink-300 rounded-3xl p-5 shadow-xs space-y-4">
            <div>
              <span className="text-[10px] font-bold text-pink-700 tracking-widest uppercase bg-pink-100 px-2.5 py-1 rounded-lg border border-pink-300">
                Student Portal
              </span>
              <h1 className="text-2xl font-extrabold text-pink-950 mt-2">{student.name}</h1>
              <p className="text-sm text-gray-600 mt-0.5">
                Instructor: <strong className="text-gray-900">{student.teacher_alias || "Teacher Gabi"}</strong>
              </p>
            </div>

            {student.meeting_link && (
              <a
                href={student.meeting_link}
                target="_blank"
                rel="noreferrer"
                className="w-full px-4 py-3 bg-pink-600 hover:bg-pink-700 text-white rounded-2xl text-sm font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <Video size={16} />
                <span>Join Classroom</span>
              </a>
            )}
          </div>

          <div className="bg-white border-2 border-pink-300 rounded-3xl p-5 shadow-xs space-y-3">
            <h3 className="font-bold text-gray-900 text-sm">Package Progress</h3>
            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden border border-pink-200">
              <div
                className="bg-pink-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 text-center text-sm">
              <div className="p-3 bg-pink-50/60 rounded-2xl border border-pink-300">
                <p className="text-gray-500 font-semibold text-[10px] uppercase">Completed</p>
                <p className="text-xl font-extrabold text-gray-900 mt-0.5">{dynamicCompletedClasses}</p>
              </div>
              <div className="p-3 bg-pink-50/60 rounded-2xl border border-pink-300">
                <p className="text-gray-500 font-semibold text-[10px] uppercase">Remaining</p>
                <p className="text-xl font-extrabold text-pink-700 mt-0.5">{remainingClasses}</p>
              </div>
            </div>
          </div>

          <div className="bg-white border-2 border-pink-300 rounded-3xl p-5 shadow-xs space-y-3">
            <h3 className="font-bold text-gray-900 text-sm">Class Schedule</h3>
            {schedules.length === 0 ? (
              <p className="text-sm text-gray-400 italic">Schedule to be confirmed.</p>
            ) : (
              <div className="space-y-2 text-sm">
                {schedules.map((s) => (
                  <div key={s.id} className="flex flex-col p-2.5 bg-pink-50/60 rounded-xl border border-pink-200 gap-0.5">
                    <span className="font-bold text-gray-800">{s.day_of_week}</span>
                    <span className="text-pink-700 font-semibold text-xs">
                      {s.start_time || s.time || s.class_time || s.schedule_time || "Time TBA"} {s.duration ? `(${s.duration}m)` : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border-2 border-pink-300 rounded-3xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                <MessageSquare size={15} className="text-pink-600" />
                <span>Parent Requests & Notes</span>
              </h3>
              {savedSuccess && (
                <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
                  <CheckCircle2 size={12} /> Saved!
                </span>
              )}
            </div>
            <textarea
              rows={3}
              placeholder="e.g. Please focus on speaking fluency..."
              className="w-full text-sm p-2.5 rounded-xl border-2 border-pink-300 focus:outline-pink-500 bg-pink-50/30 text-gray-900"
              value={parentRequestText}
              onChange={(e) => setParentRequestText(e.target.value)}
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSaveRequest}
                className="px-3.5 py-1.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              >
                Submit Note
              </button>
            </div>
          </div>
        </div>

        {/* Right Main Area (Cols 2-4) */}
        <div className="lg:col-span-3 space-y-6">
          {pendingHomeworkCount > 0 && (
            <div className="bg-gradient-to-r from-rose-50 to-pink-50 border-2 border-rose-300 text-rose-950 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <span className="bg-rose-200 text-rose-900 text-[10px] font-extrabold px-2.5 py-1 rounded-lg uppercase tracking-wider border border-rose-400">
                  Action Required
                </span>
                <h2 className="text-lg font-bold mt-2 text-rose-950">
                  You have {pendingHomeworkCount} pending homework assignment(s)
                </h2>
              </div>
              <a 
                href="#lesson-history" 
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm shadow-xs transition whitespace-nowrap"
              >
                View & Upload Below 👇
              </a>
            </div>
          )}

          <div id="lesson-history" className="bg-white border-2 border-pink-300 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <BookOpen size={16} className="text-pink-600" />
                <span>Daily Lesson History & Teacher Feedback</span>
              </h3>
              <span className="text-xs font-bold text-pink-700 bg-pink-100 px-2.5 py-0.5 rounded-lg border border-pink-300">
                {validReports.length + validLessons.length + completedMakeups.length} Sessions Logged
              </span>
            </div>

            {validReports.length === 0 && validLessons.length === 0 && completedMakeups.length === 0 ? (
              <div className="p-8 text-center bg-pink-50/40 rounded-2xl border-2 border-pink-200">
                <p className="text-sm text-gray-500 italic">No daily lesson reports recorded yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* 1. Render Makeup Classes */}
                {completedMakeups.map((mc: any) => {
                  const isExpanded = expandedReportIds.includes(mc.id);
                  const matchedBook = allBooks.find((b) => b.id === mc.book_id);
                  const text = mc.notes || "";

                  const vocabMatch = text.match(/Vocab[:\-]?\s*([\s\S]*?)(?=\n(?:Strengths|Improvements|Homework):|$)/i);
                  const strengthsMatch = text.match(/Strengths[:\-]?\s*([\s\S]*?)(?=\n(?:Vocab|Improvements|Homework):|$)/i);
                  const improvementsMatch = text.match(/(?:Improvements|Next Focus)[:\-]?\s*([\s\S]*?)(?=\n(?:Vocab|Strengths|Homework):|$)/i);
                  const homeworkMatch = text.match(/Homework[:\-]?\s*([\s\S]*?)(?=\n(?:Message|Vocab|Strengths|Improvements):|$)/i);
                  const messageMatch = text.match(/Message[:\-]?\s*([\s\S]*?)(?=\n(?:Vocab|Strengths|Improvements|Homework):|$)/i);

                  const displayVocab = vocabMatch ? vocabMatch[1].trim() : "";
                  const displayStrengths = strengthsMatch ? strengthsMatch[1].trim() : "";
                  const displayImprovements = improvementsMatch ? improvementsMatch[1].trim() : "";
                  const displayHomework = homeworkMatch ? homeworkMatch[1].trim() : "";
                  const displayMessage = messageMatch ? messageMatch[1].trim() : "";
                  const fallbackMain = !displayStrengths && !displayImprovements && !displayVocab ? text : "";

                  return (
                    <div key={mc.id} className="bg-pink-50/40 rounded-2xl border-2 border-pink-200 text-sm transition-all overflow-hidden">
                      <div
                        onClick={() => toggleExpandReport(mc.id)}
                        className="p-4 flex items-center justify-between cursor-pointer hover:bg-pink-100/50 select-none transition"
                      >
                        <div className="flex items-center gap-2.5">
                          <button type="button" className="p-1 rounded-lg text-pink-600 bg-white border border-pink-300 shadow-2xs">
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                          <span className="px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-extrabold rounded-md uppercase">
                            Makeup Class
                          </span>
                          <h4 className="font-bold text-pink-950 text-sm">⭐ {mc.topic || mc.title || "Makeup Session"}</h4>
                        </div>

                        <span className="text-gray-500 text-xs flex items-center gap-1 font-mono font-semibold">
                          <Calendar size={12} /> {(mc.makeup_date || mc.date || "").substring(0, 10)}
                        </span>
                      </div>

                      {isExpanded && (
                        <div className="px-5 pb-5 pt-2 border-t border-pink-200 space-y-3.5 bg-white/60">
                          {matchedBook && (
                            <div className="pt-1">
                              <span className="text-[10px] font-bold text-pink-800 bg-pink-100/70 px-2.5 py-0.5 rounded-lg border border-pink-200">
                                📖 {matchedBook.title}
                              </span>
                            </div>
                          )}

                          {displayVocab && (
                            <div className="space-y-1">
                              <span className="font-bold text-gray-900 flex items-center gap-1.5 text-xs">
                                <Sparkles size={13} className="text-pink-600" /> Vocabulary & Target Structures:
                              </span>
                              <p className="text-gray-800 bg-white p-3 rounded-xl border-2 border-pink-200 leading-relaxed font-mono text-xs whitespace-pre-wrap">
                                {displayVocab}
                              </p>
                            </div>
                          )}

                          {(displayStrengths || displayImprovements) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {displayStrengths && (
                                <div className="p-3 bg-emerald-50/80 rounded-xl border-2 border-emerald-200 space-y-1">
                                  <span className="font-bold text-emerald-900 flex items-center gap-1 text-xs">
                                    <Award size={13} className="text-emerald-600" /> Strengths & Highlights:
                                  </span>
                                  <p className="text-emerald-950 leading-relaxed text-xs whitespace-pre-wrap">{displayStrengths}</p>
                                </div>
                              )}
                              {displayImprovements && (
                                <div className="p-3 bg-amber-50/80 rounded-xl border-2 border-amber-200 space-y-1">
                                  <span className="font-bold text-amber-900 flex items-center gap-1 text-xs">
                                    <TrendingUp size={13} className="text-amber-600" /> Next Focus / Tips:
                                  </span>
                                  <p className="text-amber-950 leading-relaxed text-xs whitespace-pre-wrap">{displayImprovements}</p>
                                </div>
                              )}
                            </div>
                          )}

                          {displayMessage && (
                            <div className="p-3.5 bg-pink-50/70 rounded-xl border-2 border-pink-200 space-y-1">
                              <span className="font-bold text-pink-950 text-xs flex items-center gap-1">
                                💌 Message from Teacher:
                              </span>
                              <p className="text-gray-900 text-xs whitespace-pre-wrap leading-relaxed">{displayMessage}</p>
                            </div>
                          )}

                          {fallbackMain && (
                            <div className="p-3 bg-white rounded-xl border-2 border-pink-200 space-y-1">
                              <span className="font-bold text-gray-900 flex items-center gap-1 text-xs">
                                <Sparkles size={13} className="text-pink-600" /> Makeup Notes:
                              </span>
                              <p className="text-gray-800 leading-relaxed text-xs whitespace-pre-wrap">{fallbackMain}</p>
                            </div>
                          )}

                          {displayHomework && (
                            <div className="p-4 bg-pink-100/60 rounded-2xl border-2 border-pink-300 text-pink-950 space-y-2">
                              <span className="font-bold flex items-center gap-1.5 text-sm">
                                <FileCheck size={15} className="text-pink-600" /> Assigned Homework:
                              </span>
                              <p className="leading-relaxed text-xs font-medium text-gray-900 bg-white p-2.5 rounded-xl border-2 border-pink-200 whitespace-pre-wrap">
                                {displayHomework}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* 2. Render Class Reports */}
                {validReports.map((rep: any) => {
                  const isExpanded = expandedReportIds.includes(rep.id);
                  const matchedBook = allBooks.find((b) => b.id === rep.book_id);

                  return (
                    <div key={rep.id} className="bg-pink-50/40 rounded-2xl border-2 border-pink-200 text-sm transition-all overflow-hidden">
                      <div
                        onClick={() => toggleExpandReport(rep.id)}
                        className="p-4 flex items-center justify-between cursor-pointer hover:bg-pink-100/50 select-none transition"
                      >
                        <div className="flex items-center gap-2.5">
                          <button type="button" className="p-1 rounded-lg text-pink-600 bg-white border border-pink-300">
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                          <span className="px-2 py-0.5 bg-pink-600 text-white text-[10px] font-extrabold rounded-md uppercase">
                            Report
                          </span>
                          <h4 className="font-bold text-pink-950 text-sm">{rep.lesson_title || rep.title || "Class Report"}</h4>
                        </div>
                        <span className="text-gray-500 text-xs font-mono font-semibold">
                          {rep.report_date?.substring(0, 10)}
                        </span>
                      </div>

                      {isExpanded && (
                        <div className="px-5 pb-5 pt-2 border-t border-pink-200 space-y-3.5 bg-white/60">
                          {matchedBook && (
                            <div>
                              <span className="text-[10px] font-bold text-pink-800 bg-pink-100/70 px-2.5 py-0.5 rounded-lg border border-pink-200">
                                📖 {matchedBook.title}: p. {rep.start_page || 1} - {rep.end_page || "N/A"}
                              </span>
                            </div>
                          )}
                          {rep.vocabulary && (
                            <div className="space-y-1">
                              <span className="font-bold text-gray-900 text-xs">Vocabulary & Structures:</span>
                              <p className="text-gray-800 bg-white p-3 rounded-xl border-2 border-pink-200 text-xs whitespace-pre-wrap">{rep.vocabulary}</p>
                            </div>
                          )}
                          {rep.strengths && (
                            <div className="p-3 bg-emerald-50/80 rounded-xl border-2 border-emerald-200">
                              <span className="font-bold text-emerald-900 text-xs">Strengths:</span>
                              <p className="text-emerald-950 text-xs whitespace-pre-wrap">{rep.strengths}</p>
                            </div>
                          )}
                          {rep.improvements && (
                            <div className="p-3 bg-amber-50/80 rounded-xl border-2 border-amber-200">
                              <span className="font-bold text-amber-900 text-xs">Next Focus:</span>
                              <p className="text-amber-950 text-xs whitespace-pre-wrap">{rep.improvements}</p>
                            </div>
                          )}
                          {rep.teacher_message && (
                            <div className="p-3.5 bg-pink-50/70 rounded-xl border-2 border-pink-200 space-y-1">
                              <span className="font-bold text-pink-950 text-xs">💌 Message from Teacher:</span>
                              <p className="text-gray-900 text-xs whitespace-pre-wrap">{rep.teacher_message}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* 3. Render Regular Lessons */}
                {validLessons.map((les: any) => {
                  const isExpanded = expandedReportIds.includes(les.id);
                  const displayVocab = les.vocab_notes || les.vocabulary || "";
                  const displayStrengths = les.strengths_notes || les.strengths || "";
                  const displayImprovements = les.improvement_notes || les.improvements || "";

                  return (
                    <div key={les.id} className="bg-pink-50/40 rounded-2xl border-2 border-pink-200 text-sm transition-all overflow-hidden">
                      <div
                        onClick={() => toggleExpandReport(les.id)}
                        className="p-4 flex items-center justify-between cursor-pointer hover:bg-pink-100/50 select-none transition"
                      >
                        <div className="flex items-center gap-2.5">
                          <button type="button" className="p-1 rounded-lg text-pink-600 bg-white border border-pink-300">
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                          <span className="px-2 py-0.5 bg-pink-600 text-white text-[10px] font-extrabold rounded-md uppercase">
                            Lesson
                          </span>
                          <h4 className="font-bold text-pink-950 text-sm">{les.title || "Lesson Log"}</h4>
                        </div>
                        <span className="text-gray-500 text-xs font-mono font-semibold">
                          {les.lesson_date?.substring(0, 10)}
                        </span>
                      </div>

                      {isExpanded && (
                        <div className="px-5 pb-5 pt-2 border-t border-pink-200 space-y-3.5 bg-white/60">
                          {displayVocab && (
                            <div className="space-y-1">
                              <span className="font-bold text-gray-900 text-xs">Vocabulary & Structures:</span>
                              <p className="text-gray-800 bg-white p-3 rounded-xl border-2 border-pink-200 text-xs whitespace-pre-wrap">{displayVocab}</p>
                            </div>
                          )}
                          {displayStrengths && (
                            <div className="p-3 bg-emerald-50/80 rounded-xl border-2 border-emerald-200">
                              <span className="font-bold text-emerald-900 text-xs">Strengths:</span>
                              <p className="text-emerald-950 text-xs whitespace-pre-wrap">{displayStrengths}</p>
                            </div>
                          )}
                          {displayImprovements && (
                            <div className="p-3 bg-amber-50/80 rounded-xl border-2 border-amber-200">
                              <span className="font-bold text-amber-900 text-xs">Next Focus:</span>
                              <p className="text-amber-950 text-xs whitespace-pre-wrap">{displayImprovements}</p>
                            </div>
                          )}
                          {les.teacher_message && (
                            <div className="p-3.5 bg-pink-50/70 rounded-xl border-2 border-pink-200 space-y-1">
                              <span className="font-bold text-pink-950 text-xs">💌 Message from Teacher:</span>
                              <p className="text-gray-900 text-xs whitespace-pre-wrap">{les.teacher_message}</p>
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
    </div>
  );
}