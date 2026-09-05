"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { currencies } from "@/constants/currencies";
import { countries } from "@/constants/countries";
import { convertToPHP } from "@/lib/currency";
import {
  CreditCard,
  Plus,
  Receipt,
  Download,
  X,
  Calendar,
  CheckCircle,
  Clock,
  Trash2,
} from "lucide-react";

// Helper to format numbers with commas
function formatWithCommas(val: string | number) {
  const clean = String(val).replace(/[^0-9.]/g, "");
  if (!clean) return "";
  const parts = clean.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [filterStatus, setFilterStatus] = useState<"All" | "Paid" | "Pending">("All");

  // Add Payment Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("PHP");
  const [phpEquivalent, setPhpEquivalent] = useState<number>(0);
  const [transferFeePhp, setTransferFeePhp] = useState<string>("0");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer");
  const [paymentStatus, setPaymentStatus] = useState("Paid");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [savingPayment, setSavingPayment] = useState(false);

  // Receipt Modal State
  const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] = useState<any | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const receiptPdfRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    try {
      const [{ data: paymentsData, error: pErr }, { data: studentsData, error: sErr }] = await Promise.all([
        supabase.from("payments").select("*").order("payment_date", { ascending: false }),
        supabase.from("students").select("*").order("name", { ascending: true }),
      ]);

      if (pErr) console.error("Error fetching payments:", pErr);
      if (sErr) console.error("Error fetching students:", sErr);

      if (paymentsData) setPayments(paymentsData);
      if (studentsData) setStudents(studentsData);
    } catch (error) {
      console.error("Error loading payments:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle student selection and auto-format amount
  function handleStudentSelect(studentId: string) {
    setSelectedStudentId(studentId);
    const student = students.find((s) => s.id === studentId);
    if (student) {
      const studentCurrency = student.payment_currency || "PHP";
      const studentAmount = String(student.payment_amount || "");
      setCurrency(studentCurrency);
      setAmount(formatWithCommas(studentAmount));
      if (student.php_equivalent) {
        setPhpEquivalent(Number(student.php_equivalent));
      } else {
        handleAmountChange(studentAmount, studentCurrency);
      }
    }
  }

  // Handle Amount change with dynamic comma formatting and conversion
  async function handleAmountChange(newAmount: string, newCurrency: string) {
    const rawVal = newAmount.replace(/[^0-9.]/g, "");
    setAmount(formatWithCommas(rawVal));

    try {
      const cleanNum = Number(rawVal);
      if (cleanNum > 0) {
        const php = await convertToPHP(cleanNum, newCurrency);
        setPhpEquivalent(Math.round(php));
      } else {
        setPhpEquivalent(0);
      }
    } catch {
      setPhpEquivalent(0);
    }
  }

  // Handle Fee change with dynamic comma formatting
  function handleFeeChange(newFee: string) {
    const rawVal = newFee.replace(/[^0-9.]/g, "");
    setTransferFeePhp(formatWithCommas(rawVal));
  }

  async function handleSavePayment() {
    if (!selectedStudentId) {
      alert("Please select a student.");
      return;
    }
    const cleanAmount = Number(String(amount).replace(/[^0-9.]/g, ""));
    if (!cleanAmount || isNaN(cleanAmount)) {
      alert("Please enter a valid payment amount.");
      return;
    }

    const cleanFee = Number(String(transferFeePhp).replace(/[^0-9.]/g, "")) || 0;

    setSavingPayment(true);
    try {
      const payload = {
        student_id: selectedStudentId,
        amount: cleanAmount,
        currency: currency || "PHP",
        php_equivalent: Number(phpEquivalent) || cleanAmount,
        transfer_fee_php: cleanFee,
        payment_date: paymentDate || new Date().toISOString().split("T")[0],
        payment_method: paymentMethod || "Bank Transfer",
        payment_status: paymentStatus || "Paid",
        reference_number: referenceNumber.trim() || null,
        notes: paymentNotes.trim() || null,
      };

      const { error } = await supabase.from("payments").insert([payload]);

      if (error) {
        alert("Database Error: " + error.message);
      } else {
        setShowAddModal(false);
        resetForm();
        await fetchData();
      }
    } catch (err: any) {
      alert("Unexpected error: " + err.message);
    } finally {
      setSavingPayment(false);
    }
  }

  async function handleDeletePayment(paymentId: string) {
    if (!confirm("Are you sure you want to delete this payment record?")) return;
    const { error } = await supabase.from("payments").delete().eq("id", paymentId);
    if (!error) fetchData();
  }

  function resetForm() {
    setSelectedStudentId("");
    setAmount("");
    setCurrency("PHP");
    setPhpEquivalent(0);
    setTransferFeePhp("0");
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setPaymentMethod("Bank Transfer");
    setPaymentStatus("Paid");
    setReferenceNumber("");
    setPaymentNotes("");
  }

  async function handleDownloadReceipt() {
    if (!receiptPdfRef.current) return;
    setIsGeneratingPdf(true);

    try {
      // @ts-ignore
      const html2pdf = (await import("html2pdf.js")).default;
      const element = receiptPdfRef.current;
      const opt = {
        margin: 10,
        filename: `Receipt_${selectedPaymentForReceipt?.student_name || "Payment"}_${selectedPaymentForReceipt?.payment_date}.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
        jsPDF: { unit: "mm" as const, format: "a5" as const, orientation: "portrait" as const },
      };

      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error("Receipt generation error:", err);
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  }

  const enrichedPayments = payments.map((p) => {
    const student = students.find((s) => s.id === p.student_id);
    const grossPhp = Number(p.php_equivalent) || 0;
    const feePhp = Number(p.transfer_fee_php) || 0;
    const netPhp = Math.max(0, grossPhp - feePhp);

    return {
      ...p,
      student_name: student?.name || "Unknown Student",
      student_country: student?.country || "N/A",
      grossPhp,
      feePhp,
      netPhp,
    };
  });

  const totalGrossPHP = enrichedPayments
    .filter((p) => p.payment_status === "Paid")
    .reduce((acc, curr) => acc + curr.grossPhp, 0);

  const totalFeesPHP = enrichedPayments
    .filter((p) => p.payment_status === "Paid")
    .reduce((acc, curr) => acc + curr.feePhp, 0);

  const totalNetPHP = totalGrossPHP - totalFeesPHP;

  const pendingPaymentsCount = enrichedPayments.filter((p) => p.payment_status === "Pending").length;

  const filteredPayments = enrichedPayments.filter((p) => {
    if (filterStatus === "All") return true;
    return p.payment_status === filterStatus;
  });

  const parsedFee = Number(String(transferFeePhp).replace(/[^0-9.]/g, "")) || 0;
  const previewNetPhp = Math.max(0, phpEquivalent - parsedFee);

  return (
    <div className="flex flex-col min-h-screen bg-pink-50/20">
      <div className="p-8 space-y-6 flex-1 max-w-7xl w-full mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-pink-600">Payments & Invoicing</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Record class package transactions, track gross & net earnings after transfer fees.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="btn-primary text-xs flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <Plus size={16} />
            <span>Record Payment</span>
          </button>
        </div>

        {/* Financial Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-pink-100 rounded-2xl p-4 shadow-2xs">
            <p className="text-[11px] font-bold uppercase text-gray-400">Net Revenue (Less Fees)</p>
            <h3 className="text-2xl font-black text-pink-600 mt-0.5">
              ₱{totalNetPHP.toLocaleString()}{" "}
              <span className="text-xs font-medium text-gray-500">PHP</span>
            </h3>
            <p className="text-[11px] text-gray-500 mt-1">
              Gross: ₱{totalGrossPHP.toLocaleString()} | Fees: ₱{totalFeesPHP.toLocaleString()}
            </p>
          </div>

          <div className="bg-white border border-pink-100 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase text-gray-400">Total Transactions</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-0.5">
                {enrichedPayments.length}{" "}
                <span className="text-xs font-medium text-gray-500">Logs</span>
              </h3>
              <p className="text-[11px] text-gray-500 mt-1">
                {enrichedPayments.filter((p) => p.payment_status === "Paid").length} Completed
              </p>
            </div>
            <span className="p-3 bg-pink-50 rounded-2xl text-pink-600">
              <Receipt size={22} />
            </span>
          </div>

          <div className="bg-white border border-pink-100 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase text-gray-400">Pending Invoices</p>
              <h3 className="text-2xl font-bold text-amber-600 mt-0.5">
                {pendingPaymentsCount}{" "}
                <span className="text-xs font-medium text-gray-500">Awaiting</span>
              </h3>
              <p className="text-[11px] text-gray-500 mt-1">Follow-up needed</p>
            </div>
            <span className="p-3 bg-amber-50 rounded-2xl text-amber-600">
              <Clock size={22} />
            </span>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 border-b border-pink-100 pb-3">
          {(["All", "Paid", "Pending"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`text-xs font-bold px-3.5 py-1.5 rounded-xl transition cursor-pointer ${
                filterStatus === status
                  ? "bg-pink-600 text-white shadow-2xs"
                  : "bg-white text-gray-600 hover:bg-pink-50 border border-pink-100"
              }`}
            >
              {status} ({status === "All" ? enrichedPayments.length : enrichedPayments.filter((p) => p.payment_status === status).length})
            </button>
          ))}
        </div>

        {/* Transactions Table */}
        {loading ? (
          <div className="p-12 text-center text-pink-600 font-medium">Loading payments...</div>
        ) : filteredPayments.length === 0 ? (
          <div className="bg-white border border-pink-100 rounded-3xl p-12 text-center text-gray-400 text-xs">
            No payment records found. Click "+ Record Payment" to add one.
          </div>
        ) : (
          <div className="bg-white border border-pink-100 rounded-3xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-pink-50/50 text-gray-500 font-bold uppercase tracking-wider text-[10px] border-b border-pink-100">
                    <th className="p-4">Student</th>
                    <th className="p-4">Date</th>
                    <th className="p-4">Original Amount</th>
                    <th className="p-4">Transfer Fee (PHP)</th>
                    <th className="p-4">Net PHP Earned</th>
                    <th className="p-4">Method & Ref</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pink-50">
                  {filteredPayments.map((p) => {
                    const countryObj = countries.find((c) => c.name === p.student_country);
                    return (
                      <tr key={p.id} className="hover:bg-pink-50/20 transition">
                        <td className="p-4">
                          <Link
                            href={`/students/${p.student_id}`}
                            className="font-bold text-sm text-pink-950 hover:text-pink-600 transition"
                          >
                            {p.student_name}
                          </Link>
                          <div className="flex items-center gap-1.5 text-gray-500 text-[11px] mt-0.5">
                            <span>{countryObj?.flag}</span>
                            <span>{p.student_country}</span>
                          </div>
                        </td>

                        <td className="p-4 text-gray-600">
                          <div className="flex items-center gap-1.5 font-medium">
                            <Calendar size={13} className="text-pink-500" />
                            <span>{p.payment_date}</span>
                          </div>
                        </td>

                        <td className="p-4">
                          <p className="font-bold text-gray-800">
                            {currencies[p.currency]?.symbol || ""}
                            {Number(p.amount).toLocaleString()} {p.currency}
                          </p>
                          <p className="text-gray-400 text-[11px]">
                            Gross: ₱{p.grossPhp.toLocaleString()} PHP
                          </p>
                        </td>

                        <td className="p-4 text-gray-600 font-medium">
                          {p.feePhp > 0 ? (
                            <span className="text-rose-600 font-semibold">-₱{p.feePhp.toLocaleString()} PHP</span>
                          ) : (
                            <span className="text-gray-400">₱0</span>
                          )}
                        </td>

                        <td className="p-4">
                          <p className="text-pink-600 font-black text-sm">
                            ₱{p.netPhp.toLocaleString()} PHP
                          </p>
                        </td>

                        <td className="p-4">
                          <p className="font-semibold text-gray-700">{p.payment_method}</p>
                          {p.reference_number && (
                            <p className="text-gray-400 text-[10px] font-mono mt-0.5">
                              Ref: {p.reference_number}
                            </p>
                          )}
                        </td>

                        <td className="p-4">
                          {p.payment_status === "Paid" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-lg border border-emerald-200">
                              <CheckCircle size={11} />
                              <span>Paid</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-lg border border-amber-200">
                              <Clock size={11} />
                              <span>Pending</span>
                            </span>
                          )}
                        </td>

                        <td className="p-4 text-right space-x-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedPaymentForReceipt(p)}
                            className="p-1.5 text-gray-600 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition inline-flex items-center gap-1 text-[11px] font-semibold border border-pink-100 bg-white cursor-pointer"
                          >
                            <Receipt size={14} className="text-pink-600" />
                            <span>Receipt</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePayment(p.id)}
                            className="p-1.5 text-pink-500 hover:text-pink-700 hover:bg-pink-100 rounded-lg transition inline-flex items-center cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-pink-200 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-pink-100 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard size={20} className="text-pink-600" />
                <h3 className="font-bold text-base text-pink-950">Record Student Payment</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block mb-1 font-semibold text-gray-700">Student</label>
                <select
                  className="input bg-white text-xs w-full"
                  value={selectedStudentId}
                  onChange={(e) => handleStudentSelect(e.target.value)}
                >
                  <option value="">Select Student</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.country})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block mb-1 font-semibold text-gray-700">Payment Currency</label>
                  <select
                    className="input bg-white text-xs w-full"
                    value={currency}
                    onChange={(e) => {
                      setCurrency(e.target.value);
                      handleAmountChange(amount, e.target.value);
                    }}
                  >
                    {Object.keys(currencies).map((code) => (
                      <option key={code} value={code}>
                        {currencies[code].symbol} {code}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-1 font-semibold text-gray-700">Amount Received</label>
                  <input
                    type="text"
                    placeholder="e.g. 2,500,000"
                    className="input text-xs w-full font-semibold"
                    value={amount}
                    onChange={(e) => handleAmountChange(e.target.value, currency)}
                  />
                </div>
              </div>

              {/* PHP Gross vs Fee vs Net */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block mb-1 font-semibold text-gray-700">Gross PHP Equivalent</label>
                  <input
                    type="text"
                    readOnly
                    className="input bg-gray-50 text-xs w-full text-gray-700 font-semibold"
                    value={phpEquivalent ? `₱${Number(phpEquivalent).toLocaleString()} PHP` : ""}
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-gray-700">
                    Transfer / Bank Fee (PHP)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 150"
                    className="input text-xs w-full text-rose-600 font-semibold"
                    value={transferFeePhp}
                    onChange={(e) => handleFeeChange(e.target.value)}
                  />
                </div>
              </div>

              {/* Net Take-Home Preview */}
              <div className="p-2.5 bg-pink-50 rounded-xl border border-pink-100 flex justify-between items-center text-xs">
                <span className="font-bold text-gray-700">Net Take-Home PHP:</span>
                <span className="font-black text-pink-600 text-sm">
                  ₱{previewNetPhp.toLocaleString()} PHP
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block mb-1 font-semibold text-gray-700">Payment Date</label>
                  <input
                    type="date"
                    className="input text-xs w-full"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-gray-700">Status</label>
                  <select
                    className="input bg-white text-xs w-full"
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value)}
                  >
                    <option value="Paid">Paid</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block mb-1 font-semibold text-gray-700">Payment Method</label>
                  <select
                    className="input bg-white text-xs w-full"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Wise">Wise</option>
                    <option value="PayPal">PayPal</option>
                    <option value="Remitly">Remitly</option>
                    <option value="GCash">GCash</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-gray-700">Reference / Txn #</label>
                  <input
                    type="text"
                    placeholder="Optional reference code"
                    className="input text-xs w-full"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 font-semibold text-gray-700">Notes</label>
                <textarea
                  placeholder="Additional payment details..."
                  className="input text-xs w-full"
                  rows={2}
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-pink-50">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePayment}
                disabled={savingPayment}
                className="btn-primary text-xs py-2 px-5"
              >
                {savingPayment ? "Saving..." : "Save Payment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Receipt Modal */}
      {selectedPaymentForReceipt && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedPaymentForReceipt(null)}
        >
          <div
            className="bg-white border border-pink-200 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col relative z-60"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-pink-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-pink-950">Official Payment Receipt</h3>
                <p className="text-xs text-gray-500">Download or share with the parent/student.</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPaymentForReceipt(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Receipt Preview Sheet */}
            <div className="flex-1 overflow-y-auto border border-gray-200 rounded-2xl p-6 bg-white shadow-inner">
              <div
                ref={receiptPdfRef}
                style={{ backgroundColor: "#ffffff", color: "#1f2937" }}
                className="space-y-5 text-gray-800 text-xs p-3 bg-white"
              >
                <div className="flex justify-between items-start border-b-2 border-pink-600 pb-3">
                  <div>
                    <h2 className="text-lg font-black text-pink-600 uppercase tracking-tight">
                      Payment Receipt
                    </h2>
                    <p className="text-[11px] text-gray-500">Teacher Gabi — Private ESL Tutoring</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md uppercase">
                      {selectedPaymentForReceipt.payment_status}
                    </span>
                    <p className="text-[10px] text-gray-400 mt-1">
                      Date: {selectedPaymentForReceipt.payment_date}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Received From:</span>
                    <span className="font-bold text-gray-800">
                      {selectedPaymentForReceipt.student_name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Payment Method:</span>
                    <span className="font-semibold text-gray-700">
                      {selectedPaymentForReceipt.payment_method}
                    </span>
                  </div>
                  {selectedPaymentForReceipt.reference_number && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Reference / Txn:</span>
                      <span className="font-mono text-gray-700">
                        {selectedPaymentForReceipt.reference_number}
                      </span>
                    </div>
                  )}
                </div>

                <div className="border border-pink-100 bg-pink-50/40 p-4 rounded-xl space-y-1 text-center">
                  <p className="text-[11px] uppercase font-bold text-gray-500">Total Amount Paid</p>
                  <h1 className="text-2xl font-black text-pink-600">
                    {currencies[selectedPaymentForReceipt.currency]?.symbol || ""}
                    {Number(selectedPaymentForReceipt.amount).toLocaleString()}{" "}
                    {selectedPaymentForReceipt.currency}
                  </h1>
                  <p className="text-xs font-semibold text-gray-600">
                    ≈ ₱{selectedPaymentForReceipt.grossPhp.toLocaleString()} PHP
                  </p>
                </div>

                {selectedPaymentForReceipt.notes && (
                  <div className="text-[11px] text-gray-600 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                    <strong>Notes:</strong> {selectedPaymentForReceipt.notes}
                  </div>
                )}

                <div className="pt-4 border-t border-gray-200 text-center text-[10px] text-gray-400">
                  Thank you for your payment and dedication to learning!
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleDownloadReceipt}
                disabled={isGeneratingPdf}
                className="px-5 py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Download size={15} />
                <span>{isGeneratingPdf ? "Generating PDF..." : "Download Receipt PDF"}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedPaymentForReceipt(null)}
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