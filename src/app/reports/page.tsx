"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { currencies } from "@/constants/currencies";
import {
  TrendingUp,
  DollarSign,
  Clock,
  Target,
  Edit2,
  Check,
  Download,
  FileText,
  X,
  Building2,
  Plus,
  Trash2,
  Wifi,
} from "lucide-react";

export default function ReportsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Timeframe filter: 'weekly' | 'monthly' | 'annual'
  const [timeframe, setTimeframe] = useState<"weekly" | "monthly" | "annual">("monthly");

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
  const [expenseAmountPhp, setExpenseAmountPhp] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split("T")[0]);
  const [expenseNotes, setExpenseNotes] = useState("");

  const statementPdfRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    try {
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
    timeframe === "weekly"
      ? Math.round(monthlyTarget / 4)
      : timeframe === "annual"
      ? monthlyTarget * 12
      : monthlyTarget;

 // Breakdown per student incorporating free classes (0 income) vs regular paid classes, excluding cancelled lessons
  const studentBreakdown = students.map((s) => {
    const studentLessons = lessons.filter(
      (l) => l.student_id === s.id && l.status !== "Cancelled"
    );
    const studentPayments = payments.filter((p) => p.student_id === s.id && p.payment_status === "Paid");

    const totalFeesForStudent = studentPayments.reduce(
      (acc, curr) => acc + (Number(curr.transfer_fee_php) || 0),
      0
    );

    const completedClasses = Number(s.classes_completed || studentLessons.length || 0);
    const freeClassesCount = Number(s.free_classes || 0);
    const regularClassesCount = Number(s.classes_included || 30);
    const grossPackagePhp = Number(s.php_equivalent || 0);

    // Free classes yield 0 value; gross price per class is distributed across regular paid classes only
    const pricePerRegularClass = regularClassesCount > 0 ? grossPackagePhp / regularClassesCount : 0;

    // Determine how many free vs regular classes have been completed
    const completedFree = Math.min(completedClasses, freeClassesCount);
    const completedRegular = Math.max(completedClasses - freeClassesCount, 0);

    const realizedGrossPhp = Math.round(completedRegular * pricePerRegularClass);
    const unrealizedGrossPhp = Math.max(0, grossPackagePhp - realizedGrossPhp);

    const netPackagePhp = Math.max(0, grossPackagePhp - totalFeesForStudent);
    const pricePerRegularNet = regularClassesCount > 0 ? netPackagePhp / regularClassesCount : 0;
    const realizedNetPhp = Math.round(completedRegular * pricePerRegularNet);
    const unrealizedNetPhp = Math.max(0, netPackagePhp - realizedNetPhp);

    const minutesPerClass = Number(s.class_duration || 40);
    const totalHoursTaught = (completedClasses * minutesPerClass) / 60;

    return {
      ...s,
      completedClasses,
      completedFree,
      completedRegular,
      totalClasses: freeClassesCount + regularClassesCount,
      grossPackagePhp,
      totalFeesForStudent,
      realizedGrossPhp,
      unrealizedGrossPhp,
      netPackagePhp,
      realizedNetPhp,
      unrealizedNetPhp,
      totalHoursTaught,
    };
  });
  // Operating Expenses (Internet, Zoom, Tools)
  const totalTelecomSoftwareExpense = expenses.reduce(
    (acc, curr) => acc + (Number(curr.amount_php) || 0),
    0
  );

  // Aggregated Totals
  const totalGrossRevenue = studentBreakdown.reduce((acc, s) => acc + s.realizedGrossPhp, 0);
  const totalTransferFees = studentBreakdown.reduce((acc, s) => acc + s.totalFeesForStudent, 0);
  const totalOperatingExpenses = totalTransferFees + totalTelecomSoftwareExpense;
  const totalNetOperatingIncome = Math.max(0, totalGrossRevenue - totalOperatingExpenses);

  const totalUnrealizedGross = studentBreakdown.reduce((acc, s) => acc + s.unrealizedGrossPhp, 0);
  const totalContractCommitment = studentBreakdown.reduce((acc, s) => acc + s.grossPackagePhp, 0);

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
    if (!expenseTitle.trim() || !cleanAmount || isNaN(cleanAmount)) {
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
        category: "Telecommunications, Software & Internet",
        title: expenseTitle.trim(),
        amount_php: cleanAmount,
        expense_date: expenseDate,
        notes: expenseNotes.trim() || null,
      });

      if (error) throw error;

      setShowExpenseModal(false);
      setExpenseTitle("");
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
        filename: `PFRS_Income_Statement_${timeframe.toUpperCase()}_${new Date().toISOString().split("T")[0]}.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
        jsPDF: { unit: "mm" as const, format: "a4" as const, orientation: "portrait" as const },
      };

      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error("Statement PDF export error:", err);
      alert("Failed to export Statement PDF.");
    } finally {
      setIsGeneratingPdf(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-pink-50/20">
      <div className="p-8 space-y-6 flex-1 max-w-7xl w-full mx-auto">
        {/* Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-pink-600">Financial & Teaching Reports</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Philippine Financial Reporting System (PFRS) income statement & operational expenses.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
            {/* Timeframe Selector */}
            <div className="flex items-center bg-white border border-pink-100 rounded-2xl p-1 shadow-2xs">
              {(["weekly", "monthly", "annual"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setTimeframe(mode)}
                  className={`text-xs capitalize font-semibold px-3.5 py-1.5 rounded-xl transition cursor-pointer ${
                    timeframe === mode
                      ? "bg-pink-600 text-white shadow-2xs font-bold"
                      : "text-gray-500 hover:text-pink-600"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            {/* Add Operating Expense Button */}
            <button
              type="button"
              onClick={() => setShowExpenseModal(true)}
              className="px-3.5 py-2 bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Plus size={14} />
              <span>Add Expense</span>
            </button>

            {/* Philippine Income Statement Modal Button */}
            <button
              type="button"
              onClick={() => setShowIncomeStatementModal(true)}
              className="btn-primary text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Building2 size={15} />
              <span>PFRS Income Statement</span>
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
                Gross: ₱{totalGrossRevenue.toLocaleString()} | Exp: ₱{totalOperatingExpenses.toLocaleString()}
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

        {/* Operating Expenses Ledger (Telecommunications & Software) */}
<div className="bg-white border border-pink-100 rounded-3xl shadow-xs overflow-hidden">
  <div className="p-5 border-b border-pink-100 flex items-center justify-between">
    <div className="flex items-center gap-2">
      <span className="p-2 bg-pink-50 text-pink-600 rounded-xl">
        <Wifi size={16} />
      </span>
      <div>
        <h3 className="text-sm font-bold text-pink-950">Operating & Software Expenses</h3>
        <p className="text-xs text-gray-500">Internet connection, Zoom Pro, and teaching tools</p>
      </div>
    </div>
    
    <div className="flex items-center gap-3">
      {/* ADD EXPENSE BUTTON */}
      <button
        type="button"
        onClick={() => setShowExpenseModal(true)}
        className="px-3.5 py-1.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
      >
        <Plus size={14} />
        <span>Add Expense</span>
      </button>

      <span className="text-xs font-bold text-rose-600 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-100">
        Total Recorded: ₱{totalTelecomSoftwareExpense.toLocaleString()} PHP
      </span>
    </div>
  </div>

  {expenses.length === 0 ? (
    <div className="p-8 text-center text-xs text-gray-400 space-y-3">
      <p className="italic">No operating expenses recorded yet.</p>
      <button
        type="button"
        onClick={() => setShowExpenseModal(true)}
        className="inline-flex items-center gap-1 px-4 py-2 bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 rounded-xl text-xs font-bold transition cursor-pointer"
      >
        <Plus size={14} />
        <span>+ Log First Operating Expense</span>
      </button>
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
          {expenses.map((exp) => (
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

        {/* Student Revenue Breakdown Table */}
        <div className="bg-white border border-pink-100 rounded-3xl shadow-xs overflow-hidden">
          <div className="p-5 border-b border-pink-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-pink-950">Student Revenue Ledger</h3>
              <p className="text-xs text-gray-500">Gross billings, bank transfer fees, and net realized receipts</p>
            </div>
            <span className="text-xs font-bold text-pink-600 bg-pink-50 px-3 py-1.5 rounded-xl border border-pink-100">
              Total Contract Portfolio: ₱{totalContractCommitment.toLocaleString()} PHP
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-pink-50/50 text-gray-500 font-bold uppercase tracking-wider text-[10px] border-b border-pink-100">
                  <th className="p-4">Student</th>
                  <th className="p-4">Country</th>
                  <th className="p-4">Gross Billings</th>
                  <th className="p-4">Transfer / Bank Fee</th>
                  <th className="p-4">Net Value</th>
                  <th className="p-4">Realized Net</th>
                  <th className="p-4">Unearned Revenue (Deferred)</th>
                  <th className="p-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pink-50">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-pink-600 font-medium">
                      Loading financial records...
                    </td>
                  </tr>
                ) : studentBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-400 text-xs">
                      No student records found.
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
                      <td className="p-4 font-medium text-rose-600">
                        {s.totalFeesForStudent > 0 ? `-₱${s.totalFeesForStudent.toLocaleString()} PHP` : "₱0"}
                      </td>
                      <td className="p-4 font-bold text-gray-900">
                        ₱{s.netPackagePhp.toLocaleString()} PHP
                      </td>
                      <td className="p-4 font-bold text-pink-600">
                        ₱{s.realizedNetPhp.toLocaleString()} PHP
                      </td>
                      <td className="p-4 font-medium text-gray-500">
                        ₱{s.unrealizedNetPhp.toLocaleString()} PHP
                      </td>
                      <td className="p-4 text-right">
                        <span className="px-2.5 py-1 bg-pink-50 text-pink-700 border border-pink-200 text-[10px] font-bold rounded-lg uppercase">
                          Active
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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
                <label className="block mb-1 font-semibold text-gray-700">Expense Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PLDT Home Fiber 200Mbps, Zoom Pro"
                  className="input w-full text-xs"
                  value={expenseTitle}
                  onChange={(e) => setExpenseTitle(e.target.value)}
                />
              </div>

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
                  Purpose / Notes (What is it for?) 📝
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Primary broadband connection used for all online video lessons and interactive whiteboards."
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

      {/* FORMAL PHILIPPINE INCOME STATEMENT MODAL */}
      {showIncomeStatementModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setShowIncomeStatementModal(false)}
        >
          <div
            className="bg-white border border-pink-200 rounded-3xl p-6 w-full max-w-2xl shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col relative z-60"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-pink-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-pink-50 text-pink-600 rounded-xl">
                  <Building2 size={18} />
                </span>
                <div>
                  <h3 className="font-bold text-base text-pink-950">
                    Statement of Comprehensive Income
                  </h3>
                  <p className="text-xs text-gray-500">
                    Prepared in accordance with the Philippine Financial Reporting Framework for Small Entities.
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

            {/* Printable PFRS Sheet */}
            <div className="flex-1 overflow-y-auto border border-gray-200 rounded-2xl p-6 bg-white shadow-inner">
              <div
                ref={statementPdfRef}
                style={{ backgroundColor: "#ffffff", color: "#1f2937", fontFamily: "serif" }}
                className="space-y-6 text-xs p-4 bg-white"
              >
                {/* Formal Entity Title */}
                <div style={{ textAlign: "center", borderBottom: "2px solid #111827", paddingBottom: "12px" }}>
                  <h2 style={{ fontSize: "16px", fontWeight: "bold", textTransform: "uppercase", margin: 0, letterSpacing: "1px" }}>
                    Private ESL Tutoring Services
                  </h2>
                  <p style={{ fontSize: "12px", fontWeight: "600", margin: "2px 0" }}>
                    STATEMENT OF COMPREHENSIVE INCOME (INCOME STATEMENT)
                  </p>
                  <p style={{ fontSize: "10px", color: "#4b5563", margin: 0, fontStyle: "italic" }}>
                    For the {timeframe === "weekly" ? "Week" : timeframe === "annual" ? "Year" : "Month"} Ended {new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}
                  </p>
                  <p style={{ fontSize: "9px", color: "#6b7280", margin: "2px 0 0 0" }}>
                    (Amounts Expressed in Philippine Peso - PHP ₱)
                  </p>
                </div>

                {/* Structured Financial Rows */}
                <div style={{ fontFamily: "sans-serif", fontSize: "11px" }} className="space-y-3">
                  {/* Revenue Section */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", borderBottom: "1px solid #e5e7eb", paddingBottom: "4px" }}>
                      <span>SERVICE REVENUE (Gross Educational Receipts)</span>
                      <span>₱{totalGrossRevenue.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <p style={{ fontSize: "9.5px", color: "#6b7280", margin: "4px 0 0 0" }}>
                      Note 1: Earned tutoring revenue recognized from delivered lesson hours ({totalHoursTaught.toFixed(1)} hours).
                    </p>
                  </div>

                  {/* Direct Costs Section */}
                  <div style={{ paddingLeft: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", color: "#4b5563" }}>
                      <span>Less: Direct Curriculum & Instructional Costs</span>
                      <span>₱0.00</span>
                    </div>
                  </div>

                  {/* Gross Operating Income */}
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", backgroundColor: "#f9fafb", padding: "6px 8px", borderRadius: "6px" }}>
                    <span>GROSS OPERATING PROFIT</span>
                    <span>₱{totalGrossRevenue.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                  </div>

                  {/* Operating Expenses */}
                  <div style={{ paddingTop: "6px" }}>
                    <span style={{ fontWeight: "bold", display: "block", marginBottom: "4px" }}>
                      OPERATING & ADMINISTRATIVE EXPENSES:
                    </span>
                    <div style={{ paddingLeft: "12px" }} className="space-y-1.5">
                      <div style={{ display: "flex", justifyContent: "space-between", color: "#4b5563" }}>
                        <span>International Remittance & Bank Transfer Fees</span>
                        <span style={{ color: "#dc2626" }}>
                          (₱{totalTransferFees.toLocaleString("en-PH", { minimumFractionDigits: 2 })})
                        </span>
                      </div>

                      {/* Telecommunications, Software & Internet Access */}
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", color: "#4b5563" }}>
                          <span>Telecommunications, Software & Internet Access</span>
                          <span style={{ color: totalTelecomSoftwareExpense > 0 ? "#dc2626" : "#4b5563" }}>
                            {totalTelecomSoftwareExpense > 0
                              ? `(₱${totalTelecomSoftwareExpense.toLocaleString("en-PH", { minimumFractionDigits: 2 })})`
                              : "₱0.00"}
                          </span>
                        </div>
                        {/* Itemized Notes for Expenses */}
                        {expenses.length > 0 && (
                          <div style={{ marginTop: "4px", paddingLeft: "8px", borderLeft: "2px solid #fce7f3" }}>
                            {expenses.map((exp) => (
                              <p key={exp.id} style={{ fontSize: "9px", color: "#6b7280", margin: "1px 0" }}>
                                • <strong>{exp.title}</strong>: ₱{Number(exp.amount_php).toLocaleString("en-PH", { minimumFractionDigits: 2 })} — {exp.notes || "Operational utility"}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "600", borderTop: "1px dashed #d1d5db", paddingTop: "4px" }}>
                        <span>Total Operating Expenses</span>
                        <span style={{ color: "#dc2626" }}>
                          (₱{totalOperatingExpenses.toLocaleString("en-PH", { minimumFractionDigits: 2 })})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Net Operating Income (Double Underline Standard) */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontWeight: "900",
                      fontSize: "13px",
                      borderTop: "1.5px solid #111827",
                      borderBottom: "4px double #111827",
                      padding: "8px 0",
                      marginTop: "12px",
                      color: "#db2777",
                    }}
                  >
                    <span>NET OPERATING INCOME / TAKE-HOME</span>
                    <span>₱{totalNetOperatingIncome.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                  </div>

                  {/* Deferred Revenue Note (PFRS Requirement for Unearned Advance Billings) */}
                  <div style={{ backgroundColor: "#fdf2f8", border: "1px solid #fce7f3", padding: "10px", borderRadius: "8px", marginTop: "12px" }}>
                    <p style={{ fontSize: "9px", fontWeight: "bold", textTransform: "uppercase", color: "#db2777", margin: "0 0 2px 0" }}>
                      PFRS Supplemental Disclosure — Unearned / Deferred Revenue:
                    </p>
                    <p style={{ fontSize: "9.5px", color: "#4b5563", margin: 0 }}>
                      Contract commitments in the amount of <strong>₱{totalUnrealizedGross.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</strong> represent prepaid student class balances awaiting service delivery, classified as unearned liabilities under standard accrual guidelines[cite: 1].
                    </p>
                  </div>
                </div>

                {/* Sign-off Block */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", paddingTop: "24px", borderTop: "1px solid #e5e7eb" }}>
                  <div>
                    <div style={{ borderBottom: "1px solid #9ca3af", height: "24px" }} />
                    <p style={{ fontSize: "9px", color: "#6b7280", margin: "4px 0 0 0" }}>
                      Prepared By: Instructor / Proprietor
                    </p>
                  </div>
                  <div>
                    <div style={{ borderBottom: "1px solid #9ca3af", height: "24px" }} />
                    <p style={{ fontSize: "9px", color: "#6b7280", margin: "4px 0 0 0" }}>
                      Date Acknowledged
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleDownloadStatementPdf}
                disabled={isGeneratingPdf}
                className="px-5 py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Download size={14} />
                <span>{isGeneratingPdf ? "Exporting Statement..." : "Download PFRS PDF"}</span>
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