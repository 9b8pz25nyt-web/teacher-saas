"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { FileCheck, Calendar, User, ExternalLink } from "lucide-react";

export default function TeacherSubmissionsPage() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSubmissions() {
      try {
        const { data, error } = await supabase
          .from("homework_submissions")
          .select("*, students(name, teacher_alias)")
          .order("created_at", { ascending: false });

        if (error) throw error;
        if (data) setSubmissions(data);
      } catch (err) {
        console.error("Error fetching submissions:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchSubmissions();
  }, []);

  if (loading) {
    return <div className="p-8 text-sm font-bold text-pink-600">Loading submissions...</div>;
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto">
      <div>
        <span className="text-[10px] font-bold text-pink-700 tracking-widest uppercase bg-pink-100 px-2.5 py-1 rounded-lg border border-pink-300">
          Instructor Dashboard
        </span>
        <h1 className="text-2xl font-extrabold text-gray-900 mt-2">Student Homework Submissions</h1>
        <p className="text-xs text-gray-600 mt-0.5">Review answers and files submitted by your students.</p>
      </div>

      {submissions.length === 0 ? (
        <div className="bg-white border-2 border-pink-300 rounded-3xl p-8 text-center text-gray-400 text-xs italic">
          No homework submissions received yet.
        </div>
      ) : (
        <div className="space-y-4">
          {submissions.map((sub) => (
            <div key={sub.id} className="bg-white border-2 border-pink-300 rounded-3xl p-6 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-pink-200 pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-pink-100 text-pink-700 rounded-xl border border-pink-300">
                    <User size={16} />
                  </span>
                  <div>
                    <h2 className="text-sm font-extrabold text-gray-900">{sub.students?.name || "Unknown Student"}</h2>
                    <p className="text-[10px] text-gray-500">Instructor: {sub.students?.teacher_alias || "Teacher Gabi"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span className="text-gray-500 flex items-center gap-1 font-mono">
                    <Calendar size={12} /> {new Date(sub.created_at).toLocaleString()}
                  </span>
                  <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-full font-bold text-[10px]">
                    {sub.status || "Submitted"}
                  </span>
                </div>
              </div>

              {sub.answer_text && (
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-gray-700">Submitted Answers:</span>
                  <p className="text-xs text-gray-900 bg-pink-50/40 p-3 rounded-2xl border-2 border-pink-200 whitespace-pre-wrap leading-relaxed">
                    {sub.answer_text}
                  </p>
                </div>
              )}

              {sub.file_url && (
                <div>
                  <a
                    href={sub.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                  >
                    <FileCheck size={14} />
                    <span>View Attached File / Image</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}