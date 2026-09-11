"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import {
  TrendingUp,
  DollarSign,
  Clock,
  Target,
  Edit2,
  Check,
  Download,
  X,
  Building2,
  Plus,
  Trash2,
  Wifi,
  ChevronDown,
  BookOpen,
  Users,
  Calendar,
} from "lucide-react";
import JournalReport from "./JournalReport";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const AVAILABLE_YEARS = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

export default function ReportsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [businessName, setBusinessName] = useState("Private ESL Tutoring Services");
  const [statementSigner, setStatementSigner] = useState("Teacher Gabi");

  // Section Accordion Visibility Toggles
  const [openSections, setOpenSections] = useState({
    collections: true,
    expenses: true,
    journal: true,
  });

  const toggleSection = (key: "collections" | "expenses" | "journal") => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Synchronized Timeframe & Date selector
  const [timeframe, setTimeframe] = useState<"daily" | "weekly" | "monthly" | "annual">("monthly");
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);

  // Income Target State
  const [monthlyTarget, setMonthlyTarget] = useState(50000);
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [tempTarget, setTempTarget] = useState("50000");

  // PDF & Modals State
  const [showIncomeStatementModal, setShowIncomeStatementModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSavingExpense, setIsSavingExpense] = useState(false);

  // New Expense Form State
  const [expenseTitle, setExpenseTitle] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Zoom Pro Subscription");
  const [expenseAmountPhp, setExpenseAmountPhp] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split("T")[0]);
  const [expenseNotes, setExpenseNotes] = useState("");

  const statementPdfRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("business_name")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profile?.business_name) {
          setBusinessName(profile.business_name);
        }
      }

      const [
        { data: studentsData },
        { data: lessonsData },
        { data: paymentsData },
        { data: expensesData },
      ] = await Promise.all([
        supabase.from("students").select("*"),
        supabase.from("lessons").select("*"),
        supabase.from("payments").select("*"),
        supabase.from("expenses").select("*").order("expense_date", { ascending: false }),
      ]);

      if (studentsData) setStudents(studentsData);
      if (lessonsData) setLessons(lessonsData);
      if (paymentsData) setPayments(paymentsData);
      if (expensesData) setExpenses(expensesData);
    } catch (error) {
      console.error("Error loading reports data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const currentHorizonTarget =
    timeframe === "daily"
      ? Math.round(monthlyTarget / 30)
      : timeframe === "weekly"
      ? Math.round(monthlyTarget / 4)
      : timeframe === "annual"
      ? monthlyTarget * 12
      : monthlyTarget;

  const matchesFilter = (dateStr?: string) => {
    if (!dateStr) return false;
    const formatted = dateStr.split("T")[0];
    const currentMonth = selectedDate.slice(0, 7);
    const currentYear = selectedDate.slice(0, 4);

    if (timeframe === "daily") return formatted === selectedDate;
    if (timeframe === "monthly") return formatted.startsWith(currentMonth);
    if (timeframe === "annual") return formatted.startsWith(currentYear);

    const itemTime = new Date(formatted).getTime();
    const selTime = new Date(selectedDate).getTime();
    return Math.abs(selTime - itemTime) / (1000 * 3600 * 24) <= 7;
  };

  const studentBreakdown = students
    .map((s) => {
      const sId = String(s.id || "").trim().toLowerCase();

      // Match payments by UUID student_id
      const studentPayments = payments.filter((p) => {
        const pStudentId = String(p.student_id || "").trim().toLowerCase();
        return sId !== "" && pStudentId === sId;
      });

      // Sum Gross Revenue
      const paymentsSum = studentPayments.reduce(
        (acc, curr) =>
          acc +
          (Number(curr.php_equivalent) ||
            Number(curr.gross_amount_php) ||
            Number(curr.payment_amount) ||
            Number(curr.net_amount_php) ||
            0),
        0
      );

      const fallbackStudentRate = Number(s.php_equivalent || s.payment_amount || 0);
      const grossPackagePhp = paymentsSum > 0 ? paymentsSum : fallbackStudentRate;

      // Extract transfer fee directly checking transfer_fee_php and transfer_fee columns from Supabase
      const totalFeesForStudent = studentPayments.reduce(
        (acc, curr) =>
          acc +
          (Number(curr.transfer_fee_php) ||
            Number(curr.transfer_fee) ||
            0),
        0
      );

      const netPackagePhp = Math.max(0, grossPackagePhp - totalFeesForStudent);

      const studentLessons = lessons.filter((l) => {
        const lStudentId = String(l.student_id || "").trim().toLowerCase();
        return sId !== "" && lStudentId === sId && l.status !== "Cancelled";
      });

      const completedClasses = Number(studentLessons.length || 0);
      const minutesPerClass = Number(s.class_duration || 40);
      const totalHoursTaught = (completedClasses * minutesPerClass) / 60;

      return {
        ...s,
        completedClasses,
        grossPackagePhp,
        totalFeesForStudent,
        netPackagePhp,
        totalHoursTaught,
      };
    })
    .filter((s) => s.grossPackagePhp > 0 || s.totalHoursTaught > 0);

  const filteredExpenses = expenses.filter((exp) => matchesFilter(exp.expense_date));

  const generalSoftwareExpenses = filteredExpenses.filter(
    (exp) => (exp.category || "").toLowerCase() !== "transfer fees"
  );

  const totalTelecomSoftwareExpense = generalSoftwareExpenses.reduce(
    (acc, curr) => acc + (Number(curr.amount_php) || 0),
    0
  );

  const totalGrossRevenue = studentBreakdown.reduce((acc, s) => acc + s.grossPackagePhp, 0);
  const totalTransferFees = studentBreakdown.reduce((acc, s) => acc + s.totalFeesForStudent, 0);
  const totalOperatingExpenses = totalTransferFees + totalTelecomSoftwareExpense;
  const totalNetOperatingIncome = Math.max(0, totalGrossRevenue - totalOperatingExpenses);
  const totalContractCommitment = totalGrossRevenue;

  const totalHoursTaught = studentBreakdown.reduce((acc, s) => acc + s.totalHoursTaught, 0);
  const totalClassesTaught = studentBreakdown.reduce((acc, s) => acc + s.completedClasses, 0);

  const effectiveHourlyRate =
    totalHoursTaught > 0 ? Math.round(totalNetOperatingIncome / totalHoursTaught) : 0;

  const goalRemaining = Math.max(0, currentHorizonTarget - totalNetOperatingIncome);
  const goalProgressPercent = Math.min(
    100,
    Math.round((totalNetOperatingIncome / currentHorizonTarget) * 100) || 0
  );

  function handleSaveTarget() {
    const val = Number(tempTarget.replace(/[^0-9.]/g, ""));
    if (val > 0) setMonthlyTarget(val);
    setIsEditingTarget(false);
  }

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault();
    const cleanAmount = Number(expenseAmountPhp.replace(/[^0-9.]/g, ""));
    const finalTitle = selectedCategory === "Other" ? expenseTitle.trim() : selectedCategory;

    if (!finalTitle || !cleanAmount || isNaN(cleanAmount)) {
      alert("Please enter a valid expense title and amount.");
      return;
    }

    setIsSavingExpense(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("expenses").insert({
        teacher_id: user.id,
        category: selectedCategory === "Other" ? "Custom Expense" : selectedCategory,
        title: finalTitle,
        amount_php: cleanAmount,
        expense_date: expenseDate,
        notes: expenseNotes.trim() || null,
      });

      if (error) throw error;

      setShowExpenseModal(false);
      setExpenseTitle("");
      setSelectedCategory("Zoom Pro Subscription");
      setExpenseAmountPhp("");
      setExpenseNotes("");
      fetchData();
    } catch (err: any) {
      console.error("Error saving expense:", err);
      alert(err.message || "Failed to record expense");
    } finally {
      setIsSavingExpense(false);
    }
  }

  async function handleDeleteExpense(expenseId: string) {
    if (!confirm("Are you sure you want to remove this expense entry?")) return;
    try {
      const { error } = await supabase.from("expenses").delete().eq("id", expenseId);
      if (error) throw error;
      fetchData();
    } catch (err: any) {
      alert("Failed to delete expense: " + err.message);
    }
  }

  async function handleDownloadStatementPdf() {
    if (!statementPdfRef.current) return;
    setIsGeneratingPdf(true);

    try {
      // @ts-ignore
      const html2pdf = (await import("html2pdf.js")).default;
      const element = statementPdfRef.current;
      const opt = {
        margin: 10,
        filename: `Cash_Basis_Income_Statement_${timeframe.toUpperCase()}_${selectedDate}.pdf`,
        image: { type: "png" as const, quality: 1.0 },
        html2canvas: {
          scale: 3,
          useCORS: true,
          backgroundColor: "#ffffff",
          letterRendering: true,
        },
        jsPDF: {
          unit: "mm" as const,
          format: "a4" as const,
          orientation: "portrait" as const,
        },
      };

      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error("Statement PDF export error:", err);
      alert("Failed to export Statement PDF.");
    } finally {
      setIsGeneratingPdf(false);
    }
  }

  const selectedYearStr = selectedDate.substring(0, 4);
  const selectedMonthIdx = Number(selectedDate.substring(5, 7)) - 1;

  return (
    <div className="flex flex-col min-h-screen bg-pink-50/20">
      <div className="p-8 space-y-6 flex-1 max-w-7xl w-full mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-pink-600">Financial & Teaching Reports</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Synchronized reports across collections, expenses, and BIR double-entry journals.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
            <div className="flex items-center bg-white border border-pink-100 rounded-2xl p-1 shadow-2xs">
              {(["daily", "weekly", "monthly", "annual"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setTimeframe(mode)}
                  className={`text-xs capitalize font-semibold px-3 py-1.5 rounded-xl transition cursor-pointer ${
                    timeframe === mode
                      ? "bg-pink-600 text-white shadow-2xs font-bold"
                      : "text-gray-500 hover:text-pink-600"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 bg-white border border-pink-200 rounded-2xl px-3 py-1.5 shadow-2xs">
              <Calendar size={13} className="text-pink-600 shrink-0" />
              {timeframe === "annual" ? (
                <select
                  value={selectedYearStr}
                  onChange={(e) => setSelectedDate(`${e.target.value}-01-01`)}
                  className="text-xs font-bold text-pink-900 bg-transparent focus:outline-none cursor-pointer"
                >
                  {AVAILABLE_YEARS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              ) : timeframe === "monthly" ? (
                <div className="flex items-center gap-1.5">
                  <select
                    value={isNaN(selectedMonthIdx) || selectedMonthIdx < 0 ? 0 : selectedMonthIdx}
                    onChange={(e) => {
                      const m = String(Number(e.target.value) + 1).padStart(2, "0");
                      setSelectedDate(`${selectedYearStr}-${m}-01`);
                    }}
                    className="text-xs font-bold text-pink-900 bg-transparent focus:outline-none cursor-pointer"
                  >
                    {MONTH_NAMES.map((m, idx) => (
                      <option key={m} value={idx}>{m}</option>
                    ))}
                  </select>
                  <select
                    value={selectedYearStr}
                    onChange={(e) => {
                      const m = String(selectedMonthIdx + 1).padStart(2, "0");
                      setSelectedDate(`${e.target.value}-${m}-01`);
                    }}
                    className="text-xs font-bold text-pink-900 bg-transparent focus:outline-none cursor-pointer"
                  >
                    {AVAILABLE_YEARS.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="text-xs font-bold text-pink-900 bg-transparent focus:outline-none cursor-pointer"
                />
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowExpenseModal(true)}
              className="px-3 py-1.5 bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
            >
              <Plus size={14} />
              <span>Add Expense</span>
            </button>

            <button
              type="button"
              onClick={() => setShowIncomeStatementModal(true)}
              className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1 cursor-pointer shadow-xs"
            >
              <Building2 size={14} />
              <span>Statement</span>
            </button>
          </div>
        </div>

        {/* Realized Goal Banner */}
        <div className="bg-white border border-pink-100 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-pink-50 text-pink-600 rounded-2xl">
                <Target size={22} />
              </span>
              <div>
                <h3 className="text-sm font-bold text-gray-900 capitalize">
                  {timeframe} Net Operating Income Target
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  ₱{goalRemaining.toLocaleString()} PHP remaining to reach your {timeframe} target
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isEditingTarget ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    className="input text-xs w-32 py-1 px-2.5"
                    value={tempTarget}
                    onChange={(e) => setTempTarget(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={handleSaveTarget}
                    className="p-1.5 bg-pink-600 hover:bg-pink-700 text-white rounded-lg transition"
                  >
                    <Check size={14} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setTempTarget(monthlyTarget.toString());
                    setIsEditingTarget(true);
                  }}
                  className="text-xs text-pink-600 hover:underline font-semibold flex items-center gap-1"
                >
                  <span>
                    Target: ₱{currentHorizonTarget.toLocaleString()} PHP (Edit Monthly Base)
                  </span>
                  <Edit2 size={12} />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-gray-600">
                ₱{totalNetOperatingIncome.toLocaleString()} PHP Net Income (Less ₱{totalOperatingExpenses.toLocaleString()} Total Operating Expenses)
              </span>
              <span className="text-pink-600 font-bold">{goalProgressPercent}% Done</span>
            </div>
            <div className="w-full bg-pink-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-pink-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${goalProgressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Primary Metric KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-pink-100 rounded-2xl p-5 shadow-2xs flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-bold uppercase text-gray-400 capitalize">
                Net Operating Income (PHP)
              </p>
              <h3 className="text-2xl font-black text-pink-600">
                ₱{totalNetOperatingIncome.toLocaleString()}{" "}
                <span className="text-xs font-medium text-gray-400">PHP</span>
              </h3>
              <p className="text-[10px] text-gray-400">
                Gross Collected: ₱{totalGrossRevenue.toLocaleString()} | Exp: ₱{totalOperatingExpenses.toLocaleString()}
              </p>
            </div>
            <span className="p-3 bg-pink-50 rounded-2xl text-pink-600">
              <DollarSign size={22} />
            </span>
          </div>

          <div className="bg-white border border-pink-100 rounded-2xl p-5 shadow-2xs flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-bold uppercase text-gray-400">
                Effective Hourly Rate
              </p>
              <h3 className="text-2xl font-black text-gray-800">
                ₱{effectiveHourlyRate.toLocaleString()}{" "}
                <span className="text-xs font-medium text-gray-400">PHP / hr</span>
              </h3>
              <p className="text-[10px] text-gray-400">Net earned per teaching hr</p>
            </div>
            <span className="p-3 bg-pink-50 rounded-2xl text-pink-600">
              <TrendingUp size={22} />
            </span>
          </div>

          <div className="bg-white border border-pink-100 rounded-2xl p-5 shadow-2xs flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-bold uppercase text-gray-400 capitalize">
                {timeframe} Hours Taught
              </p>
              <h3 className="text-2xl font-black text-gray-800">
                {totalHoursTaught.toFixed(1)}{" "}
                <span className="text-xs font-medium text-gray-400">
                  Hours ({totalClassesTaught} classes)
                </span>
              </h3>
              <p className="text-[10px] text-gray-400">Completed class sessions</p>
            </div>
            <span className="p-3 bg-pink-50 rounded-2xl text-pink-600">
              <Clock size={22} />
            </span>
          </div>
        </div>

        {/* 1. STUDENT REVENUE LEDGER */}
        <div className="bg-white border border-pink-100 rounded-3xl shadow-xs overflow-hidden transition-all duration-200">
          <button
            type="button"
            onClick={() => toggleSection("collections")}
            className="w-full p-5 flex items-center justify-between bg-white hover:bg-pink-50/30 transition text-left cursor-pointer border-b border-pink-50"
          >
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-pink-50 text-pink-600 rounded-2xl">
                <Users size={18} />
              </span>
              <div>
                <h3 className="text-base font-bold text-pink-950">
                  1. Student Revenue Ledger (Gross Collections & Realized Cash)
                </h3>
                <p className="text-xs text-gray-500">
                  Filtered for {timeframe} ({selectedDate})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-block text-xs font-bold text-pink-600 bg-pink-50 px-3 py-1.5 rounded-xl border border-pink-100">
                Total: ₱{totalContractCommitment.toLocaleString()} PHP
              </span>
              <div className="flex items-center gap-1 text-pink-600">
                <span className="text-xs font-semibold">
                  {openSections.collections ? "Collapse" : "Expand"}
                </span>
                <ChevronDown
                  size={18}
                  className={`transition-transform duration-200 ${
                    openSections.collections ? "rotate-180" : ""
                  }`}
                />
              </div>
            </div>
          </button>

          {openSections.collections && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-pink-50/50 text-gray-500 font-bold uppercase tracking-wider text-[10px] border-b border-pink-100">
                    <th className="p-4">Student</th>
                    <th className="p-4">Country</th>
                    <th className="p-4">Gross Collected</th>
                    <th className="p-4">Transfer / Bank Fee</th>
                    <th className="p-4">Net Realized Cash</th>
                    <th className="p-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pink-50">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-pink-600 font-medium">
                        Loading financial records...
                      </td>
                    </tr>
                  ) : studentBreakdown.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-400 text-xs">
                        No active collections or sessions found for this {timeframe} period.
                      </td>
                    </tr>
                  ) : (
                    studentBreakdown.map((s) => (
                      <tr key={s.id} className="hover:bg-pink-50/20 transition">
                        <td className="p-4 font-bold text-gray-900">{s.name}</td>
                        <td className="p-4 text-gray-600">{s.country}</td>
                        <td className="p-4 font-semibold text-gray-700">
                          ₱{s.grossPackagePhp.toLocaleString()} PHP
                        </td>

                        {/* Read-Only Transfer / Bank Fee Column */}
                        <td className="p-4">
                          <span className="font-medium text-rose-600">
                            {s.totalFeesForStudent > 0
                              ? `-₱${s.totalFeesForStudent.toLocaleString()} PHP`
                              : "₱0"}
                          </span>
                        </td>

                        <td className="p-4 font-bold text-pink-600">
                          ₱{s.netPackagePhp.toLocaleString()} PHP
                        </td>
                        <td className="p-4 text-right">
                          <span className="px-2.5 py-1 bg-pink-50 text-pink-700 border border-pink-200 text-[10px] font-bold rounded-lg uppercase">
                            Paid
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 2. OPERATING EXPENSES */}
        <div className="bg-white border border-pink-100 rounded-3xl shadow-xs overflow-hidden transition-all duration-200">
          <button
            type="button"
            onClick={() => toggleSection("expenses")}
            className="w-full p-5 flex items-center justify-between bg-white hover:bg-pink-50/30 transition text-left cursor-pointer border-b border-pink-50"
          >
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-pink-50 text-pink-600 rounded-2xl">
                <Wifi size={18} />
              </span>
              <div>
                <h3 className="text-base font-bold text-pink-950">
                  2. Operating & Software Expenses
                </h3>
                <p className="text-xs text-gray-500">
                  Filtered for {timeframe} ({selectedDate})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-block text-xs font-bold text-rose-600 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-100">
                Total: ₱{totalTelecomSoftwareExpense.toLocaleString()} PHP
              </span>
              <div className="flex items-center gap-1 text-pink-600">
                <span className="text-xs font-semibold">
                  {openSections.expenses ? "Collapse" : "Expand"}
                </span>
                <ChevronDown
                  size={18}
                  className={`transition-transform duration-200 ${
                    openSections.expenses ? "rotate-180" : ""
                  }`}
                />
              </div>
            </div>
          </button>

          {openSections.expenses && (
            <div>
              <div className="p-4 bg-pink-50/20 border-b border-pink-100 flex items-center justify-between">
                <p className="text-xs text-gray-600">Track and deduct operational subscriptions</p>
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(true)}
                  className="px-3.5 py-1.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Add Expense</span>
                </button>
              </div>

              {filteredExpenses.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-400 space-y-3">
                  <p className="italic">No operating expenses recorded for this {timeframe} period.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-pink-50/40 text-gray-500 font-bold uppercase tracking-wider text-[10px] border-b border-pink-100">
                        <th className="p-4">Expense Title</th>
                        <th className="p-4">Date</th>
                        <th className="p-4">Amount (PHP)</th>
                        <th className="p-4">Purpose / Notes</th>
                        <th className="p-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-pink-50">
                      {filteredExpenses.map((exp) => (
                        <tr key={exp.id} className="hover:bg-pink-50/20 transition">
                          <td className="p-4 font-bold text-gray-800">{exp.title}</td>
                          <td className="p-4 text-gray-500 font-mono">{exp.expense_date}</td>
                          <td className="p-4 font-bold text-rose-600">
                            ₱{Number(exp.amount_php).toLocaleString()} PHP
                          </td>
                          <td className="p-4 text-gray-600">{exp.notes || "—"}</td>
                          <td className="p-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteExpense(exp.id)}
                              className="text-gray-400 hover:text-red-600 p-1 transition cursor-pointer"
                              title="Delete Expense"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. BIR GENERAL JOURNAL */}
        <div className="bg-white border border-pink-100 rounded-3xl shadow-xs overflow-hidden transition-all duration-200">
          <button
            type="button"
            onClick={() => toggleSection("journal")}
            className="w-full p-5 flex items-center justify-between bg-white hover:bg-pink-50/30 transition text-left cursor-pointer border-b border-pink-50"
          >
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-pink-50 text-pink-600 rounded-2xl">
                <BookOpen size={18} />
              </span>
              <div>
                <h3 className="text-base font-bold text-pink-950">
                  3. BIR General Journal / Cash Receipts Entries
                </h3>
                <p className="text-xs text-gray-500">
                  Standard 2-line double-entry format ready for official BIR manual books.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-pink-600">
              <span className="text-xs font-semibold">
                {openSections.journal ? "Collapse" : "Expand"}
              </span>
              <ChevronDown
                size={18}
                className={`transition-transform duration-200 ${
                  openSections.journal ? "rotate-180" : ""
                }`}
              />
            </div>
          </button>

          {openSections.journal && (
            <div className="p-5 pt-2">
              <JournalReport
                payments={payments}
                students={students}
                expenses={expenses}
                selectedDate={selectedDate}
                timeframe={timeframe}
              />
            </div>
          )}
        </div>
      </div>

      {/* MODAL: ADD OPERATING EXPENSE */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="card bg-white w-full max-w-md p-6 rounded-3xl shadow-xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-pink-100 pb-3">
              <div>
                <h2 className="text-lg font-bold text-pink-950">Record Operating Expense</h2>
                <p className="text-[11px] text-gray-500">Log monthly internet, software, or teaching subscriptions.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowExpenseModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-3.5">
              <div>
                <label className="block mb-1 font-semibold text-gray-700">Common Expense Type *</label>
                <select
                  className="input w-full text-xs bg-white cursor-pointer"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="Zoom Pro Subscription">Zoom Pro Subscription</option>
                  <option value="PLDT / Broadband Internet">PLDT / Broadband Internet</option>
                  <option value="Mobile Data / Hotspot">Mobile Data / Hotspot</option>
                  <option value="Teaching Materials & Books">Teaching Materials & Books</option>
                  <option value="Canva / Software Subscriptions">Canva / Software Subscriptions</option>
                  <option value="Other">+ Other (Custom Expense)</option>
                </select>
              </div>

              {selectedCategory === "Other" && (
                <div>
                  <label className="block mb-1 font-semibold text-gray-700">Custom Expense Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Office Supplies, Headset"
                    className="input w-full text-xs"
                    value={expenseTitle}
                    onChange={(e) => setExpenseTitle(e.target.value)}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-semibold text-gray-700">Amount (PHP) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1,699"
                    className="input w-full text-xs font-semibold text-rose-600"
                    value={expenseAmountPhp}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9.]/g, "");
                      if (raw === "") {
                        setExpenseAmountPhp("");
                      } else {
                        const num = Number(raw);
                        setExpenseAmountPhp(isNaN(num) ? raw : num.toLocaleString());
                      }
                    }}
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-gray-700">Date Paid *</label>
                  <input
                    type="date"
                    required
                    className="input w-full text-xs"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 font-semibold text-gray-700">
                  Purpose / Notes (Optional) 📝
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Monthly broadband bill payment."
                  className="input w-full text-xs"
                  value={expenseNotes}
                  onChange={(e) => setExpenseNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-pink-100">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 font-semibold text-gray-600 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingExpense}
                  className="btn-primary text-xs px-5 py-2 cursor-pointer"
                >
                  {isSavingExpense ? "Saving..." : "Save Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CASH-BASIS INCOME STATEMENT MODAL */}
      {showIncomeStatementModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setShowIncomeStatementModal(false)}
        >
          <div
            className="bg-white border border-pink-200 rounded-3xl p-6 w-full max-w-2xl shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col relative z-60"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-pink-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-pink-50 text-pink-600 rounded-xl">
                  <Building2 size={18} />
                </span>
                <div>
                  <h3 className="font-bold text-base text-pink-950">
                    Statement of Cash Receipts & Disbursements
                  </h3>
                  <p className="text-xs text-gray-500">
                    BIR-compliant cash-basis financial report for professional tutoring services.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIncomeStatementModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Inline Controls for Company & Signer Name */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Company / Business Name:
                </label>
                <input
                  type="text"
                  className="input text-xs font-bold text-gray-900 w-full py-1.5 px-3 bg-white"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Enter company name..."
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Signer / Proprietor Name:
                </label>
                <input
                  type="text"
                  className="input text-xs font-bold text-gray-900 w-full py-1.5 px-3 bg-white"
                  value={statementSigner}
                  onChange={(e) => setStatementSigner(e.target.value)}
                  placeholder="Enter signer full name..."
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto border border-gray-200 rounded-2xl p-6 bg-white shadow-inner">
              <div
                ref={statementPdfRef}
                style={{
                  backgroundColor: "#ffffff",
                  color: "#000000",
                  fontFamily: "Helvetica, Arial, sans-serif",
                  padding: "36px 40px",
                  borderRadius: "8px",
                  border: "1px solid #000000",
                  boxSizing: "border-box",
                }}
                className="text-xs"
              >
                {/* Document Header */}
                <div style={{ textAlign: "center", borderBottom: "2px solid #000000", paddingBottom: "16px" }}>
                  <h1 style={{ fontSize: "16px", fontWeight: "900", color: "#000000", margin: "0 0 4px 0", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    {businessName || "Private ESL Tutoring Services"}
                  </h1>
                  <h2 style={{ fontSize: "13px", fontWeight: "800", color: "#000000", margin: "0 0 4px 0", letterSpacing: "0.3px" }}>
                    STATEMENT OF CASH RECEIPTS & DISBURSEMENTS
                  </h2>
                  <p style={{ fontSize: "11px", color: "#333333", margin: 0, fontWeight: "600" }}>
                    Period: {timeframe.toUpperCase()} • Ended {selectedDate}
                  </p>
                  <p style={{ fontSize: "10px", color: "#555555", margin: "2px 0 0 0" }}>
                    (Cash Basis Approach for Professional Tax Compliance)
                  </p>
                  <p style={{ fontSize: "9.5px", color: "#666666", margin: "2px 0 0 0" }}>
                    Amounts Expressed in Philippine Peso (PHP)
                  </p>
                </div>

                {/* Gross Collections */}
                <div style={{ marginTop: "20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #000000", paddingBottom: "6px" }}>
                    <span style={{ fontSize: "11.5px", fontWeight: "800", color: "#000000", textTransform: "uppercase" }}>
                      Gross Cash Receipts (Collections)
                    </span>
                    <span style={{ fontSize: "12px", fontWeight: "900", color: "#000000", fontFamily: "monospace" }}>
                      PHP {Number(totalGrossRevenue || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <p style={{ fontSize: "9.5px", color: "#555555", margin: "4px 0 0 4px", fontStyle: "italic" }}>
                    Note: Total realized cash collections received upfront from active student lesson packages.
                  </p>
                </div>

                {/* Total Cash Inflows */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1.5px solid #000000", marginTop: "8px", fontSize: "11px" }}>
                  <span style={{ fontWeight: "800", color: "#000000" }}>TOTAL CASH INFLOWS</span>
                  <span style={{ fontWeight: "900", color: "#000000", fontFamily: "monospace" }}>
                    PHP {Number(totalGrossRevenue || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Disbursements Section */}
                <div style={{ marginTop: "16px" }}>
                  <div style={{ borderBottom: "1px solid #000000", paddingBottom: "4px", marginBottom: "8px" }}>
                    <span style={{ fontSize: "11px", fontWeight: "800", color: "#000000", textTransform: "uppercase" }}>
                      Less: Deductions & Operating Expenses
                    </span>
                  </div>

                  <div style={{ paddingLeft: "8px", fontSize: "10.5px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                      <span style={{ color: "#222222", fontWeight: "600" }}>
                        International Remittance & Payment Gateway Fees
                      </span>
                      <span style={{ color: "#222222", fontFamily: "monospace", fontWeight: "700" }}>
                        (PHP {Number(totalTransferFees || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                      </span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                      <span style={{ color: "#222222", fontWeight: "600" }}>
                        General Operating Overhead (Internet, Subscriptions & Software)
                      </span>
                      <span style={{ color: "#222222", fontFamily: "monospace", fontWeight: "700" }}>
                        (PHP {Number(totalTelecomSoftwareExpense || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                      </span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #000000", paddingTop: "6px", marginTop: "6px", fontSize: "11px" }}>
                      <span style={{ fontWeight: "800", color: "#000000" }}>Total Operating Deductions</span>
                      <span style={{ fontWeight: "800", color: "#000000", fontFamily: "monospace" }}>
                        (PHP {Number((Number(totalTransferFees || 0) + Number(totalTelecomSoftwareExpense || 0))).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Net Taxable Receipts */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderTop: "2px solid #000000",
                    borderBottom: "2px solid #000000",
                    padding: "10px 4px",
                    marginTop: "20px",
                  }}
                >
                  <span style={{ fontSize: "12px", fontWeight: "900", color: "#000000", textTransform: "uppercase" }}>
                    Net Taxable Cash Receipts / Take-Home
                  </span>
                  <span style={{ fontSize: "14px", fontWeight: "900", color: "#000000", fontFamily: "monospace" }}>
                    PHP {Number(totalNetOperatingIncome || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Signatures */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px", marginTop: "50px", paddingTop: "16px" }}>
                  <div>
                    <div style={{ borderBottom: "1.5px solid #000000", width: "100%", height: "24px", display: "flex", alignItems: "flex-end", paddingBottom: "2px" }}>
                      <span style={{ fontSize: "11px", fontWeight: "800", color: "#000000", fontFamily: "sans-serif" }}>
                        {statementSigner || "Teacher Gabi"}
                      </span>
                    </div>
                    <p style={{ fontSize: "10px", color: "#000000", marginTop: "6px", fontWeight: "700" }}>
                      Certified Correct: Taxpayer / Proprietor
                    </p>
                  </div>
                  <div>
                    <div style={{ borderBottom: "1.5px solid #000000", width: "100%", height: "24px", display: "flex", alignItems: "flex-end", paddingBottom: "2px" }}>
                      <span style={{ fontSize: "11px", fontWeight: "700", color: "#000000", fontFamily: "monospace" }}>
                        {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                      </span>
                    </div>
                    <p style={{ fontSize: "10px", color: "#000000", marginTop: "6px", fontWeight: "700" }}>
                      Date Acknowledged
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleDownloadStatementPdf}
                disabled={isGeneratingPdf}
                className="px-5 py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Download size={14} />
                <span>{isGeneratingPdf ? "Exporting Statement..." : "Download Cash Statement PDF"}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowIncomeStatementModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}