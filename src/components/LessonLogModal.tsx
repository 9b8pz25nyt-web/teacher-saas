'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Trash2, BookOpen, Upload, FileText, X, Sparkles } from 'lucide-react'
import { generateReportFromScript } from "@/app/actions/aiSummary"

interface BookEntry {
  book_id: string
  start_page: string
  end_page: string
  completed_chapters?: number[]
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
  // 1. ALL useState hooks grouped together at the very top
  const [title, setTitle] = useState('')
  const [vocab, setVocab] = useState('')
  const [strengths, setStrengths] = useState('')
  const [improvements, setImprovements] = useState('')
  const [parentMessage, setParentMessage] = useState('')
  const [homework, setHomework] = useState('')
  const [homeworkFile, setHomeworkFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [savedStudentBooks, setSavedStudentBooks] = useState<any[]>([])
  const [rawPasteText, setRawPasteText] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // 2. Multi-book tracker state
  const [selectedBooks, setSelectedBooks] = useState<BookEntry[]>([
    { book_id: '', start_page: '', end_page: '' },
  ])

  // 3. useEffect hook
  useEffect(() => {
    async function loadExistingLesson() {
      if (!isOpen) return
      // ... rest of effect logic ...
    }
    loadExistingLesson()
  }, [isOpen, eventId, studentId, studentBooks])

  // 4. 🛑 EARLY RETURN MUST BE AT THE VERY BOTTOM (after all hooks)
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

  const handleBookChange = (index: number, field: keyof BookEntry, value: any) => {
    setSelectedBooks((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

async function handleAIPaste() {
    if (!rawPasteText.trim()) {
      alert("Please paste some transcript or rough notes first.")
      return
    }

    setIsAnalyzing(true)
    try {
      const result = await generateReportFromScript(rawPasteText, studentName)
      
      // Auto-fill individual fields cleanly
      if (result.title) setTitle(result.title)
      if (result.vocab) setVocab(result.vocab)
      if (result.strengths) setStrengths(result.strengths)
      if (result.improvements) setImprovements(result.improvements)
      if (result.parentMessage) setParentMessage(result.parentMessage)
      if (result.homework) setHomework(result.homework)

      // Clear the paste box after successful generation
      setRawPasteText('')
    } catch (err: any) {
      alert(err.message || "Failed to process text.")
    } finally {
      setIsAnalyzing(false)
    }
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
            notes: structuredDesc,
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
          teacher_message: parentMessage,
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

      for (const bookEntry of validBooks) {
        if (bookEntry.completed_chapters && bookEntry.completed_chapters.length > 0) {
          const { data: existingSb } = await supabase
            .from('student_books')
            .select('completed_chapters')
            .eq('student_id', studentId)
            .eq('book_id', bookEntry.book_id)
            .maybeSingle()

          const existingChapters = existingSb?.completed_chapters || []
          const mergedChapters = Array.from(new Set([...existingChapters, ...bookEntry.completed_chapters]))

          await supabase
            .from('student_books')
            .upsert({
              student_id: studentId,
              book_id: bookEntry.book_id,
              completed_chapters: mergedChapters,
            }, { onConflict: 'student_id,book_id' })
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
        
        {/* Header with AI Upload Button */}
        <div className="flex justify-between items-center border-b border-pink-100 pb-3">
          <div>
            <h2 className="text-lg font-extrabold text-pink-950">
              Log Lesson & Homework
            </h2>
            <p className="text-xs text-pink-700/80 mt-0.5">
              Record daily lesson feedback and track curriculum progress for <span className="font-bold text-pink-900">{studentName}</span>.
            </p>
          </div>

          <div className="flex items-center gap-2">

            <button
              onClick={onClose}
              className="text-pink-300 hover:text-pink-600 font-bold text-2xl cursor-pointer transition ml-1"
            >
              &times;
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 🌟 AI Quick Paste Box */}
          <div className="p-4 bg-pink-50/70 rounded-2xl border border-pink-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-pink-950 flex items-center gap-1.5">
                <Sparkles size={14} className="text-pink-600" />
                <span>AI Assistant: Paste Class Transcript / Rough Notes</span>
              </label>
            </div>
            <textarea
              rows={3}
              placeholder="Paste raw zoom transcript, notes, or bullet points here..."
              value={rawPasteText}
              onChange={(e) => setRawPasteText(e.target.value)}
              className="w-full p-3 bg-white border border-pink-200 rounded-xl text-xs text-pink-950 placeholder:text-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-400"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleAIPaste}
                disabled={isAnalyzing || !rawPasteText.trim()}
                className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <Sparkles size={12} />
                <span>{isAnalyzing ? "Generating Fields..." : "✨ Generate Report from Text"}</span>
              </button>
            </div>
          </div>
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

                {/* Dynamic Chapter Checkboxes vs Page Inputs */}
                {(() => {
                  const currentBook = studentBooks.find(
                    (b: any) => (b.id || b.book_id) === entry.book_id
                  )
                  
                  const isChapterBased =
                    currentBook?.book_type === "chapters" ||
                    currentBook?.book_type === "chapter" ||
                    Array.isArray(currentBook?.chapters) ||
                    currentBook?.is_chapter_based ||
                    currentBook?.title?.toLowerCase().includes("wonderskills") ||
                    currentBook?.name?.toLowerCase().includes("wonderskills")

                  const chaptersList = currentBook?.chapters || []

                  return isChapterBased && chaptersList.length > 0 ? (
                    <div className="space-y-2 pt-1">
                      <label className="text-[10px] font-bold text-pink-900/70 uppercase block">
                        Select Completed Chapters / Lessons
                      </label>
                      <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 bg-pink-50/50 rounded-xl border border-pink-100">
                        {chaptersList.map((chap: any, chapIdx: number) => {
                          const currentBookRecord = savedStudentBooks.find(
                            (sb: any) => sb.book_id === entry.book_id || sb.id === entry.book_id
                          )
                          const historicalCompleted = Array.isArray(currentBookRecord?.completed_chapters)
                            ? currentBookRecord.completed_chapters
                            : []

                          const isAlreadyCompleted = historicalCompleted.includes(chapIdx)
                          const isChecked = isAlreadyCompleted || entry.completed_chapters?.includes(chapIdx) || false
                          const chapTitle = typeof chap === "string" ? chap : chap.title || `Lesson ${chapIdx + 1}`

                          return (
                            <label
                              key={chapIdx}
                              className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs transition ${
                                isAlreadyCompleted
                                  ? "bg-gray-100 border-gray-200 opacity-70 cursor-not-allowed"
                                  : "bg-white border-pink-100 cursor-pointer hover:bg-pink-50/80"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={isAlreadyCompleted}
                                onChange={(e) => {
                                  if (isAlreadyCompleted) return
                                  const currentSelected = entry.completed_chapters || []
                                  const updated = e.target.checked
                                    ? [...currentSelected, chapIdx]
                                    : currentSelected.filter((id) => id !== chapIdx)

                                  handleBookChange(index, 'completed_chapters', updated)
                                }}
                                className="rounded text-pink-600 focus:ring-pink-500 w-4 h-4 cursor-pointer"
                              />
                              <span className={`font-medium ${isAlreadyCompleted ? "text-gray-500 line-through" : "text-pink-950"}`}>
                                {chapTitle} {isAlreadyCompleted && "(Completed)"}
                              </span>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-pink-900/70 uppercase">Start Page</label>
                        <input
                          type="text"
                          placeholder="e.g. 1"
                          value={entry.start_page}
                          onChange={(e) => handleBookChange(index, 'start_page', e.target.value)}
                          className="w-full p-2.5 border border-pink-200 rounded-xl bg-white text-xs font-mono text-pink-950"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-pink-900/70 uppercase">End Page</label>
                        <input
                          type="text"
                          placeholder="e.g. 12"
                          value={entry.end_page}
                          onChange={(e) => handleBookChange(index, 'end_page', e.target.value)}
                          className="w-full p-2.5 border border-pink-200 rounded-xl bg-white text-xs font-mono text-pink-950"
                        />
                      </div>
                    </div>
                  )
                })()}
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