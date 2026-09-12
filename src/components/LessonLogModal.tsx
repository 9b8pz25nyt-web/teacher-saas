'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Trash2, BookOpen } from 'lucide-react'

interface BookEntry {
  book_id: string
  start_page: string
  end_page: string
}

interface LessonLogModalProps {
  isOpen: boolean
  onClose: () => void
  eventId: string
  studentId: string
  studentName: string
  eventType?: 'regular' | 'makeup'
  dateString?: string
  studentBooks?: any[]
}

export default function LessonLogModal({
  isOpen,
  onClose,
  eventId,
  studentId,
  studentName,
  eventType = 'regular',
  dateString,
  studentBooks = [],
}: LessonLogModalProps) {
  const [title, setTitle] = useState('')
  const [vocab, setVocab] = useState('')
  const [strengths, setStrengths] = useState('')
  const [improvements, setImprovements] = useState('')
  const [parentMessage, setParentMessage] = useState('')
  const [homework, setHomework] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Dynamic Multi-Book Tracker State
  const [selectedBooks, setSelectedBooks] = useState<BookEntry[]>([
    { book_id: '', start_page: '', end_page: '' },
  ])

  useEffect(() => {
    setTitle('')
    setVocab('')
    setStrengths('')
    setImprovements('')
    setParentMessage('')
    setHomework('')
    setSelectedBooks([
      { book_id: studentBooks[0]?.id || '', start_page: '', end_page: '' },
    ])
  }, [isOpen, studentBooks])

  if (!isOpen) return null

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
        alert('Session expired. Please log in again.')
        return
      }

      const targetDate = dateString || new Date().toISOString().split('T')[0]
      const validBooks = selectedBooks.filter((b) => b.book_id)

      if (eventType === 'makeup') {
        const { error: makeupErr } = await supabase
          .from('makeup_classes')
          .update({
            status: 'Completed',
            topic: title || 'Make-up Lesson',
            book_progress: validBooks,
          })
          .eq('id', eventId)

        if (makeupErr) throw makeupErr
      } else {
        const { data: existingLesson } = await supabase
          .from('lessons')
          .select('id')
          .eq('student_id', studentId)
          .eq('lesson_date', targetDate)
          .maybeSingle()

        const lessonPayload = {
          student_id: studentId,
          teacher_id: user.id,
          lesson_date: targetDate,
          status: 'Completed',
          title: title || 'Regular Lesson',
          description: parentMessage,
          vocab_notes: vocab,
          strengths_notes: strengths,
          improvement_notes: improvements,
          homework_notes: homework,
          book_progress: validBooks,
        }

        if (existingLesson) {
          const { error: updateErr } = await supabase
            .from('lessons')
            .update(lessonPayload)
            .eq('id', existingLesson.id)

          if (updateErr) throw updateErr
        } else {
          const { error: insertErr } = await supabase
            .from('lessons')
            .insert(lessonPayload)

          if (insertErr) throw insertErr
        }
      }

      onClose()
    } catch (err: any) {
      console.error('Error logging lesson:', err)
      alert('Failed to log lesson: ' + (err.message || err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-gray-100 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-pink-100 pb-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Log Lesson & Homework
            </h2>
            <p className="text-xs text-gray-500">
              Record lesson feedback and curriculum progress for {studentName}.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 font-bold text-xl cursor-pointer"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Multi-Book Selector Section */}
          <div className="space-y-3 p-3.5 bg-pink-50/40 rounded-2xl border border-pink-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-pink-950 flex items-center gap-1.5">
                <BookOpen size={14} className="text-pink-600" />
                <span>Assigned Books & Progress</span>
              </label>
              <button
                type="button"
                onClick={handleAddBook}
                className="text-xs font-bold text-pink-600 hover:text-pink-700 flex items-center gap-1 cursor-pointer"
              >
                <Plus size={14} />
                <span>Add Another Book</span>
              </button>
            </div>

            {selectedBooks.map((entry, index) => (
              <div
                key={index}
                className="p-3 bg-white rounded-xl border border-pink-100 space-y-2 relative shadow-2xs"
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
  onChange={(e) => handleBookChange(index, 'book_id', e.target.value)}
  className="w-full border border-gray-200 rounded-xl p-2 text-xs font-semibold mt-0.5 bg-white cursor-pointer"
>
  <option value="">-- Choose Book --</option>
  {studentBooks.map((book: any) => (
    <option key={book.id || book.book_id} value={book.id || book.book_id}>
      {book.title || book.name || book.book_title || "Unnamed Book"}
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
                      onChange={(e) => handleBookChange(index, 'start_page', e.target.value)}
                      className="w-full p-2 border border-gray-200 rounded-xl bg-white text-xs font-mono"
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
                      onChange={(e) => handleBookChange(index, 'end_page', e.target.value)}
                      className="w-full p-2 border border-gray-200 rounded-xl bg-white text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Lesson Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Unit 3: Animals & Habitats"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-2.5 border border-gray-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Date
              </label>
              <input
                type="text"
                disabled
                value={dateString || new Date().toISOString().split('T')[0]}
                className="w-full p-2.5 border border-gray-100 rounded-xl bg-gray-50 text-xs font-mono text-gray-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Vocabulary / Target Patterns
            </label>
            <textarea
              rows={2}
              placeholder="e.g. cheetah, mammal, fast, faster than"
              value={vocab}
              onChange={(e) => setVocab(e.target.value)}
              className="w-full p-2.5 border border-gray-200 rounded-xl text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Strengths & Highlights
              </label>
              <textarea
                rows={2}
                placeholder="Great pronunciation today!"
                value={strengths}
                onChange={(e) => setStrengths(e.target.value)}
                className="w-full p-2.5 border border-gray-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Next Focus / Improvement
              </label>
              <textarea
                rows={2}
                placeholder="Practice past tense verb endings."
                value={improvements}
                onChange={(e) => setImprovements(e.target.value)}
                className="w-full p-2.5 border border-gray-200 rounded-xl text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Message from Teacher (Note to Parents)
            </label>
            <textarea
              rows={2}
              placeholder="Great progress today! Please review the vocab list before next class."
              value={parentMessage}
              onChange={(e) => setParentMessage(e.target.value)}
              className="w-full p-2.5 border border-gray-200 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Assigned Homework / Instructions
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Complete Student Book Page 24 exercises 1-4"
              value={homework}
              onChange={(e) => setHomework(e.target.value)}
              className="w-full p-2.5 border border-gray-200 rounded-xl text-xs"
            />
          </div>

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
              {isSubmitting ? 'Saving...' : 'Save Lesson Log'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}