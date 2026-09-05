"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Trash2, Edit3, BookOpen, AlertCircle } from "lucide-react";

interface Lesson {
  id: string;
  student_id: string;
  title: string;
  lesson_date: string;
  duration: number;
  status: string;
  description?: string;
}

interface LessonHistoryProps {
  studentId: string;
  lessons: Lesson[];
  onLessonsChange: () => void;
}

export default function LessonHistory({
  studentId,
  lessons,
  onLessonsChange,
}: LessonHistoryProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete(lessonId: string) {
    setIsDeleting(true);

    const { error } = await supabase
      .from("lessons")
      .delete()
      .eq("id", lessonId);

    if (error) {
      alert("Error deleting lesson: " + error.message);
    } else {
      // Recalculate completed count for student
      const { data: remainingLessons } = await supabase
        .from("lessons")
        .select("id, status")
        .eq("student_id", studentId);

      const completedCount = (remainingLessons || []).filter(
        (l) => l.status === "Completed"
      ).length;

      await supabase
        .from("students")
        .update({ classes_completed: completedCount })
        .eq("id", studentId);

      setDeletingId(null);
      onLessonsChange();
    }

    setIsDeleting(false);
  }

  return (
    <div className="space-y-4">
      {lessons.map((lesson) => (
        <div
          key={lesson.id}
          className="bg-white border border-pink-100 rounded-2xl p-5 shadow-xs flex justify-between items-start gap-4 hover:border-pink-200 transition"
        >
          {/* Lesson Details */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <BookOpen size={16} className="text-pink-600" />
              <h4 className="font-bold text-sm text-pink-950">
                {lesson.title}
              </h4>
            </div>

            <div className="text-xs text-gray-500 space-y-0.5">
              <p>Date: {lesson.lesson_date}</p>
              <p>Duration: {lesson.duration} minutes</p>
              <p>
                Status:{" "}
                <span
                  className={`font-semibold ${
                    lesson.status === "Completed"
                      ? "text-emerald-600"
                      : lesson.status === "Absent"
                      ? "text-rose-600"
                      : "text-gray-400 line-through"
                  }`}
                >
                  {lesson.status}
                </span>
              </p>
            </div>

            {lesson.description && (
              <p className="text-xs text-gray-400 italic pt-1">
                {lesson.description}
              </p>
            )}
          </div>

          {/* Action Icons with Inline Confirm Tooltip */}
          <div className="flex items-center gap-2 relative">
            <button
              type="button"
              className="p-1.5 text-pink-400 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition"
            >
              <Edit3 size={15} />
            </button>

            {/* Trash Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setDeletingId(deletingId === lesson.id ? null : lesson.id)
                }
                className="p-1.5 text-pink-400 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition"
              >
                <Trash2 size={15} />
              </button>

              {/* Inline Confirmation Popup right next to trash icon */}
              {deletingId === lesson.id && (
                <div className="absolute right-0 top-8 w-48 bg-white border border-pink-200 rounded-2xl p-3 shadow-xl z-30 animate-in fade-in zoom-in-95 duration-100">
                  <p className="text-[11px] font-semibold text-gray-800 mb-2.5 leading-tight">
                    Delete this lesson?
                  </p>
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setDeletingId(null)}
                      className="px-2.5 py-1 text-[10px] font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={() => handleDelete(lesson.id)}
                      className="px-2.5 py-1 text-[10px] font-bold text-white bg-pink-600 hover:bg-pink-700 rounded-lg transition shadow-xs disabled:opacity-50"
                    >
                      {isDeleting ? "..." : "Delete"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}