"use client";

import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import {
  Video,
  BookOpen,
  Calendar,
  Clock,
  MessageSquare,
  CheckCircle2,
  Sparkles,
  Award,
  TrendingUp,
  FileCheck,
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
  const [studentBooks, setStudentBooks] = useState<any[]>([]);
  const [allBooks, setAllBooks] = useState<any[]>([]);
  const [parentRequestText, setParentRequestText] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadingReportId, setUploadingReportId] = useState<string | null>(null);
  
  const pendingHomeworkCount = reports.filter(
    (report) => (report.homework || report.homework_file_url) && report.homework_status !== "Submitted"
  ).length;

  async function handleStudentHomeworkUpload(reportId: string, file: File) {
    if (!file || !student) return;
    setUploadingReportId(reportId);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `submissions/${student.id}/${reportId}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("homework-files")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("homework-files")
        .getPublicUrl(fileName);

      const submissionUrl = publicUrlData.publicUrl;

      const { error: dbError } = await supabase
        .from("class_reports")
        .update({
          homework_submission_url: submissionUrl,
          homework_submitted_at: new Date().toISOString(),
          homework_status: "Submitted",
        })
        .eq("id", reportId);

      if (dbError) throw dbError;

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

        const [{ data: scheds }, { data: repList }, { data: studentBks }, { data: booksData }] = await Promise.all([
          supabase.from("schedules").select("*").eq("student_id", studentData.id),
          supabase
            .from("class_reports")
            .select("*")
            .eq("student_id", studentData.id)
            .order("report_date", { ascending: false }),
          supabase.from("student_books").select("*").eq("student_id", studentData.id),
          supabase.from("books").select("*"),
        ]);

        if (scheds) setSchedules(scheds);
        if (repList) setReports(repList);
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
      .update({ parent_requests: parentRequestText })
      .eq("id", student.id);

    if (!error) {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
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

  const totalIncludedClasses = Number(student.classes_included || 0) + Number(student.free_classes || 0);
  const remainingClasses = Math.max(
    totalIncludedClasses - (student.classes_completed || 0),
    0
  );
  const progressPercentage = Math.min(
    100,
    Math.round(((student.classes_completed || 0) / (totalIncludedClasses || 1)) * 100)
  );

  return (
    <div className="min-h-screen bg-neutral-50/60 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Column (Col 1): Sticky Sidebar with Darker Outlines */}
        <div className="lg:col-span-1 space-y-5 lg:sticky lg:top-8 self-start">
          {/* Portal Header / Student Profile */}
          <div className="bg-white border-2 border-pink-300 rounded-3xl p-5 shadow-xs space-y-4">
            <div>
              <span className="text-[10px] font-bold text-pink-700 tracking-widest uppercase bg-pink-100 px-2.5 py-1 rounded-lg border border-pink-300">
                Student Portal
              </span>
              <h1 className="text-2xl font-extrabold text-pink-950 mt-2">{student.name}</h1>
              <p className="text-xs text-gray-600 mt-0.5">
                Instructor: <strong className="text-gray-900">{student.teacher_alias || "Teacher Gabi"}</strong>
              </p>
            </div>

            {student.meeting_link && (
              <a
                href={student.meeting_link}
                target="_blank"
                rel="noreferrer"
                className="w-full px-4 py-3 bg-pink-600 hover:bg-pink-700 text-white rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <Video size={16} />
                <span>Join Classroom</span>
              </a>
            )}
          </div>

          {/* Package Progress Card */}
          <div className="bg-white border-2 border-pink-300 rounded-3xl p-5 shadow-xs space-y-3">
            <h3 className="font-bold text-gray-900 text-sm">Package Progress</h3>
            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden border border-pink-200">
              <div
                className="bg-pink-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="p-3 bg-pink-50/60 rounded-2xl border border-pink-300">
                <p className="text-gray-500 font-semibold text-[10px] uppercase">Completed</p>
                <p className="text-xl font-extrabold text-gray-900 mt-0.5">{student.classes_completed || 0}</p>
              </div>
              <div className="p-3 bg-pink-50/60 rounded-2xl border border-pink-300">
                <p className="text-gray-500 font-semibold text-[10px] uppercase">Remaining</p>
                <p className="text-xl font-extrabold text-pink-700 mt-0.5">{remainingClasses}</p>
              </div>
            </div>
          </div>

          {/* Class Schedule */}
          <div className="bg-white border-2 border-pink-300 rounded-3xl p-5 shadow-xs space-y-3">
            <h3 className="font-bold text-gray-900 text-sm">Class Schedule</h3>
            {schedules.length === 0 ? (
              <p className="text-xs text-gray-400 italic">Schedule to be confirmed.</p>
            ) : (
              <div className="space-y-2 text-xs">
                {schedules.map((s) => (
                  <div key={s.id} className="flex flex-col p-2.5 bg-pink-50/60 rounded-xl border border-pink-200 gap-0.5">
                    <span className="font-bold text-gray-800">{s.day_of_week}</span>
                    <span className="text-pink-700 font-semibold text-[11px]">
                      {s.start_time || s.time || s.class_time || s.schedule_time || "Time TBA"} {s.duration ? `(${s.duration})` : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Interactive Parent Request Box */}
          <div className="bg-white border-2 border-pink-300 rounded-3xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                <MessageSquare size={15} className="text-pink-600" />
                <span>Parent Requests & Notes</span>
              </h3>
              {savedSuccess && (
                <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
                  <CheckCircle2 size={12} /> Saved!
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-600">
              Special focus requests or notes for the teacher:
            </p>

            <textarea
              rows={3}
              placeholder="e.g. Please focus on speaking fluency..."
              className="w-full text-xs p-2.5 rounded-xl border-2 border-pink-300 focus:outline-pink-500 bg-pink-50/30 text-gray-900"
              value={parentRequestText}
              onChange={(e) => setParentRequestText(e.target.value)}
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSaveRequest}
                className="px-3.5 py-1.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-[11px] font-bold transition shadow-xs cursor-pointer"
              >
                Submit Note
              </button>
            </div>
          </div>
        </div>

        {/* Right Main Area (Cols 2-4): Feed with Darker Outlines */}
        <div className="lg:col-span-3 space-y-6">
          {/* Pending Homework Notification Banner */}
          {pendingHomeworkCount > 0 && (
            <div className="bg-gradient-to-r from-rose-50 to-pink-50 border-2 border-rose-300 text-rose-950 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <span className="bg-rose-200 text-rose-900 text-[10px] font-extrabold px-2.5 py-1 rounded-lg uppercase tracking-wider border border-rose-400">
                  Action Required
                </span>
                <h2 className="text-lg font-bold mt-2 text-rose-950">
                  You have {pendingHomeworkCount} pending homework assignment(s)
                </h2>
                <p className="text-rose-800 text-xs mt-0.5">
                  Please complete and upload your worksheet below for teacher review.
                </p>
              </div>
              
              <a 
                href="#lesson-history" 
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-xs transition whitespace-nowrap"
              >
                View & Upload Below 👇
              </a>
            </div>
          )}

          {/* Assigned Books & Curriculum Progress */}
          <div className="bg-white border-2 border-pink-300 rounded-3xl p-6 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-pink-700 font-bold text-sm">
              <BookOpen size={18} />
              <span>Assigned Books & Curriculum Progress</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {studentBooks && studentBooks.length > 0 ? (
                studentBooks.map((item: any, index: number) => {
                  const book = allBooks?.find((b: any) => b.id === item.book_id);
                  const isPageBased = book?.book_type === "pages";
                  
                  let bookProgress = 0;
                  if (book) {
                    const bookReports = reports.filter((r) => r.book_id === book.id);
                    if (isPageBased) {
                      const maxPageReached = bookReports.reduce((max: number, r: any) => Math.max(max, r.end_page || 0), 0);
                      const totalPages = book.total_pages || 1;
                      bookProgress = Math.min(100, Math.round((maxPageReached / totalPages) * 100));
                    } else {
                      const totalChapters = book.chapters?.length || 1;
                      const completedChapters = item.completed_chapters?.length || 0;
                      bookProgress = Math.min(100, Math.round((completedChapters / totalChapters) * 100));
                    }
                  }

                  return (
                    <div key={book?.id || index} className="p-3.5 bg-pink-50/60 rounded-2xl border-2 border-pink-200 space-y-1.5">
                      <div className="flex justify-between items-center text-xs font-bold text-pink-950">
                        <span>📖 {book?.title || "Book"}</span>
                        <span className="text-pink-700 text-[11px] font-extrabold">{bookProgress}%</span>
                      </div>
                      <div className="w-full bg-pink-100 rounded-full h-2 overflow-hidden border border-pink-300">
                        <div className="bg-pink-600 h-2 rounded-full transition-all duration-300" style={{ width: `${bookProgress}%` }} />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-gray-400 italic col-span-2">No books assigned yet.</p>
              )}
            </div>
          </div>

          {/* Daily Class Reports, Lesson History & Teacher Feedback */}
          <div id="lesson-history" className="bg-white border-2 border-pink-300 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <BookOpen size={16} className="text-pink-600" />
                <span>Daily Lesson History & Teacher Feedback</span>
              </h3>
              <span className="text-[11px] font-bold text-pink-700 bg-pink-100 px-2.5 py-0.5 rounded-lg border border-pink-300">
                {reports.length} {reports.length === 1 ? "Session" : "Sessions"} Logged
              </span>
            </div>

            {reports.length === 0 ? (
              <div className="p-8 text-center bg-pink-50/40 rounded-2xl border-2 border-pink-200">
                <p className="text-xs text-gray-500 italic">No daily lesson reports recorded yet.</p>
                <p className="text-[11px] text-gray-400 mt-1">Lesson notes, new vocabulary, and homework will appear here after class.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reports.map((rep, idx) => (
                  <div
                    key={rep.id || idx}
                    className="p-5 bg-pink-50/40 rounded-2xl border-2 border-pink-200 text-xs space-y-3"
                  >
                    {/* Lesson Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-pink-200 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-pink-600 text-white text-[10px] font-extrabold rounded-md uppercase">
                          Lesson
                        </span>
                        <h4 className="font-bold text-pink-950 text-sm">{rep.lesson_title}</h4>
                      </div>
                      <span className="text-gray-500 text-[11px] flex items-center gap-1 font-medium">
                        <Calendar size={12} /> {rep.report_date}
                      </span>
                    </div>

                    {/* Vocabulary & Target Sentences */}
                    {rep.vocabulary && (
                      <div className="space-y-1">
                        <span className="font-bold text-gray-900 flex items-center gap-1.5 text-[11px]">
                          <Sparkles size={13} className="text-pink-600" /> Vocabulary & Target Structures:
                        </span>
                        <p className="text-gray-800 bg-white p-2.5 rounded-xl border-2 border-pink-200 leading-relaxed font-mono text-[11px]">
                          {rep.vocabulary}
                        </p>
                      </div>
                    )}

                    {/* Feedback: Strengths & Improvement */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {rep.strengths && (
                        <div className="p-3 bg-emerald-50/80 rounded-xl border-2 border-emerald-200 space-y-1">
                          <span className="font-bold text-emerald-900 flex items-center gap-1 text-[11px]">
                            <Award size={13} className="text-emerald-600" /> Strengths & Highlights:
                          </span>
                          <p className="text-emerald-950 leading-relaxed text-[11px]">{rep.strengths}</p>
                        </div>
                      )}

                      {rep.improvements && (
                        <div className="p-3 bg-amber-50/80 rounded-xl border-2 border-amber-200 space-y-1">
                          <span className="font-bold text-amber-900 flex items-center gap-1 text-[11px]">
                            <TrendingUp size={13} className="text-amber-600" /> Next Focus / Tips:
                          </span>
                          <p className="text-amber-950 leading-relaxed text-[11px]">{rep.improvements}</p>
                        </div>
                      )}
                    </div>

                    {/* Homework Section */}
                    {(rep.homework || rep.homework_file_url) && (
                      <div className="p-4 bg-pink-100/60 rounded-2xl border-2 border-pink-300 text-pink-950 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-bold flex items-center gap-1.5 text-xs text-pink-950">
                            <FileCheck size={15} className="text-pink-600" />
                            <span>Assigned Homework / Review (Optional):</span>
                          </span>

                          <span
                            className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                              rep.homework_status === "Submitted"
                                ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                                : "bg-pink-200 text-pink-800 border border-pink-300"
                            }`}
                          >
                            {rep.homework_status === "Submitted" ? "✓ Submitted" : "Pending"}
                          </span>
                        </div>

                        {rep.homework && (
                          <p className="leading-relaxed text-[11px] font-medium text-gray-900 bg-white p-2.5 rounded-xl border-2 border-pink-200">
                            {rep.homework}
                          </p>
                        )}

                        {rep.homework_file_url && (
                          <div>
                            <a
                              href={rep.homework_file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border-2 border-pink-300 text-pink-800 font-bold rounded-lg text-[10px] hover:bg-pink-50 transition shadow-2xs"
                            >
                              <span>📄 View Teacher Worksheet / Page</span>
                            </a>
                          </div>
                        )}

                        <div className="pt-2 border-t border-pink-300/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          {rep.homework_submission_url ? (
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-emerald-800 font-bold">Completed File:</span>
                              <a
                                href={rep.homework_submission_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] text-pink-700 font-bold underline hover:text-pink-800"
                              >
                                View Submitted Homework
                              </a>
                            </div>
                          ) : (
                            <p className="text-[10px] text-gray-600 italic">
                              Upload photo of worksheet or notebook when done.
                            </p>
                          )}

                          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-[10px] font-bold transition shadow-2xs cursor-pointer self-start sm:self-auto">
                            <span>
                              {uploadingReportId === rep.id
                                ? "Uploading..."
                                : rep.homework_submission_url
                                ? "Re-upload Homework"
                                : "Upload Homework"}
                            </span>
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              className="hidden"
                              disabled={uploadingReportId === rep.id}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleStudentHomeworkUpload(rep.id, file);
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    )}
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