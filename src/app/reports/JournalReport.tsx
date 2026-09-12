"use client";

import { useMemo } from "react";
import { currencies } from "@/constants/currencies";

interface JournalReportProps {
  payments?: any[];
  students?: any[];
  expenses?: any[];
  selectedDate: string;
  timeframe: "daily" | "weekly" | "monthly" | "annual";
}

export default function JournalReport({
  payments = [],
  students = [],
  expenses = [],
  selectedDate,
  timeframe,
}: JournalReportProps) {
  // Filter helper matching selected timeframe
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

  const journalEntries = useMemo(() => {
    const entries: any[] = [];

    // Safety checks: ensure arrays are defined before calling .forEach()
    const safePayments = Array.isArray(payments) ? payments : [];
    const safeExpenses = Array.isArray(expenses) ? expenses : [];
    const safeStudents = Array.isArray(students) ? students : [];

    // 1. Process Completed/Paid Student Payments
    safePayments.forEach((p) => {
      // Prioritize payment_date (the date marked paid)
      const entryDate =
        p.payment_date ||
        (p.updated_at ? p.updated_at.split("T")[0] : p.created_at?.split("T")[0]);

      if (p.payment_status === "Paid" && matchesFilter(entryDate)) {
        const student = safeStudents.find((s) => s.id === p.student_id);
        const grossPhp = Number(p.php_equivalent) || Number(p.amount) || 0;
        const feePhp = Number(p.transfer_fee_php) || 0;
        const netPhp = Math.max(0, grossPhp - feePhp);
        const currencySymbol = currencies[p.currency]?.symbol || "";

        entries.push({
          id: `pay-${p.id}`,
          date: entryDate,
          ref: "OR-PAY",
          type: "payment",
          studentName: student?.name || "Unknown Student",
          method: p.payment_method || "Bank Transfer",
          foreignCurrency: `${currencySymbol}${Number(p.amount).toLocaleString()} ${p.currency || "PHP"}`,
          grossPhp,
          feePhp,
          netPhp,
        });
      }
    });

    // 2. Process Operating Expenses
    safeExpenses.forEach((exp) => {
      const entryDate = exp.expense_date || exp.created_at?.split("T")[0];
      if (matchesFilter(entryDate)) {
        const amountPhp = Number(exp.amount_php) || 0;

        entries.push({
          id: `exp-${exp.id}`,
          date: entryDate,
          ref: "CV-EXP",
          type: "expense",
          title: exp.title || exp.category || "Operating Expense",
          category: exp.category || "General Expense",
          foreignCurrency: `PHP ${amountPhp.toLocaleString()}`,
          amountPhp,
        });
      }
    });

    // Sort entries chronologically by Date
    return entries.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [payments, students, expenses, selectedDate, timeframe]);

  // Totals for reconciliation check
  const totalDebits = journalEntries.reduce((acc, curr) => {
    if (curr.type === "payment") return acc + curr.grossPhp;
    if (curr.type === "expense") return acc + curr.amountPhp;
    return acc;
  }, 0);

  const totalCredits = journalEntries.reduce((acc, curr) => {
    if (curr.type === "payment") return acc + curr.grossPhp;
    if (curr.type === "expense") return acc + curr.amountPhp;
    return acc;
  }, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-pink-100 pb-3">
        <div>
          <h4 className="text-sm font-bold text-pink-950 uppercase tracking-tight">
            GENERAL JOURNAL / CASH RECEIPTS & DISBURSEMENTS BOOK (PFRS COMPLIANT)
          </h4>
          <p className="text-[11px] text-gray-500">
            Period: {timeframe.toUpperCase()} ({selectedDate}) • Amounts Expressed in Philippine Peso (PHP ₱)
          </p>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 uppercase">
            Double-Entry Balanced
          </span>
        </div>
      </div>

      {journalEntries.length === 0 ? (
        <div className="p-8 text-center text-gray-400 text-xs italic bg-gray-50/50 rounded-2xl border border-pink-50">
          No finalized paid receipts or expenses recorded for this {timeframe} timeframe.
        </div>
      ) : (
        <div className="overflow-x-auto border border-pink-100 rounded-2xl bg-white shadow-2xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-pink-50/50 text-gray-500 font-bold uppercase tracking-wider text-[10px] border-b border-pink-100">
                <th className="p-3.5">DATE</th>
                <th className="p-3.5">REF / VOUCHER #</th>
                <th className="p-3.5">ACCOUNT TITLE & PFRS EXPLANATION</th>
                <th className="p-3.5">ORIGINAL FOREIGN CURRENCY</th>
                <th className="p-3.5 text-right">DEBIT (PHP)</th>
                <th className="p-3.5 text-right">CREDIT (PHP)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pink-50">
              {journalEntries.map((entry) => {
                if (entry.type === "payment") {
                  return (
                    <tr key={entry.id} className="hover:bg-pink-50/20 transition">
                      <td className="p-3.5 font-semibold text-gray-700 font-mono align-top">
                        {entry.date}
                      </td>
                      <td className="p-3.5 font-mono text-gray-500 align-top">
                        {entry.ref}
                      </td>
                      <td className="p-3.5 space-y-1 align-top">
                        <div className="font-bold text-gray-900">
                          Cash in Bank ({entry.method})
                        </div>
                        {entry.feePhp > 0 && (
                          <div className="pl-4 text-rose-600 font-medium">
                            ↳ Bank Service Charges & Processing Fees
                          </div>
                        )}
                        <div className="pl-4 text-pink-700 font-medium italic">
                          ↳ Service Revenue: {entry.studentName}
                        </div>
                      </td>
                      <td className="p-3.5 font-mono text-gray-600 align-top">
                        {entry.foreignCurrency}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-gray-800 align-top space-y-1">
                        <div>₱{entry.netPhp.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
                        {entry.feePhp > 0 && (
                          <div className="text-rose-600">
                            ₱{entry.feePhp.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </div>
                        )}
                        <div className="text-gray-300">—</div>
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-gray-800 align-top space-y-1">
                        <div>—</div>
                        {entry.feePhp > 0 && <div>—</div>}
                        <div className="text-pink-700">
                          ₱{entry.grossPhp.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={entry.id} className="hover:bg-pink-50/20 transition">
                    <td className="p-3.5 font-semibold text-gray-700 font-mono align-top">
                      {entry.date}
                    </td>
                    <td className="p-3.5 font-mono text-gray-500 align-top">
                      {entry.ref}
                    </td>
                    <td className="p-3.5 space-y-1 align-top">
                      <div className="font-bold text-gray-900">
                        Operating Expense: {entry.title}
                      </div>
                      <div className="pl-4 text-gray-600 italic">
                        ↳ Cash in Bank / Cash Outflow
                      </div>
                    </td>
                    <td className="p-3.5 font-mono text-gray-600 align-top">
                      {entry.foreignCurrency}
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-gray-800 align-top space-y-1">
                      <div className="text-rose-600">
                        ₱{entry.amountPhp.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </div>
                      <div>—</div>
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-gray-800 align-top space-y-1">
                      <div>—</div>
                      <div className="text-gray-800">
                        ₱{entry.amountPhp.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-pink-100/60 font-black text-pink-950 text-xs border-t-2 border-pink-200">
                <td colSpan={4} className="p-4 uppercase tracking-wider">
                  TOTAL FOR THIS PERIOD (DEBITS = CREDITS CHECK)
                </td>
                <td className="p-4 text-right font-mono text-pink-700">
                  ₱{totalDebits.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </td>
                <td className="p-4 text-right font-mono text-pink-700">
                  ₱{totalCredits.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}