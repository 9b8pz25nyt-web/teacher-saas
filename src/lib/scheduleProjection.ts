interface Schedule {
  day_of_week: string;
}

interface Lesson {
  lesson_date: string;
  status: string;
}

const dayIndexMap: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

export function calculateProjectedEndDate(
  startDateStr: string | null | undefined,
  totalClasses: number,
  schedules: Schedule[],
  lessons: Lesson[] = []
): { projectedEndDate: string | null; formattedEndDate: string } {
  if (!startDateStr || !totalClasses || totalClasses <= 0 || !schedules || schedules.length === 0) {
    return { projectedEndDate: null, formattedEndDate: "Set start date & schedule" };
  }

  const scheduledDayIndexes = schedules
    .map((s) => dayIndexMap[s.day_of_week])
    .filter((d) => d !== undefined);

  if (scheduledDayIndexes.length === 0) {
    return { projectedEndDate: null, formattedEndDate: "No schedule days set" };
  }

  const [year, month, day] = startDateStr.split("-").map(Number);
  const current = new Date(year, month - 1, day);

  let classesCounted = 0;
  let finalDate: Date = new Date(current);
  let safetyLoop = 0;

  while (classesCounted < totalClasses && safetyLoop < 365) {
    const currentWeekday = current.getDay();

    if (scheduledDayIndexes.includes(currentWeekday)) {
      const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`;
      
      const recordedLesson = lessons.find((l) => l.lesson_date === dateStr);
      const isAbsentOrCancelled =
        recordedLesson &&
        (recordedLesson.status === "Absent" || recordedLesson.status === "Cancelled");

      if (!isAbsentOrCancelled) {
        classesCounted++;
        finalDate = new Date(current);
      }
    }

    current.setDate(current.getDate() + 1);
    safetyLoop++;
  }

  const resultIso = `${finalDate.getFullYear()}-${String(finalDate.getMonth() + 1).padStart(2, "0")}-${String(finalDate.getDate()).padStart(2, "0")}`;
  const formatted = finalDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return { projectedEndDate: resultIso, formattedEndDate: formatted };
}