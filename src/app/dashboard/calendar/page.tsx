'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import ClassEvent from '@/components/ClassEvent'
import AttendanceModal from '@/components/AttendanceModal'
import LessonLogModal from '@/components/LessonLogModal'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedLesson, setSelectedLesson] = useState<{
    eventId: string
    studentId: string
    studentName: string
    type: 'regular' | 'makeup'
    dateString?: string
  } | null>(null)

  const [selectedAttendance, setSelectedAttendance] = useState<{
    eventId: string
    studentId: string
    studentName: string
    status: 'absent' | 'cancelled'
    eventType?: 'regular' | 'makeup'
    dateString: string
  } | null>(null)

const fetchEvents = useCallback(async () => {
    setLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      // 1. Fetch regular weekly schedules (Filtered by user.id)
      const { data: schedules, error: scheduleError } = await supabase
        .from('schedules')
        .select(`
          id,
          schedule_time,
          duration,
          student_id,
          status,
          day_of_week,
          topic,
          students (
            id,
            name
          )
        `)
        .eq('user_id', user.id) // 👈 1. Scope regular schedules to current user

      if (scheduleError) console.error('Schedule fetch error:', scheduleError.message)

      // 2. Fetch one-off makeup classes (Filtered by user.id)
      const { data: makeupClasses, error: makeupError } = await supabase
        .from('makeup_classes')
        .select(`
          id,
          makeup_date,
          duration,
          student_id,
          status,
          topic,
          students (
            id,
            name
          )
        `)
        .eq('user_id', user.id) // 👈 2. Scope makeup classes to current user

      if (makeupError) console.error('Makeup fetch error:', makeupError.message)

      const regularEvents = (schedules || []).map((item: any) => ({
        id: item.id,
        type: 'regular' as const,
        schedule_time: item.schedule_time,
        duration: item.duration || 40,
        day_of_week: item.day_of_week,
        student_id: item.student_id,
        status: item.status,
        topic: item.topic || 'Regular Class',
        students: item.students,
      }))

      const makeupEvents = (makeupClasses || []).map((item: any) => ({
        id: item.id,
        type: 'makeup' as const,
        start_time: item.makeup_date,
        duration: item.duration || 40,
        student_id: item.student_id,
        status: item.status || 'Scheduled',
        topic: item.topic || 'Make-up Class',
        students: item.students,
      }))

      setEvents([...regularEvents, ...makeupEvents])
    } catch (err) {
      console.error('FETCH EVENTS ERROR:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents, currentDate])

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDayOfMonth = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startingDayIndex = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1

  const calendarDays: (Date | null)[] = []
  for (let i = 0; i < startingDayIndex; i++) {
    calendarDays.push(null)
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(new Date(year, month, day))
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Month Header & Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">
            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </h1>

          <div className="flex items-center bg-white border border-gray-200 rounded-xl p-0.5 shadow-xs">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-700 transition cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-700 transition cursor-pointer"
              title="Next Month"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
        {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day) => (
          <div key={day} className="bg-gray-50 p-2 text-center text-xs font-bold text-gray-600">
            {day}
          </div>
        ))}

        {calendarDays.map((date, index) => {
          if (!date) {
            return <div key={`empty-${index}`} className="bg-white min-h-[120px] p-2" />
          }

          const monthStr = String(month + 1).padStart(2, '0')
          const dayStr = String(date.getDate()).padStart(2, '0')
          const dateString = `${year}-${monthStr}-${dayStr}`

          const dayEvents = events.filter((ev) => {
            // 1. One-off make-up classes
            if (ev.type === 'makeup') {
              return ev.start_time && ev.start_time.startsWith(dateString)
            }

            // 2. Regular weekly schedules
            if (ev.type === 'regular') {
              const dayName = date.toLocaleString('en-US', { weekday: 'long' })
              return ev.day_of_week?.toLowerCase() === dayName.toLowerCase()
            }

            return false
          })

          return (
            <div
              key={dateString}
              className="bg-white min-h-[120px] p-2 flex flex-col gap-1 border-t border-gray-100"
            >
              <span className="text-xs font-semibold text-gray-700">{date.getDate()}</span>

              <div className="space-y-1">
                {dayEvents.map((event) => {
                  let timeString = '18:00'
                  if (event.type === 'regular') {
                    timeString = event.schedule_time || '18:00'
                  } else if (event.start_time) {
                    timeString = event.start_time.includes('T')
                      ? event.start_time.split('T')[1].slice(0, 5)
                      : '18:00'
                  }

                  const studentName =
                    event.type === 'makeup'
                      ? `✨ ${event.students?.name || 'Student'}`
                      : event.students?.name || 'Student'

                  return (
                    <ClassEvent
                      key={`${event.type}-${event.id}`}
                      id={event.id}
                      type={event.type}
                      time={timeString}
                      student={studentName}
                      studentId={event.student_id}
                      status={event.status || 'Scheduled'}
                      dateString={dateString}
                      duration={event.duration}
                      topic={event.topic}
                      onStatusUpdate={fetchEvents}
                      onOpenModal={(statusPreset = 'absent') => {
                        if (statusPreset === 'present') {
                          setSelectedLesson({
                            eventId: event.id,
                            studentId: event.student_id,
                            studentName: event.students?.name || 'Student',
                            type: event.type,
                            dateString,
                          })
                        } else {
                          setSelectedAttendance({
                            eventId: event.id,
                            studentId: event.student_id,
                            studentName: event.students?.name || 'Student',
                            status: statusPreset === 'cancelled' ? 'cancelled' : 'absent',
                            eventType: event.type,
                            dateString,
                          })
                        }
                      }}
                    />
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Attendance Modal */}
      {selectedAttendance && (
        <AttendanceModal
          isOpen={true}
          onClose={() => {
            setSelectedAttendance(null)
            fetchEvents()
          }}
          eventId={selectedAttendance.eventId}
          studentId={selectedAttendance.studentId}
          studentName={selectedAttendance.studentName}
          initialStatus={selectedAttendance.status}
          eventType={selectedAttendance.eventType}
          dateString={selectedAttendance.dateString}
        />
      )}

      {/* Lesson Log Modal */}
      {selectedLesson && (
        <LessonLogModal
          isOpen={true}
          onClose={() => {
            setSelectedLesson(null)
            fetchEvents()
          }}
          eventId={selectedLesson.eventId}
          studentId={selectedLesson.studentId}
          studentName={selectedLesson.studentName}
          eventType={selectedLesson.type}
        />
      )}
    </div>
  )
}