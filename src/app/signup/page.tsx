import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import RenewalAlertBanner from "@/components/RenewalAlertBanner";
import ClassEvent from "@/components/ClassEvent";

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch schedules, students, and recorded lessons for September 2026
  const [{ data: schedules }, { data: lessons }] = await Promise.all([
    supabase
      .from("schedules")
      .select("*, students (id, name, book_id, books (title))"),
    supabase
      .from("lessons")
      .select("*")
      .eq("teacher_id", user.id)
  ]);

  return (
    <div className="flex flex-col min-h-screen">
      <RenewalAlertBanner />
      
      <main className="p-8 flex-1">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-[#6b0f3b]">
            Good Morning, Teacher 👋
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your classes and students
          </p>
        </div>

        {/* Calendar */}
        <div
          className="
            bg-white
            rounded-3xl
            border
            border-pink-200
            shadow-sm
            p-6
            max-w-7xl
            mx-auto
          "
        >
          <div className="
            flex
            justify-between
            items-center
            mb-6
          ">
            <h2 className="
              text-2xl
              font-bold
              text-[#6b0f3b]
            ">
              September 2026
            </h2>

            <button className="
              bg-pink-600
              text-white
              px-5
              py-2
              rounded-xl
              hover:bg-pink-700
              transition
              cursor-pointer
            ">
              + Add Class
            </button>
          </div>

          {/* Week Days */}
          <div className="
            grid
            grid-cols-7
            gap-3
            text-center
            mb-3
          ">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <div
                key={day}
                className="
                  font-semibold
                  text-pink-600
                "
              >
                {day}
              </div>
            ))}
          </div>

          {/* Dates */}
          <div className="
            grid
            grid-cols-7
            gap-3
          ">
            {/* September 1, 2026 starts on a Tuesday, so offset by 1 empty cell */}
            <div className="min-h-[120px] bg-gray-50/50 border border-gray-100 rounded-2xl p-3 opacity-40"></div>

            {Array.from({ length: 30 }).map((_, index) => {
              const dayNum = index + 1;
              const dateObj = new Date(2026, 8, dayNum);
              const dayOfWeekName = dateObj.toLocaleDateString("en-US", { weekday: "long" });
              const dateString = `2026-09-${String(dayNum).padStart(2, "0")}`;

              return (
                <div
                  key={dayNum}
                  className="
                    min-h-[120px]
                    bg-white
                    border
                    border-pink-100
                    rounded-2xl
                    p-3
                    hover:bg-pink-50/30
                    transition
                    flex
                    flex-col
                    gap-2
                  "
                >
                  <p className="
                    font-bold
                    text-gray-700
                    text-sm
                  ">
                    {dayNum}
                  </p>

                  <div className="space-y-1.5 overflow-y-auto max-h-[150px]">
                    {schedules
                      ?.filter((schedule) => schedule.day_of_week === dayOfWeekName)
                      .map((schedule) => {
                        const matchingLesson = lessons?.find(
                          (l) => l.student_id === schedule.student_id && l.lesson_date === dateString
                        );
                        const status = matchingLesson ? matchingLesson.status : "Scheduled";

                        return (
                          <ClassEvent
                            key={`${schedule.id}-${dayNum}`}
                            time={schedule.schedule_time}
                            student={schedule.students?.name || ""}
                            studentId={schedule.student_id}
                            book={schedule.students?.books?.title || ""}
                            bookId={schedule.students?.book_id}
                            status={status}
                            dateString={dateString}
                            duration={schedule.duration}
                            topic={schedule.topic}
                          />
                        );
                      })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}