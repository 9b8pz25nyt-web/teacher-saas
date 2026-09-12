'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Trash2, BookOpen, Upload, FileText, X } from 'lucide-react'

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
  const [homeworkFile, setHomeworkFile] = useState<File | null>(null)
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
    setHomeworkFile(null)
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

      let uploadedFileUrl: string | null = null

      if (homeworkFile) {
        const fileExt = homeworkFile.name.split('.').pop()
        const fileName = `${studentId}/${Date.now()}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('homework-files')
          .upload(fileName, homeworkFile)

        if (uploadError) throw uploadError

        const { data: publicUrlData } = supabase.storage
          .from('homework-files')
          .getPublicUrl(fileName)

        uploadedFileUrl = publicUrlData.publicUrl
      }

      const targetDate = dateString || new Date().toISOString().split('T')[0]
      const validBooks = selectedBooks.filter((b) => b.book_id)

      // Structured description for parser compatibility
      const structuredDesc = `Vocab: ${vocab || "None"}
Strengths: ${strengths || "None"}
Improvements: ${improvements || "None"}
Homework: ${homework || "None"}

Message: ${parentMessage || ""}`

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
          description: structuredDesc,
          vocab_notes: vocab,
          strengths_notes: strengths,
          improvement_notes: improvements,
          homework_notes: homework,
          homework_file_url: uploadedFileUrl,
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

        // Also increment completed classes count on student record if new
        if (!existingLesson) {
          const { data: currentStudent } = await supabase
            .from('students')
            .select('classes_completed')
            .eq('id', studentId)
            .single()

          const currentCompleted = currentStudent?.classes_completed || 0
          await supabase
            .from('students')
            .update({ classes_completed: currentCompleted + 1 })
            .eq('id', studentId)
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

          {/* Vocabulary / Target Patterns */}
          <div>
            <label className="block text-xs font-bold text-pink-950 mb-1">
              Vocabulary / Target Patterns
            </label>
            <textarea
              rows={4}
              placeholder="e.g. cheetah, mammal, fast, faster than..."
              value={vocab}
              onChange={(e) => setVocab(e.target.value)}
              className="w-full p-3.5 border border-pink-200 rounded-2xl text-xs text-pink-950 placeholder:text-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-400 leading-relaxed min-h-[100px]"
            />
          </div>

          {/* Strengths & Highlights */}
          <div>
            <label className="block text-xs font-bold text-pink-950 mb-1">
              Strengths & Highlights
            </label>
            <textarea
              rows={4}
              placeholder="Great pronunciation today! You did a fantastic job sharing your opinions..."
              value={strengths}
              onChange={(e) => setStrengths(e.target.value)}
              className="w-full p-3.5 border border-pink-200 rounded-2xl text-xs text-pink-950 placeholder:text-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-400 leading-relaxed min-h-[100px]"
            />
          </div>

          {/* Next Focus / Improvement */}
          <div>
            <label className="block text-xs font-bold text-pink-950 mb-1">
              Next Focus / Improvement
            </label>
            <textarea
              rows={4}
              placeholder="Practice past tense verb endings..."
              value={improvements}
              onChange={(e) => setImprovements(e.target.value)}
              className="w-full p-3.5 border border-pink-200 rounded-2xl text-xs text-pink-950 placeholder:text-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-400 leading-relaxed min-h-[100px]"
            />
          </div>

          {/* Message from Teacher */}
          <div>
            <label className="block text-xs font-bold text-pink-950 mb-1">
              Message from Teacher (Note to Parents)
            </label>
            <textarea
              rows={4}
              placeholder="Great job in our lesson today..."
              value={parentMessage}
              onChange={(e) => setParentMessage(e.target.value)}
              className="w-full p-3.5 border border-pink-200 rounded-2xl text-xs text-pink-950 placeholder:text-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-400 leading-relaxed min-h-[100px]"
            />
          </div>

          {/* Assigned Homework / Instructions & File Upload */}
          <div className="space-y-3 p-4 bg-pink-50/30 rounded-2xl border border-pink-200">
            <label className="block text-xs font-bold text-pink-950">
              Assigned Homework / Instructions (Optional)
            </label>
            <textarea
              rows={4}
              placeholder="Instructions: Write one complete sentence for each vocabulary word..."
              value={homework}
              onChange={(e) => setHomework(e.target.value)}
              className="w-full p-3.5 border border-pink-200 rounded-2xl text-xs text-pink-950 bg-white placeholder:text-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-400 leading-relaxed min-h-[100px]"
            />

            <div>
              <label className="block text-[11px] font-bold text-pink-900/80 mb-1 flex items-center gap-1">
                <Upload size={13} className="text-pink-600" />
                <span>Attach Homework Worksheet / Document (PDF or Image)</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setHomeworkFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-pink-100 file:text-pink-800 hover:file:bg-pink-200 cursor-pointer border border-pink-200 rounded-xl p-1.5 bg-white"
                />
                {homeworkFile && (
                  <button
                    type="button"
                    onClick={() => setHomeworkFile(null)}
                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                    title="Remove File"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              {homeworkFile && (
                <p className="text-[10px] text-emerald-700 font-medium mt-1">
                  Selected file: {homeworkFile.name}
                </p>
              )}
            </div>
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