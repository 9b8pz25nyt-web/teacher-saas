"use client";

import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

interface PinkDatePickerProps {
  selectedDate: string;
  onChange: (dateStr: string) => void;
  required?: boolean;
}

export default function PinkDatePicker({
  selectedDate,
  onChange,
  required = false,
}: PinkDatePickerProps) {
  // Convert string "YYYY-MM-DD" to Date object safely without timezone shifts
  const parseDate = (str: string) => {
    if (!str) return new Date();
    const [year, month, day] = str.split("-").map(Number);
    return new Date(year, month - 1, day);
  };

  return (
    <DatePicker
      selected={parseDate(selectedDate)}
      onChange={(d: Date | null) => {
        if (d) {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, "0");
          const day = String(d.getDate()).padStart(2, "0");
          onChange(`${year}-${month}-${day}`);
        }
      }}
      dateFormat="yyyy-MM-dd"
      required={required}
      className="input text-xs w-full bg-white cursor-pointer font-semibold"
    />
  );
}