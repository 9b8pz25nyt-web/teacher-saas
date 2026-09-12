'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { Plus, Trash2, BookOpen } from 'lucide-react'

interface BookEntry {
  book_id: string
  start_page: string
  end_page: string
}

interface AttendanceModalProps {
  isOpen: boolean
  onClose: () => void
  eventId: string
  studentId: string
  studentName: string
  initialStatus: 'absent' | 'cancelled'
  eventType?: 'regular' | 'makeup'
  dateString?: string
  studentBooks?: any[] // List of books assigned to this student
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
  studentBooks = [],
}: AttendanceModalProps) {
  const [status, setStatus] = useState<'absent' | 'cancelled'>(initialStatus)
  const [makeupRequested, setMakeupRequested] = useState(false)
  const [makeupDate, setMakeupDate] = useState<Date | null>(null)
  const [customTime, setCustomTime] = useState('16:40')
  const [makeupDuration, setMakeupDuration] = useState<number>(40)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Dynamic Multi-Book State
  const [selectedBooks, setSelectedBooks] = useState<BookEntry[]>([
    { book_id: '', start_page: '', end_page: '' },
  ])

  useEffect(() => {
    setStatus(initialStatus)
    setMakeupRequested(false)
    setMakeupDate(null)
    setCustomTime('16:40')
    setMakeupDuration(40)
    setSelectedBooks([
      { book_id: studentBooks[0]?.id || '', start_page: '', end_page: '' },
    ])
  }, [initialStatus, isOpen, studentBooks])

  if (!isOpen) return null

  // Book List Array Manipulation Handlers
  const handleAddBook = () => {
    setSelectedBooks((prev) => [
      ...prev,
      { book_id: '', start_page: '', end_page: '' },
    ])
  }

  const handleRemoveBook = (index: number) => {
    setSelectedBooks((prev) => prev.filter((_, i) => i !== index))
  }

  const handleBookChange = (index: number, field: keyof BookEntry, value: string) => {
    setSelectedBooks((prev) => {
      const updated = [...prev]
      updated[index][field] = value
      return updated
    })
  }

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
      
      let makeupIsoString: string | null = null
      if (makeupDate && customTime) {
        const yyyy = makeupDate.getFullYear()
        const mm = String(makeupDate.getMonth() + 1).padStart(2, '0')
        const dd = String(makeupDate.getDate()).padStart(2, '0')
        const combined = new Date(`${yyyy}-${mm}-${dd}T${customTime}:00`)
        makeupIsoString = combined.toISOString()
      }

      // Filter valid book entries with selected IDs
      const validBooks = selectedBooks.filter((b) => b.book_id)

      // 1. If modifying an existing make-up event directly
      if (eventType === 'makeup') {
        const { error: makeupError } = await supabase
          .from("makeup_classes")
          .update({ 
            status: formattedStatus,
            book_progress: validBooks // Store multi-book entries JSON array
          })
          .eq("id", eventId)

        if (makeupError) throw makeupError

        if (makeupRequested && makeupIsoString) {
          const { error: newMakeupErr } = await supabase
            .from('makeup_classes')
            .insert({
              student_id: studentId,
              teacher_id: user.id,
              original_event_id: eventId,
              makeup_date: makeupIsoString,
              duration: makeupDuration,
              topic: 'Make-up Class (Rescheduled)',
              status: 'Scheduled',
              book_progress: validBooks
            })

          if (newMakeupErr) throw newMakeupErr
        }
      } else {
        // 2. Mark the regular class status in the 'lessons' table
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
              description: `Class marked as ${formattedStatus}`,
              book_progress: validBooks
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
              description: `Class marked as ${formattedStatus}`,
              book_progress: validBooks
            })

          if (insertLessonErr) throw insertLessonErr
        }

        // 3. Create the new Make-up Class entry if requested
        if (makeupRequested && makeupIsoString) {
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
              makeup_date: makeupIsoString,
              duration: makeupDuration,
              topic: `Make-up: ${scheduleData?.topic || 'Regular Class'}`,
              status: 'Scheduled',
              book_progress: validBooks
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
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-gray-100 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
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
              className="w-full border border-gray-200 rounded-xl p-2 text-sm focus:ring-2 focus:ring-pink-500 outline-hidden bg-white cursor-pointer"
            >
              <option value="absent">Absent</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Multi-Book Progress Tracker Section */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <BookOpen size={14} className="text-pink-600" />
                <span>Assigned Books & Pages</span>
              </label>
              <button
                type="button"
                onClick={handleAddBook}
                className="text-xs font-bold text-pink-600 hover:text-pink-700 flex items-center gap-1 cursor-pointer"
              >
                <Plus size={14} />
                <span>Add Book</span>
              </button>
            </div>

            {selectedBooks.map((entry, index) => (
              <div
                key={index}
                className="p-3 bg-pink-50/40 rounded-2xl border border-pink-100 space-y-2 relative"
              >
                {selectedBooks.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveBook(index)}
                    className="absolute top-2.5 right-2.5 text-gray-400 hover:text-rose-600 transition cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                )}

                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase">
                    Select Book #{index + 1}
                  </label>
                  <select
                    value={entry.book_id}
                    onChange={(e) => handleBookChange(index, "book_id", e.target.value)}
                    className="w-full border border-pink-200 rounded-xl p-2 text-xs font-semibold mt-0.5 bg-white cursor-pointer"
                  >
                    <option value="">-- Choose Book --</option>
                    {studentBooks.map((book: any) => (
                      <option key={book.id} value={book.id}>
                        {book.title || book.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase">
                      Start Page
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 1"
                      value={entry.start_page}
                      onChange={(e) => handleBookChange(index, "start_page", e.target.value)}
                      className="w-full p-2 border border-pink-200 rounded-xl bg-white text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase">
                      End Page
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 12"
                      value={entry.end_page}
                      onChange={(e) => handleBookChange(index, "end_page", e.target.value)}
                      className="w-full p-2 border border-pink-200 rounded-xl bg-white text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {eventType === 'regular' && (
            <div className="flex items-center gap-2 pt-1">
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
            <div className="space-y-3 p-3.5 bg-pink-50/50 rounded-2xl border border-pink-100">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-pink-900 mb-1">
                    Make-up Date 📅
                  </label>
                  <DatePicker
                    selected={makeupDate}
                    onChange={(date: Date | null) => setMakeupDate(date)}
                    dateFormat="yyyy-MM-dd"
                    placeholderText="Select date"
                    className="w-full p-2.5 border border-pink-200 rounded-xl bg-white text-pink-950 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-pink-400 cursor-pointer"
                    wrapperClassName="w-full"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-pink-900 mb-1">
                    Start Time ⏰
                  </label>
                  <input
                    type="time"
                    value={customTime}
                    onChange={(e) => setCustomTime(e.target.value)}
                    className="w-full p-2.5 border border-pink-200 rounded-xl bg-white text-pink-950 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-pink-400 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-pink-900 mb-1">
                  Class Duration ⏱️
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMakeupDuration(25)}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition cursor-pointer ${
                      makeupDuration === 25
                        ? "bg-pink-600 text-white border-pink-600 shadow-xs"
                        : "bg-white text-pink-900 border-pink-200 hover:bg-pink-100/50"
                    }`}
                  >
                    25 Minutes
                  </button>
                  <button
                    type="button"
                    onClick={() => setMakeupDuration(40)}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition cursor-pointer ${
                      makeupDuration === 40
                        ? "bg-pink-600 text-white border-pink-600 shadow-xs"
                        : "bg-white text-pink-900 border-pink-200 hover:bg-pink-100/50"
                    }`}
                  >
                    40 Minutes
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
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