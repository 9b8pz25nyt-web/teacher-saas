'use client';

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { RotateCcw, Trash2 } from "lucide-react";

interface ClassEventProps {
  id?: string;
  type?: 'regular' | 'makeup';
  eventType?: 'regular' | 'makeup';
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
  onOpenModal?: (statusPreset?: 'present' | 'absent' | 'cancelled') => void;
}

export default function ClassEvent({
  id,
  type = 'regular',
  time,
  student,
  studentId,
  status = "Scheduled",
  dateString,
  duration = 40,
  topic = "Regular Class",
  onStatusUpdate,
  onOpenModal,
}: ClassEventProps) {

  const [currentStatus, setCurrentStatus] = useState(status);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showActions, setShowActions] = useState(false);

  useEffect(() => {
    setCurrentStatus(status);
  }, [status]);

  async function handleMarkPresent() {
    if (!studentId || isSubmitting) return;

    setIsSubmitting(true);
    setCurrentStatus("Completed");
    setShowActions(false);

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
          .update({
            status: "Completed",
            description: "Class marked as Completed"
          })
          .eq("id", existingLesson.id);
      } else {
        await supabase
          .from("lessons")
          .insert({
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
    } catch (err) {
      console.error("Error marking present:", err);
    } finally {
      setIsSubmitting(false);
    }
  }

 async function handleRedoStatus() {
    if (isSubmitting || !studentId) return;

    setIsSubmitting(true);
    setCurrentStatus("Scheduled");
    setShowActions(false);

    try {
      if (type === "makeup") {
        // 1. Reset make-up status back to Scheduled
        await supabase
          .from("makeup_classes")
          .update({ status: "Scheduled" })
          .eq("id", id);
      }

      // 2. Delete the record from 'lessons' table (clears calendar completion)
      await supabase
        .from("lessons")
        .delete()
        .eq("student_id", studentId)
        .eq("lesson_date", dateString);

      // 3. Delete the corresponding logged lesson report from 'class_reports'
      await supabase
        .from("class_reports")
        .delete()
        .eq("student_id", studentId)
        .or(`report_date.eq.${dateString},lesson_date.eq.${dateString}`);

      // 4. Decrement classes_completed count on the student profile
      const { data: studentData } = await supabase
        .from("students")
        .select("classes_completed")
        .eq("id", studentId)
        .single();

      if (studentData && (studentData.classes_completed || 0) > 0) {
        await supabase
          .from("students")
          .update({ classes_completed: Math.max(0, studentData.classes_completed - 1) })
          .eq("id", studentId);
      }

      if (onStatusUpdate) onStatusUpdate();
    } catch (err) {
      console.error("Error resetting status:", err);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteEvent() {
    if (!confirm("Are you sure you want to completely remove this canceled event from the calendar?")) return;

    setIsSubmitting(true);
    try {
      if (type === 'makeup') {
        await supabase
          .from("makeup_classes")
          .delete()
          .eq('id', id);
      } else {
        await supabase
          .from("lessons")
          .delete()
          .eq("student_id", studentId)
          .eq("lesson_date", dateString);
      }

      if (onStatusUpdate) onStatusUpdate();
    } catch (err) {
      console.error("Error deleting event:", err);
    } finally {
      setIsSubmitting(false);
    }
  }

  const statusLower = (currentStatus || "").toLowerCase();
  const isCompleted = statusLower === "completed";
  const isAbsent = statusLower === "absent";
  const isCancelled = statusLower === "cancelled";
  const isMarked = isCompleted || isAbsent || isCancelled;

  return (
    <div className="relative my-0.5">
      <div
        onClick={() => setShowActions(!showActions)}
        className={`px-2 py-1 rounded-lg text-xs flex flex-col gap-1 transition font-medium cursor-pointer shadow-xs z-30 relative ${
          isMarked
            ? "bg-gray-100 text-gray-400 border border-gray-200 line-through opacity-75"
            : "bg-pink-50 hover:bg-pink-100 text-pink-950 border border-pink-200"
        }`}
      >
        <div className="flex items-center justify-between gap-1.5 w-full">
          <span className="font-mono text-[10px] font-semibold shrink-0">
            {time || "18:00"}
          </span>
          <span className="truncate font-bold text-xs flex-1 text-left">
            {student}
          </span>
        </div>

        {showActions && (
          <div className="pt-1 mt-1 border-t border-pink-200 flex flex-col gap-1 w-full" onClick={(e) => e.stopPropagation()}>
            {!isMarked ? (
              <div className="flex items-center justify-between gap-1">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowActions(false);
                    if (onOpenModal) {
                      onOpenModal("present");
                    }
                  }}
                  className="flex-1 py-1 bg-pink-600 hover:bg-pink-700 text-white font-bold text-[10px] rounded-md transition text-center cursor-pointer"
                >
                  Present
                </button>
        
                <button
                  type="button"
                  onClick={() => {
                    setShowActions(false);
                    if (onOpenModal) onOpenModal("absent");
                  }}
                  className="flex-1 py-1 bg-pink-100 hover:bg-pink-200 text-pink-900 border border-pink-200 font-bold text-[10px] rounded-md transition text-center cursor-pointer"
                >
                  Absent
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowActions(false);
                    if (onOpenModal) onOpenModal("cancelled");
                  }}
                  className="flex-1 py-1 bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 font-bold text-[10px] rounded-md transition text-center cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between px-1 text-[10px] gap-1">
                <span className="text-gray-500 font-medium truncate">
                  {currentStatus}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleRedoStatus}
                    className="py-0.5 px-1.5 bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 font-bold rounded-md transition flex items-center gap-0.5 cursor-pointer"
                    title="Undo status back to scheduled"
                  >
                    <RotateCcw size={10} />
                    <span>Undo</span>
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleDeleteEvent}
                    className="py-0.5 px-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold rounded-md transition flex items-center gap-0.5 cursor-pointer"
                    title="Remove from calendar"
                  >
                    <Trash2 size={10} />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}