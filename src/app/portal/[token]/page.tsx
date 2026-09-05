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
  const [parentRequestText, setParentRequestText] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
const [uploadingReportId, setUploadingReportId] = useState<string | null>(null);

async function handleStudentHomeworkUpload(reportId: string, file: File) {
  if (!file || !student) return;
  setUploadingReportId(reportId);

  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `submissions/${student.id}/${reportId}-${Date.now()}.${fileExt}`;

    // Upload to Supabase storage
    const { error: uploadError } = await supabase.storage
      .from("homework-files")
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from("homework-files")
      .getPublicUrl(fileName);

    const submissionUrl = publicUrlData.publicUrl;

    // Update class report record with student submission
    const { error: dbError } = await supabase
      .from("class_reports")
      .update({
        homework_submission_url: submissionUrl,
        homework_submitted_at: new Date().toISOString(),
        homework_status: "Submitted",
      })
      .eq("id", reportId);

    if (dbError) throw dbError;

    // Update local state so UI updates immediately
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

        const [{ data: scheds }, { data: repList }] = await Promise.all([
          supabase.from("schedules").select("*").eq("student_id", studentData.id),
          supabase
            .from("class_reports")
            .select("*")
            .eq("student_id", studentData.id)
            .order("report_date", { ascending: false }),
        ]);

        if (scheds) setSchedules(scheds);
        if (repList) setReports(repList);
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
      <div className="min-h-screen flex items-center justify-center bg-pink-50/20 text-pink-600 font-bold text-sm">
        Loading Student Learning Hub...
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-pink-50/20 text-gray-500 text-sm">
        Student portal link is invalid or expired.
      </div>
    );
  }

  const remainingClasses = Math.max(
    (student.classes_included || 0) - (student.classes_completed || 0),
    0
  );

  return (
    <div className="min-h-screen bg-pink-50/20 p-6 md:p-10 font-sans max-w-4xl mx-auto space-y-6">
      {/* Portal Header */}
      <div className="bg-white border border-pink-100 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold text-pink-600 tracking-widest uppercase bg-pink-50 px-2.5 py-1 rounded-lg border border-pink-200">
            Student Learning Portal
          </span>
          <h1 className="text-3xl font-extrabold text-pink-950 mt-2">{student.name}</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Instructor: <strong className="text-gray-800">{student.teacher_alias || "Teacher Gabi"}</strong>
          </p>
        </div>

        {student.meeting_link && (
          <a
            href={student.meeting_link}
            target="_blank"
            rel="noreferrer"
            className="px-5 py-3.5 bg-pink-600 hover:bg-pink-700 text-white rounded-2xl text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <Video size={18} />
            <span>Join Live Classroom ({student.classroom_platform || "Meeting"})</span>
          </a>
        )}
      </div>

      {/* Package & Schedule Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white border border-pink-100 rounded-3xl p-5 shadow-xs space-y-3">
          <h3 className="font-bold text-gray-900 text-sm">Class Package Progress</h3>
          <div className="grid grid-cols-2 gap-3 text-center text-xs">
            <div className="p-3.5 bg-pink-50/40 rounded-2xl border border-pink-50">
              <p className="text-gray-400 font-semibold text-[10px] uppercase">Completed</p>
              <p className="text-2xl font-extrabold text-gray-900 mt-0.5">{student.classes_completed || 0}</p>
            </div>
            <div className="p-3.5 bg-pink-50/40 rounded-2xl border border-pink-50">
              <p className="text-gray-400 font-semibold text-[10px] uppercase">Remaining</p>
              <p className="text-2xl font-extrabold text-pink-600 mt-0.5">{remainingClasses}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-pink-100 rounded-3xl p-5 shadow-xs space-y-3">
          <h3 className="font-bold text-gray-900 text-sm">Class Schedule</h3>
          {schedules.length === 0 ? (
            <p className="text-xs text-gray-400 italic">Schedule to be confirmed.</p>
          ) : (
            <div className="space-y-1.5 text-xs">
              {schedules.map((s) => (
                <div key={s.id} className="flex justify-between p-2.5 bg-pink-50/40 rounded-xl">
                  <span className="font-bold text-gray-700">{s.day_of_week}</span>
                  <span className="text-pink-600 font-semibold">{s.start_time || s.time}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Interactive Parent Request Box */}
      <div className="bg-white border border-pink-100 rounded-3xl p-6 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
            <MessageSquare size={16} className="text-pink-600" />
            <span>Parent Requests & Learning Notes</span>
          </h3>
          {savedSuccess && (
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 size={14} /> Saved!
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500">
          Have special focus requests, upcoming school exams, or notes for {student.teacher_alias || "the teacher"}? Leave them here anytime.
        </p>

        <textarea
          rows={3}
          placeholder="e.g. Please focus on speaking fluency; Chip has an English presentation this Thursday."
          className="w-full text-xs p-3 rounded-2xl border border-pink-200 focus:outline-pink-500 bg-pink-50/20"
          value={parentRequestText}
          onChange={(e) => setParentRequestText(e.target.value)}
        />
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSaveRequest}
            className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
          >
            Submit Note to Teacher
          </button>
        </div>
      </div>

      {/* Daily Class Reports, Lesson History & Teacher Feedback */}
      <div className="bg-white border border-pink-100 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
            <BookOpen size={16} className="text-pink-600" />
            <span>Daily Lesson History & Teacher Feedback</span>
          </h3>
          <span className="text-[11px] font-bold text-pink-600 bg-pink-50 px-2.5 py-0.5 rounded-lg border border-pink-200">
            {reports.length} {reports.length === 1 ? "Session" : "Sessions"} Logged
          </span>
        </div>

        {reports.length === 0 ? (
          <div className="p-8 text-center bg-pink-50/30 rounded-2xl border border-pink-100">
            <p className="text-xs text-gray-400 italic">No daily lesson reports recorded yet.</p>
            <p className="text-[11px] text-gray-400 mt-1">Lesson notes, new vocabulary, and homework will appear here after class.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((rep, idx) => (
              <div
                key={rep.id || idx}
                className="p-5 bg-pink-50/30 rounded-2xl border border-pink-100 text-xs space-y-3"
              >
                {/* Lesson Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-pink-100/60 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-pink-600 text-white text-[10px] font-extrabold rounded-md uppercase">
                      Lesson
                    </span>
                    <h4 className="font-bold text-pink-950 text-sm">{rep.lesson_title}</h4>
                  </div>
                  <span className="text-gray-400 text-[11px] flex items-center gap-1 font-medium">
                    <Calendar size={12} /> {rep.report_date}
                  </span>
                </div>

                {/* Vocabulary & Target Sentences */}
                {rep.vocabulary && (
                  <div className="space-y-1">
                    <span className="font-bold text-gray-800 flex items-center gap-1.5 text-[11px]">
                      <Sparkles size={13} className="text-pink-600" /> Vocabulary & Target Structures:
                    </span>
                    <p className="text-gray-700 bg-white/80 p-2.5 rounded-xl border border-pink-100 leading-relaxed font-mono text-[11px]">
                      {rep.vocabulary}
                    </p>
                  </div>
                )}

                {/* Feedback: Strengths & Improvement */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {rep.strengths && (
                    <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 space-y-1">
                      <span className="font-bold text-emerald-800 flex items-center gap-1 text-[11px]">
                        <Award size={13} className="text-emerald-600" /> Strengths & Highlights:
                      </span>
                      <p className="text-emerald-900 leading-relaxed text-[11px]">{rep.strengths}</p>
                    </div>
                  )}

                  {rep.improvements && (
                    <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100 space-y-1">
                      <span className="font-bold text-amber-800 flex items-center gap-1 text-[11px]">
                        <TrendingUp size={13} className="text-amber-600" /> Next Focus / Tips:
                      </span>
                      <p className="text-amber-900 leading-relaxed text-[11px]">{rep.improvements}</p>
                    </div>
                  )}
                </div>
{(rep.homework || rep.homework_file_url) && (
  <div className="p-4 bg-pink-100/40 rounded-2xl border border-pink-200 text-pink-950 space-y-3">
    <div className="flex items-center justify-between">
      <span className="font-bold flex items-center gap-1.5 text-xs text-pink-900">
        <FileCheck size={15} className="text-pink-600" />
        <span>Assigned Homework / Review (Optional):</span>
      </span>

      {/* Submission Status Badge */}
      <span
        className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
          rep.homework_status === "Submitted"
            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
            : "bg-pink-100 text-pink-700 border border-pink-200"
        }`}
      >
        {rep.homework_status === "Submitted" ? "✓ Submitted" : "Pending"}
      </span>
    </div>

    {rep.homework && (
      <p className="leading-relaxed text-[11px] font-medium text-gray-800 bg-white/70 p-2.5 rounded-xl border border-pink-100">
        {rep.homework}
      </p>
    )}

    {/* Teacher Attachment Download */}
    {rep.homework_file_url && (
      <div>
        <a
          href={rep.homework_file_url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-pink-200 text-pink-700 font-bold rounded-lg text-[10px] hover:bg-pink-50 transition shadow-2xs"
        >
          <span>📄 View Teacher Worksheet / Page</span>
        </a>
      </div>
    )}

    {/* Student Homework Submission Upload Area */}
    <div className="pt-2 border-t border-pink-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
      {rep.homework_submission_url ? (
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-emerald-700 font-bold">Completed File:</span>
          <a
            href={rep.homework_submission_url}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-pink-600 font-semibold underline hover:text-pink-700"
          >
            View Submitted Homework
          </a>
        </div>
      ) : (
        <p className="text-[10px] text-gray-500 italic">
          Upload photo of worksheet or notebook when done.
        </p>
      )}

      {/* Upload Button */}
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
  );
}