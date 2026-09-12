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
      {/* Expanded to max-w-2xl for extra width */}
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 space-y-5 border border-pink-100 max-h-[92vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-pink-100 pb-3">
          <div>
            <h2 className="text-lg font-extrabold text-pink-950">
              Log Lesson & Homework
            </h2>
            <p className="text-xs text-pink-700/80 mt-0.5">
              Record daily lesson feedback and track curriculum progress for <span className="font-bold text-pink-900">{studentName}</span>.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-pink-300 hover:text-pink-600 font-bold text-2xl cursor-pointer transition"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Multi-Book Selector Section */}
          <div className="space-y-3 p-4 bg-pink-50/40 rounded-2xl border border-pink-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-pink-950 flex items-center gap-1.5">
                <BookOpen size={14} className="text-pink-600" />
                <span>Assigned Books & Progress</span>
              </label>
              <button
                type="button"
                onClick={handleAddBook}
                className="text-xs font-bold text-pink-600 hover:text-pink-700 flex items-center gap-1 cursor-pointer transition"
              >
                <Plus size={14} />
                <span>Add Another Book</span>
              </button>
            </div>

            {selectedBooks.map((entry, index) => (
              <div
                key={index}
                className="p-3.5 bg-white rounded-xl border border-pink-200 space-y-2.5 relative shadow-2xs"
              >
                {selectedBooks.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveBook(index)}
                    className="absolute top-2.5 right-2.5 text-pink-300 hover:text-rose-600 transition cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                )}

                <div>
                  <label className="text-[10px] font-bold text-pink-900/70 uppercase">
                    Select Book #{index + 1}
                  </label>
                  <select
                    value={entry.book_id}
                    onChange={(e) => handleBookChange(index, 'book_id', e.target.value)}
                    className="w-full border border-pink-200 rounded-xl p-2.5 text-xs font-semibold mt-1 bg-white text-pink-950 focus:outline-none focus:ring-2 focus:ring-pink-400 cursor-pointer"
                  >
                    <option value="">-- Choose Book --</option>
                    {studentBooks.map((book: any) => (
                      <option key={book.id || book.book_id} value={book.id || book.book_id}>
                        {book.title || book.name || book.book_title || "Unnamed Book"}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-pink-900/70 uppercase">
                      Start Page
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 1"
                      value={entry.start_page}
                      onChange={(e) => handleBookChange(index, 'start_page', e.target.value)}
                      className="w-full p-2.5 border border-pink-200 rounded-xl bg-white text-xs font-mono text-pink-950 focus:outline-none focus:ring-2 focus:ring-pink-400"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-pink-900/70 uppercase">
                      End Page
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 12"
                      value={entry.end_page}
                      onChange={(e) => handleBookChange(index, 'end_page', e.target.value)}
                      className="w-full p-2.5 border border-pink-200 rounded-xl bg-white text-xs font-mono text-pink-950 focus:outline-none focus:ring-2 focus:ring-pink-400"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-pink-950 mb-1">
                Lesson Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Unit 3: Animals & Habitats"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-2.5 border border-pink-200 rounded-xl text-xs text-pink-950 placeholder:text-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-pink-950 mb-1">
                Date
              </label>
              <input
                type="text"
                disabled
                value={dateString || new Date().toISOString().split('T')[0]}
                className="w-full p-2.5 border border-pink-100 rounded-xl bg-pink-50/50 text-xs font-mono text-pink-900/70"
              />
            </div>
          </div>

          {/* Vocabulary / Target Patterns - Extra High */}
          <div>
            <label className="block text-xs font-bold text-pink-950 mb-1">
              Vocabulary / Target Patterns
            </label>
            <textarea
              rows={5}
              placeholder="e.g. cheetah, mammal, fast, faster than..."
              value={vocab}
              onChange={(e) => setVocab(e.target.value)}
              className="w-full p-3.5 border border-pink-200 rounded-2xl text-xs text-pink-950 placeholder:text-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-400 leading-relaxed min-h-[130px]"
            />
          </div>

          {/* Strengths & Highlights - Large Full Width */}
          <div>
            <label className="block text-xs font-bold text-pink-950 mb-1">
              Strengths & Highlights
            </label>
            <textarea
              rows={5}
              placeholder="Great pronunciation today! You did a fantastic job sharing your opinions..."
              value={strengths}
              onChange={(e) => setStrengths(e.target.value)}
              className="w-full p-3.5 border border-pink-200 rounded-2xl text-xs text-pink-950 placeholder:text-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-400 leading-relaxed min-h-[140px]"
            />
          </div>

          {/* Next Focus / Improvement - Large Full Width */}
          <div>
            <label className="block text-xs font-bold text-pink-950 mb-1">
              Next Focus / Improvement
            </label>
            <textarea
              rows={5}
              placeholder="Practice past tense verb endings. Remember that 'gardener' and 'instructor' are job titles..."
              value={improvements}
              onChange={(e) => setImprovements(e.target.value)}
              className="w-full p-3.5 border border-pink-200 rounded-2xl text-xs text-pink-950 placeholder:text-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-400 leading-relaxed min-h-[140px]"
            />
          </div>

          {/* Message from Teacher (Note to Parents) - Extra High */}
          <div>
            <label className="block text-xs font-bold text-pink-950 mb-1">
              Message from Teacher (Note to Parents)
            </label>
            <textarea
              rows={6}
              placeholder="Great job in our lesson today! You did a fantastic job sharing your opinions..."
              value={parentMessage}
              onChange={(e) => setParentMessage(e.target.value)}
              className="w-full p-3.5 border border-pink-200 rounded-2xl text-xs text-pink-950 placeholder:text-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-400 leading-relaxed min-h-[160px]"
            />
          </div>

          {/* Assigned Homework / Instructions - Extra High */}
          <div>
            <label className="block text-xs font-bold text-pink-950 mb-1">
              Assigned Homework / Instructions (Optional)
            </label>
            <textarea
              rows={5}
              placeholder="Instructions: Write one complete sentence for each of the vocabulary words below..."
              value={homework}
              onChange={(e) => setHomework(e.target.value)}
              className="w-full p-3.5 border border-pink-200 rounded-2xl text-xs text-pink-950 placeholder:text-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-400 leading-relaxed min-h-[140px]"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-pink-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-pink-50 hover:bg-pink-100 text-pink-700 text-xs font-bold rounded-xl border border-pink-200 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Lesson Log'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}