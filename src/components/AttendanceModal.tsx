'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface AttendanceModalProps {
  isOpen: boolean
  onClose: () => void
  eventId: string
  studentId: string
  studentName: string
  initialStatus: 'absent' | 'cancelled'
  eventType?: 'regular' | 'makeup'
  dateString?: string
}

export default function AttendanceModal({
  isOpen,
  onClose,
  eventId,
  studentId,
  studentName,
  initialStatus,
  eventType = 'regular',
  dateString,
}: AttendanceModalProps) {
  const [status, setStatus] = useState<'absent' | 'cancelled'>(initialStatus)
  const [makeupRequested, setMakeupRequested] = useState(false)
  const [makeupDateTime, setMakeupDateTime] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    setStatus(initialStatus)
    setMakeupRequested(false)
    setMakeupDateTime('')
  }, [initialStatus, isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert("Session expired. Please log in again.")
        return
      }

      const targetDate = dateString || new Date().toISOString().split("T")[0]
      const formattedStatus = status === 'cancelled' ? 'Cancelled' : 'Absent'

      // 1. If modifying an existing make-up event directly
    // 1. If modifying an existing make-up event directly
      if (eventType === 'makeup') {
        const { error: makeupError } = await supabase
          .from("makeup_classes")
          .update({ status: formattedStatus })
          .eq("id", eventId)

        if (makeupError) throw makeupError

        // Allow creating a new make-up session when canceling an existing make-up class
        if (makeupRequested && makeupDateTime) {
          const { error: newMakeupErr } = await supabase
            .from('makeup_classes')
            .insert({
              student_id: studentId,
              teacher_id: user.id,
              original_event_id: eventId,
              makeup_date: makeupDateTime,
              duration: 40,
              topic: 'Make-up Class (Rescheduled)',
              status: 'Scheduled'
            })

          if (newMakeupErr) throw newMakeupErr
        }
      } else {
        // 2. Mark the regular class status in the 'lessons' table (Grays it out on calendar)
        const { data: existingLesson } = await supabase
          .from("lessons")
          .select("id")
          .eq("student_id", studentId)
          .eq("lesson_date", targetDate)
          .maybeSingle()

        if (existingLesson) {
          const { error: updateLessonErr } = await supabase
            .from("lessons")
            .update({
              status: formattedStatus,
              description: `Class marked as ${formattedStatus}`
            })
            .eq("id", existingLesson.id)

          if (updateLessonErr) throw updateLessonErr
        } else {
          const { error: insertLessonErr } = await supabase
            .from("lessons")
            .insert({
              student_id: studentId,
              teacher_id: user.id,
              lesson_date: targetDate,
              status: formattedStatus,
              title: `${formattedStatus} Class`,
              description: `Class marked as ${formattedStatus}`
            })

          if (insertLessonErr) throw insertLessonErr
        }

        // 3. Create the new Make-up Class entry if requested
        if (makeupRequested && makeupDateTime) {
          const { data: scheduleData } = await supabase
            .from('schedules')
            .select('*')
            .eq('id', eventId)
            .maybeSingle()

          const { error: insertMakeupErr } = await supabase
            .from('makeup_classes')
            .insert({
              student_id: studentId,
              teacher_id: user.id,
              original_event_id: eventId,
              makeup_date: makeupDateTime,
              duration: scheduleData?.duration || 40,
              topic: `Make-up: ${scheduleData?.topic || 'Regular Class'}`,
              status: 'Scheduled'
            })

          if (insertMakeupErr) throw insertMakeupErr
        }
      }

      onClose()
    } catch (err: any) {
      console.error('Error updating attendance:', err)
      alert('Failed to save attendance: ' + (err.message || err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-gray-100">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900">
            Manage Attendance: {studentName}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'absent' | 'cancelled')}
              className="w-full border border-gray-200 rounded-xl p-2 text-sm focus:ring-2 focus:ring-pink-500 outline-hidden bg-white"
            >
              <option value="absent">Absent</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {eventType === 'regular' && (
           <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="makeup"
              checked={makeupRequested}
              onChange={(e) => setMakeupRequested(e.target.checked)}
              className="rounded border-gray-300 text-pink-600 focus:ring-pink-500 w-4 h-4 cursor-pointer"
            />
            <label htmlFor="makeup" className="text-xs font-bold text-gray-700 cursor-pointer">
              Request Make-up Class
            </label>
          </div>
          )}

          {makeupRequested && (
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Make-up Date & Time
              </label>
              <input
                type="datetime-local"
                value={makeupDateTime}
                onChange={(e) => setMakeupDateTime(e.target.value)}
                className="w-full border border-gray-200 rounded-xl p-2 text-sm focus:ring-2 focus:ring-pink-500 outline-hidden"
                required={makeupRequested}
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}