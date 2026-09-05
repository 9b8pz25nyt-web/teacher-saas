"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { RotateCcw } from "lucide-react";

interface ClassEventProps {
  time?: string;
  student: string;
  studentId: string;
  book?: string;
  bookId?: string;
  status?: string;
  dateString: string;
  duration?: number;
  topic?: string;
  onStatusUpdate?: () => void;
}

export default function ClassEvent({
  time,
  student,
  studentId,
  status = "Scheduled",
  dateString,
  duration = 40,
  topic = "Regular Class",
  onStatusUpdate,
}: ClassEventProps) {
  const router = useRouter();
  const [currentStatus, setCurrentStatus] = useState(status);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setCurrentStatus(status);
  }, [status]);

  async function handleMarkPresent() {
    if (!studentId || isSubmitting) return;
    setIsSubmitting(true);
    setCurrentStatus("Completed");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: existingLesson } = await supabase
        .from("lessons")
        .select("id")
        .eq("student_id", studentId)
        .eq("lesson_date", dateString)
        .maybeSingle();

      if (existingLesson) {
        await supabase
          .from("lessons")
          .update({ status: "Completed", description: "Class marked as Completed" })
          .eq("id", existingLesson.id);
      } else {
        await supabase.from("lessons").insert({
          student_id: studentId,
          teacher_id: user.id,
          title: `Completed: ${topic}`,
          lesson_date: dateString,
          duration: Number(duration),
          status: "Completed",
          description: "Class marked as Completed",
        });
      }

      if (onStatusUpdate) onStatusUpdate();
      router.push(`/students/${studentId}?action=log_lesson&date=${dateString}`);
    } catch (err: any) {
      console.error("Error marking present:", err);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleQuickStatus(newStatus: "Absent" | "Cancelled") {
    if (isSubmitting || !studentId) return;
    setIsSubmitting(true);
    setCurrentStatus(newStatus);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: existingLesson } = await supabase
        .from("lessons")
        .select("id")
        .eq("student_id", studentId)
        .eq("lesson_date", dateString)
        .maybeSingle();

      if (existingLesson) {
        await supabase
          .from("lessons")
          .update({ status: newStatus, description: `Class marked as ${newStatus}` })
          .eq("id", existingLesson.id);
      } else {
        await supabase.from("lessons").insert({
          student_id: studentId,
          teacher_id: user.id,
          title: `${newStatus}: ${topic}`,
          lesson_date: dateString,
          duration: Number(duration),
          status: newStatus,
          description: `Class marked as ${newStatus}`,
        });
      }

      if (onStatusUpdate) onStatusUpdate();
    } catch (err: any) {
      console.error("Error updating status:", err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRedoStatus() {
    if (isSubmitting || !studentId) return;
    setIsSubmitting(true);
    setCurrentStatus("Scheduled");

    try {
      await supabase
        .from("lessons")
        .delete()
        .eq("student_id", studentId)
        .eq("lesson_date", dateString);

      if (onStatusUpdate) onStatusUpdate();
    } catch (err: any) {
      console.error("Error resetting status:", err);
    } finally {
      setIsSubmitting(false);
    }
  }

  const isCompleted = currentStatus === "Completed";
  const isAbsent = currentStatus === "Absent";
  const isCancelled = currentStatus === "Cancelled";
  const isMarked = isCompleted || isAbsent || isCancelled;

  return (
    <div className="relative group my-0.5">
      <div
        className={`px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between gap-1.5 transition font-medium cursor-pointer ${
          isMarked
            ? "bg-gray-100 text-gray-400 border border-gray-200 opacity-70"
            : "bg-pink-50/85 hover:bg-pink-100 text-pink-950 border border-pink-100"
        }`}
      >
        <span className={`font-mono text-[10px] font-bold shrink-0 ${isMarked ? "text-gray-400" : "text-pink-600"}`}>
          {time || "18:00"}
        </span>
        <span className={`truncate font-extrabold flex-1 text-left ${isAbsent || isCancelled ? "text-gray-400 line-through" : isCompleted ? "text-gray-400" : "text-gray-900"}`}>
          {student}
        </span>
      </div>

      <div className="invisible opacity-0 group-hover:visible group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-white border border-pink-200 rounded-xl shadow-xl px-1.5 py-1 flex items-center gap-1 z-50 whitespace-nowrap transition-all duration-150 pointer-events-none group-hover:pointer-events-auto">
        {!isMarked ? (
          <>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleMarkPresent}
              className="py-1 px-2.5 bg-pink-600 hover:bg-pink-700 text-white font-bold text-[10px] rounded-lg transition cursor-pointer shadow-xs"
            >
              Present
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleQuickStatus("Absent")}
              className="py-1 px-2.5 bg-pink-100 hover:bg-pink-200 text-pink-900 border border-pink-200 font-bold text-[10px] rounded-lg transition cursor-pointer"
            >
              Absent
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleQuickStatus("Cancelled")}
              className="py-1 px-2.5 bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200/60 font-bold text-[10px] rounded-lg transition cursor-pointer"
            >
              Cancel
            </button>
          </>
        ) : (
          <div className="flex items-center gap-1.5 px-1 text-[10px]">
            <span className="text-gray-500 font-medium">
              Status: <strong className="text-pink-900">{currentStatus}</strong>
            </span>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleRedoStatus}
              className="py-0.5 px-2 bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 font-bold rounded-lg transition flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw size={10} />
              <span>{isSubmitting ? "Processing..." : "Undo"}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}