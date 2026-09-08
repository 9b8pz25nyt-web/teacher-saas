'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface LessonLogModalProps {
  isOpen: boolean
  onClose: () => void
  eventId: string
  studentId: string
  studentName: string
  eventType?: 'regular' | 'makeup'
}

export default function LessonLogModal({
  isOpen,
  onClose,
  eventId,
  studentId,
  studentName,
  eventType = 'regular'
}: LessonLogModalProps) {
  const [studentBooks, setStudentBooks] = useState<any[]>([])
  const [reportBookId, setReportBookId] = useState('')
  const [selectedChapterIndex, setSelectedChapterIndex] = useState('')
  const [isChapterComplete, setIsChapterComplete] = useState(false)
  const [startPage, setStartPage] = useState('')
  const [endPage, setEndPage] = useState('')

  const [lessonTitle, setLessonTitle] = useState('')
  const [lessonDate, setLessonDate] = useState(new Date().toISOString().split('T')[0])
  const [vocabulary, setVocabulary] = useState('')
  const [strengths, setStrengths] = useState('')
  const [improvements, setImprovements] = useState('')
  const [homework, setHomework] = useState('')
  const [homeworkFile, setHomeworkFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    async function fetchBooks() {
      const [{ data: studentBks }, { data: allBks }] = await Promise.all([
        supabase.from('student_books').select('*').eq('student_id', studentId),
        supabase.from('books').select('*').order('title', { ascending: true })
      ])

      if (studentBks && studentBks.length > 0 && allBks) {
        const matched = studentBks.map((item) => ({
          book_id: item.book_id,
          completed_chapters: item.completed_chapters || [],
          books: allBks.find((b: any) => b.id === item.book_id)
        }))
        setStudentBooks(matched)
      } else {
        setStudentBooks([])
      }
    }
    if (isOpen) {
      fetchBooks()
      setLessonDate(new Date().toISOString().split('T')[0])
    }
  }, [isOpen, studentId])

  if (!isOpen) return null

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!lessonTitle.trim()) return alert('Please enter a lesson title')

    setIsSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert("Session expired. Please log in again.")
        return
      }

      // Fetch student teacher alias
      const { data: currentStudent } = await supabase
        .from('students')
        .select('teacher_alias, classes_completed')
        .eq('id', studentId)
        .single()

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

      const validBookId = reportBookId && reportBookId.trim() !== "" ? reportBookId : null

      const reportPayload: any = {
        student_id: studentId,
        teacher_id: user.id,
        teacher_alias: currentStudent?.teacher_alias || "Teacher Gabi",
        lesson_title: lessonTitle.trim(),
        title: lessonTitle.trim(),
        report_date: lessonDate,
        lesson_date: lessonDate,
        book_id: validBookId,
        vocabulary: vocabulary.trim() || null,
        strengths: strengths.trim() || null,
        improvements: improvements.trim() || null,
        homework: homework.trim() || null,
        status: 'Completed',
        homework_file_url: uploadedFileUrl
      }

      const selectedBookItem = studentBooks.find((item: any) => item.books?.id === reportBookId)
      if (selectedBookItem?.books?.book_type === 'pages') {
        reportPayload.start_page = startPage ? Number(startPage) : null
        reportPayload.end_page = endPage ? Number(endPage) : null
      }

      // 1. Insert into class_reports
      const { error: reportError } = await supabase.from('class_reports').insert(reportPayload)
      if (reportError) {
        throw new Error(`class_reports insert failed: ${reportError.message}`)
      }

      // 2. Insert into lessons for calendar synchronization
      const { error: lessonError } = await supabase.from('lessons').insert({
        student_id: studentId,
        teacher_id: user.id,
        title: lessonTitle.trim(),
        lesson_date: lessonDate,
        status: 'Completed',
        description: `Vocab: ${vocabulary}\nStrengths: ${strengths}\nHomework: ${homework}`,
        homework_file_url: uploadedFileUrl,
        book_id: validBookId
      })
      if (lessonError) {
        throw new Error(`lessons insert failed: ${lessonError.message}`)
      }

      // 3. Update chapter completion if marked
      if (validBookId && selectedChapterIndex !== "" && isChapterComplete) {
        const currentCompletedChapters = selectedBookItem?.completed_chapters || []
        const chapterIdxNum = Number(selectedChapterIndex)
        
        if (!currentCompletedChapters.includes(chapterIdxNum)) {
          const updatedChapters = [...currentCompletedChapters, chapterIdxNum]
          await supabase
            .from("student_books")
            .update({ completed_chapters: updatedChapters })
            .eq("student_id", studentId)
            .eq("book_id", validBookId)
        }
      }

      // 4. Update status on schedule or makeup event
      if (eventType === 'regular' && eventId) {
        await supabase.from('schedules').update({ status: 'Completed' }).eq('id', eventId)
      } else if (eventType === 'makeup' && eventId) {
        await supabase.from('makeup_classes').update({ status: 'Completed' }).eq('id', eventId)
      }

      // 5. Increment completed classes count
      const currentCompleted = currentStudent?.classes_completed || 0
      await supabase
        .from('students')
        .update({ classes_completed: currentCompleted + 1 })
        .eq('id', studentId)

      onClose()
      window.location.reload()
    } catch (err: any) {
      console.error('Error saving lesson log:', err)
      alert(err.message || 'Failed to save lesson log')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="card bg-white w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 rounded-3xl shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-pink-100 pb-3">
          <div>
            <h2 className="text-xl font-bold text-pink-950">Log Lesson & Homework</h2>
            <p className="text-xs text-gray-500">Record daily lesson feedback and track curriculum progress for {studentName}.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-3.5 text-xs">
          <div>
            <label className="block mb-1 font-semibold text-pink-700">Select Book / Curriculum 📖</label>
            <select
              className="input w-full text-xs bg-white cursor-pointer"
              value={reportBookId}
              onChange={(e) => {
                setReportBookId(e.target.value)
                setSelectedChapterIndex('')
              }}
            >
              <option value="">-- Select Book --</option>
              {studentBooks.map((item: any) => (
                <option key={item.books?.id} value={item.books?.id}>
                  {item.books?.title} {item.books?.level ? `(${item.books.level})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 font-semibold text-gray-700">Lesson Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. Unit 3: Animals & Habitats"
                className="input w-full text-xs"
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="block mb-1 font-semibold text-gray-700">Date</label>
              <input
                type="date"
                className="input w-full text-xs"
                value={lessonDate}
                onChange={(e) => setLessonDate(e.target.value)}
              />
            </div>
          </div>

         <div>
            <label className="block mb-1 font-semibold text-gray-700">Vocabulary / Target Patterns</label>
            <textarea
              rows={2}
              placeholder="e.g. cheetah, mammal, fast, faster than"
              className="input w-full text-xs"
              value={vocabulary}
              onChange={(e) => setVocabulary(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 font-semibold text-gray-700">Strengths & Highlights</label>
              <textarea
                rows={2}
                placeholder="Great pronunciation and enthusiasm today!"
                className="input w-full text-xs"
                value={strengths}
                onChange={(e) => setStrengths(e.target.value)}
              />
            </div>
            <div>
              <label className="block mb-1 font-semibold text-gray-700">Next Focus / Improvement</label>
              <textarea
                rows={2}
                placeholder="Practice past tense verb endings."
                className="input w-full text-xs"
                value={improvements}
                onChange={(e) => setImprovements(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block mb-1 font-semibold text-pink-700">Assigned Homework / Instructions (Optional) 📚</label>
            <textarea
              rows={2}
              placeholder="e.g. Complete Student Book Page 24 exercises 1-4."
              className="input w-full text-xs border-pink-200 bg-pink-50/20"
              value={homework}
              onChange={(e) => setHomework(e.target.value)}
            />
          </div>

          <div className="p-3 bg-pink-50/40 rounded-2xl border border-pink-100 space-y-1.5">
            <label className="block font-semibold text-pink-900 text-xs">Attach Homework Page / Worksheet (Optional) 📄</label>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setHomeworkFile(e.target.files?.[0] || null)}
              className="file:mr-3 file:py-1.5 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-pink-600 file:text-white hover:file:bg-pink-700 text-xs text-gray-500 w-full cursor-pointer"
            />
            {homeworkFile && (
              <p className="text-[11px] text-emerald-700 font-medium">✓ Selected file: {homeworkFile.name}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-pink-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 font-semibold text-gray-600 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            >
              {isSubmitting ? 'Uploading & Saving...' : 'Save Lesson & Send to Portal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}