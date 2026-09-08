'use server'

import { supabase } from "@/lib/supabase";

export async function updateAttendanceAndMakeup({
  eventId,
  studentId,
  status,
  makeupRequested,
  makeupDateTime,
  eventType,
  dateString
}: {
  eventId: string;
  studentId: string;
  status: 'absent' | 'cancelled';
  makeupRequested?: boolean;
  makeupDateTime?: string;
  eventType?: 'regular' | 'makeup';
  dateString?: string;
}) {
  try {
    const targetDate = dateString || new Date().toISOString().split("T")[0];
    const formattedStatus = status === 'cancelled' ? 'Cancelled' : 'Absent';

    // 1. If modifying a makeup event directly (e.g., cancelling a makeup class)
    if (eventType === 'makeup') {
      const { error: makeupError } = await supabase
        .from("makeup_classes")
        .update({ status: formattedStatus })
        .eq("id", eventId);

      if (makeupError) throw makeupError;
      return { success: true };
    }

    // 2. Handle regular class attendance / cancellation in the lessons table
    const { data: existingLesson } = await supabase
      .from("lessons")
      .select("id")
      .eq("student_id", studentId)
      .eq("lesson_date", targetDate)
      .maybeSingle();

    if (existingLesson) {
      await supabase
        .from("lessons")
        .update({ status: formattedStatus })
        .eq("id", existingLesson.id);
    } else {
      await supabase
        .from("lessons")
        .insert({
          student_id: studentId,
          lesson_date: targetDate,
          status: formattedStatus,
          title: `${formattedStatus} Class`,
          description: `Class marked as ${status}`
        });
    }

    // 3. Handle scheduling a new makeup class if requested
    if (eventType === 'regular' && makeupRequested && makeupDateTime) {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: schedules } = await supabase.from('schedules').select('*').eq('id', eventId);
      const original = schedules?.[0];

      const { error: insertError } = await supabase.from('makeup_classes').insert({
        student_id: studentId,
        teacher_id: user?.id,
        original_event_id: eventId,
        makeup_date: makeupDateTime,
        duration: original?.duration || 40,
        topic: `Make-up: ${original?.topic || 'Regular Class'}`,
        status: 'Scheduled'
      });

      if (insertError) {
        console.error("Makeup insert error:", insertError.message);
        throw insertError;
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error("Action error:", err);
    return { success: false, error: err.message };
  }
}