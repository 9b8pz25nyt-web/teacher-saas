"use client";

import { useState } from "react";
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

  // 1. Present: Redirects to student details to fill in report and deduct class
  function handleMarkPresent() {
    if (!studentId || isSubmitting) return;
    router.push(`/students/${studentId}?action=log_lesson&date=${dateString}`);
  }

  // 2. Absent & Cancel: Logs status without deducting any class balance
  async function handleQuickStatus(newStatus: "Absent" | "Cancelled") {
    if (isSubmitting || !studentId) return;
    setIsSubmitting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("Please log in to record status.");
        return;
      }

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
            status: newStatus,
            description: `Class marked as ${newStatus}`,
          })
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

      setCurrentStatus(newStatus);
      if (onStatusUpdate) onStatusUpdate();
    } catch (err: any) {
      console.error("Error updating status:", err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  // 3. Complete Undo: Deletes report, cleans up storage, returns class balance, and resets calendar slot
  async function handleRevertStatus() {
    if (isSubmitting || !studentId) return;
    setIsSubmitting(true);

    try {
      // Step A: Check if a class_report exists for this student & date
      const { data: reports } = await supabase
        .from("class_reports")
        .select("id, homework_file_url, homework_submission_url")
        .eq("student_id", studentId)
        .eq("report_date", dateString);

      if (reports && reports.length > 0) {
        const filesToDelete: string[] = [];

        reports.forEach((rep) => {
          if (rep.homework_file_url) {
            const parts = rep.homework_file_url.split("/homework-files/");
            if (parts[1]) filesToDelete.push(decodeURIComponent(parts[1]));
          }
          if (rep.homework_submission_url) {
            const parts = rep.homework_submission_url.split("/homework-files/");
            if (parts[1]) filesToDelete.push(decodeURIComponent(parts[1]));
          }
        });

        // Delete associated files from storage bucket
        if (filesToDelete.length > 0) {
          await supabase.storage.from("homework-files").remove(filesToDelete);
        }

        // Delete report record(s)
        await supabase
          .from("class_reports")
          .delete()
          .eq("student_id", studentId)
          .eq("report_date", dateString);

        // Fetch current student record to decrement classes_completed (return credit)
        const { data: studentData } = await supabase
          .from("students")
          .select("classes_completed")
          .eq("id", studentId)
          .single();

        if (studentData) {
          const restoredCount = Math.max((studentData.classes_completed || 1) - reports.length, 0);
          await supabase
            .from("students")
            .update({ classes_completed: restoredCount })
            .eq("id", studentId);
        }
      }

      // Step B: Delete any matching lesson record
      await supabase
        .from("lessons")
        .delete()
        .eq("student_id", studentId)
        .eq("lesson_date", dateString);

      setCurrentStatus("Scheduled");
      if (onStatusUpdate) onStatusUpdate();
    } catch (err: any) {
      console.error("Error undoing status:", err);
      alert("Failed to revert class: " + (err.message || err));
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
      {/* Calendar Badge */}
      <div
        className={`px-2 py-1 rounded-lg text-[11px] border flex items-center justify-between gap-1.5 transition ${
          isCompleted
            ? "bg-pink-100/70 border-pink-300 text-pink-950 font-semibold opacity-90"
            : isAbsent
            ? "bg-rose-50/80 border-rose-200 text-rose-900 line-through opacity-60"
            : isCancelled
            ? "bg-pink-50/40 border-pink-100 text-pink-400 line-through opacity-50"
            : "bg-pink-50/70 hover:bg-pink-100/80 border-pink-200 text-pink-950 shadow-2xs cursor-pointer"
        }`}
      >
        <span className="font-mono text-[10px] text-pink-700 font-bold shrink-0">
          {time || "18:00"}
        </span>
        <span className="truncate font-extrabold text-gray-900 flex-1 text-left">
          {student}
        </span>

        {isCompleted && (
          <span className="text-[8px] bg-pink-600 text-white px-1 py-0.2 rounded font-bold uppercase shrink-0">
            Done
          </span>
        )}
        {isAbsent && (
          <span className="text-[8px] bg-rose-200 text-rose-800 px-1 py-0.2 rounded font-bold uppercase shrink-0">
            Absent
          </span>
        )}
        {isCancelled && (
          <span className="text-[8px] bg-pink-100 text-pink-600 px-1 py-0.2 rounded font-bold uppercase shrink-0">
            Cancelled
          </span>
        )}
      </div>

      {/* Hover Action Popover */}
      <div className="hidden group-hover:flex absolute -top-8 left-1/2 -translate-x-1/2 bg-white border border-pink-200 rounded-xl shadow-lg p-1 items-center gap-1 z-30 whitespace-nowrap animate-in fade-in zoom-in-95 duration-100">
        {!isMarked ? (
          <>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleMarkPresent}
              className="py-0.5 px-2 bg-pink-600 hover:bg-pink-700 text-white font-bold text-[10px] rounded-lg transition cursor-pointer shadow-2xs"
            >
              Present
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleQuickStatus("Absent")}
              className="py-0.5 px-2 bg-pink-100 hover:bg-pink-200 text-pink-800 border border-pink-200 font-bold text-[10px] rounded-lg transition cursor-pointer"
            >
              Absent
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleQuickStatus("Cancelled")}
              className="py-0.5 px-2 bg-pink-50 hover:bg-pink-100 text-pink-500 border border-pink-200/60 font-bold text-[10px] rounded-lg transition cursor-pointer"
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
              onClick={handleRevertStatus}
              className="py-0.5 px-2 bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 font-bold rounded-lg transition flex items-center gap-1 cursor-pointer"
              title="Undo status, remove logged report, and return class credit"
            >
              <RotateCcw size={10} />
              <span>{isSubmitting ? "Reverting..." : "Undo / Return Credit"}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}