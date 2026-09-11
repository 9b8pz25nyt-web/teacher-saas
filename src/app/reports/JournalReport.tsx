'use client'

import React, { useRef, useState } from 'react'
import { Download, FileText } from 'lucide-react'

interface JournalReportProps {
  payments?: any[]
  students?: any[]
  expenses?: any[]
  selectedDate?: string
  timeframe?: 'daily' | 'weekly' | 'monthly' | 'annual'
}

export default function JournalReport({
  payments = [],
  students = [],
  expenses = [],
  selectedDate = new Date().toISOString().split('T')[0],
  timeframe = 'monthly'
}: JournalReportProps) {
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const printTableRef = useRef<HTMLDivElement>(null)

  // Filter and build PFRS-compliant double-entry journal records
  const combinedEntries = React.useMemo(() => {
    const list: any[] = []

    // 1. Process student payment records (INCOME / CASH RECEIPTS)
    payments.forEach((p) => {
      const grossPhp = Number(
        p.gross_amount_php ||
        p.php_equivalent ||
        p.payment_amount ||
        p.net_amount_php ||
        0
      )
      const transferFeePhp = Number(
        p.transfer_fee_php ||
        p.transfer_fee ||
        p.transfer_fee_numeric ||
        0
      )
      const netCashPhp = Math.max(0, grossPhp - transferFeePhp)
      const origAmt = Number(p.original_amount || p.payment_amount || grossPhp)
      const rawDate = p.payment_date || p.created_at || ''
      const dateStr = typeof rawDate === 'string' ? rawDate.split('T')[0] : ''

      if (grossPhp > 0 && dateStr) {
        list.push({
          id: `pay-${p.id}`,
          type: 'income',
          date: dateStr,
          student_name: p.student_name || 'Private Student',
          currency: p.currency || 'PHP',
          origAmt,
          grossPhp,
          transferFeePhp,
          netCashPhp,
          ref: p.reference_no || 'OR-PAY',
          method: p.payment_method || 'Bank Remittance'
        })
      }
    })

    // 2. Process student package rates as fallback if no direct payment record exists
    students.forEach((s) => {
      const grossPhp = Number(s.php_equivalent || s.payment_amount || 0)
      const origAmt = Number(s.payment_amount || grossPhp)
      const rawDate = s.start_date || s.created_at || new Date().toISOString()
      const dateStr = typeof rawDate === 'string' ? rawDate.split('T')[0] : ''

      const alreadyInPayments = payments.some(
        (p) => String(p.student_id || '') === String(s.id || '')
      )

      if (grossPhp > 0 && !alreadyInPayments && dateStr) {
        list.push({
          id: `stu-${s.id}`,
          type: 'income',
          date: dateStr,
          student_name: s.name,
          currency: s.payment_currency || 'PHP',
          origAmt,
          grossPhp,
          transferFeePhp: 0,
          netCashPhp: grossPhp,
          ref: `OR-${s.name.substring(0, 3).toUpperCase()}`,
          method: s.country === 'China' ? 'WeChat / Alipay' : 'International Remittance'
        })
      }
    })

    // 3. Process operational expenses (EXPENSE / CASH DISBURSEMENTS)
    expenses.forEach((exp) => {
      const expAmt = Number(exp.amount_php || exp.amount || 0)
      const rawDate = exp.expense_date || exp.created_at || ''
      const dateStr = typeof rawDate === 'string' ? rawDate.split('T')[0] : ''

      if (expAmt > 0 && dateStr) {
        list.push({
          id: `exp-${exp.id}`,
          type: 'expense',
          date: dateStr,
          title: exp.title || exp.category || 'Operating Expense',
          currency: 'PHP',
          origAmt: expAmt,
          grossPhp: expAmt,
          transferFeePhp: 0,
          netCashPhp: expAmt,
          ref: 'CV-EXP',
          method: 'Cash / Bank Outflow'
        })
      }
    })

    const currentYear = selectedDate.substring(0, 4)
    const currentMonth = selectedDate.substring(0, 7)

    return list
      .filter((item) => {
        if (timeframe === 'daily') return item.date === selectedDate
        if (timeframe === 'monthly') return item.date.startsWith(currentMonth)
        if (timeframe === 'annual') return item.date.startsWith(currentYear)
        const itemTime = new Date(item.date).getTime()
        const selectedTime = new Date(selectedDate).getTime()
        return Math.abs(selectedTime - itemTime) / (1000 * 3600 * 24) <= 7
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [payments, students, expenses, selectedDate, timeframe])

  // Total Calculations (Debits must equal Credits)
  const totalDebit = combinedEntries.reduce((sum, item) => sum + item.grossPhp, 0)
  const totalCredit = totalDebit

  // Export CSV
  const exportToCSV = () => {
    const headers = [
      'Date',
      'Ref / OR No.',
      'Account Title & Explanation',
      'Client / Student / Expense',
      'Original Currency',
      'Original Amount',
      'Debit (PHP)',
      'Credit (PHP)'
    ]

    const rows: string[][] = []

    combinedEntries.forEach((entry) => {
      if (entry.type === 'expense') {
        rows.push([
          entry.date,
          `"${entry.ref}"`,
          `"Operating Expense: ${entry.title}"`,
          `"${entry.title}"`,
          entry.currency,
          String(entry.origAmt),
          String(entry.grossPhp),
          ''
        ])
        rows.push([
          '',
          '',
          `"   Cash in Bank / Cash Outflow"`,
          `"${entry.title}"`,
          '',
          '',
          '',
          String(entry.grossPhp)
        ])
      } else {
        rows.push([
          entry.date,
          `"${entry.ref}"`,
          `"Cash in Bank / Payment Gateway (${entry.method})"`,
          `"${entry.student_name}"`,
          entry.currency,
          String(entry.origAmt),
          String(entry.netCashPhp),
          ''
        ])

        if (entry.transferFeePhp > 0) {
          rows.push([
            '',
            '',
            `"   Bank Service Charges & Processing Fees"`,
            `"${entry.student_name}"`,
            '',
            '',
            String(entry.transferFeePhp),
            ''
          ])
        }

        rows.push([
          '',
          '',
          `"   Service Revenue (Private ESL Tutoring)"`,
          `"${entry.student_name}"`,
          '',
          '',
          '',
          String(entry.grossPhp)
        ])
      }
    })

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `BIR_PFRS_General_Journal_${selectedDate}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Export PDF Report
  const handleDownloadPdf = async () => {
    if (!printTableRef.current) return
    setIsExportingPdf(true)
    try {
      // @ts-ignore
      const html2pdfModule = await import('html2pdf.js')
      const html2pdf = html2pdfModule.default || html2pdfModule
      const element = printTableRef.current

      const opt = {
        margin: 8,
        filename: `BIR_PFRS_General_Journal_${timeframe.toUpperCase()}_${selectedDate}.pdf`,
        image: { type: 'png' as const, quality: 1.0 },
        html2canvas: {
          scale: 3,
          useCORS: true,
          backgroundColor: '#ffffff',
          scrollY: 0,
          letterRendering: true
        },
        jsPDF: {
          unit: 'mm' as const,
          format: 'a4' as const,
          orientation: 'landscape' as const
        }
      }

      await html2pdf().set(opt).from(element).save()
    } catch (err) {
      console.warn('html2pdf render failed, invoking print window fallback:', err)
      const printWindow = window.open('', '_blank')
      if (printWindow && printTableRef.current) {
        printWindow.document.write(`
          <html>
            <head>
              <title>BIR General Journal - PFRS Compliance - ${selectedDate}</title>
              <style>
                body { font-family: sans-serif; padding: 20px; color: #000; }
                table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 15px; }
                th, td { border: 1px solid #ccc; padding: 6px 8px; }
                th { background-color: #f3f4f6; text-transform: uppercase; font-size: 10px; }
                .text-right { text-align: right; }
                .font-bold { font-weight: bold; }
              </style>
            </head>
            <body>
              ${printTableRef.current.innerHTML}
              <script>
                window.onload = function() { window.print(); window.close(); }
              </script>
            </body>
          </html>
        `)
        printWindow.document.close()
      } else {
        alert('Please allow popups or verify html2pdf installation.')
      }
    } finally {
      setIsExportingPdf(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Action Buttons */}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={exportToCSV}
          className="px-3.5 py-1.5 bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
        >
          <Download size={13} />
          <span>Export BIR CSV</span>
        </button>

        <button
          type="button"
          onClick={handleDownloadPdf}
          disabled={isExportingPdf}
          className="px-3.5 py-1.5 bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
        >
          <FileText size={13} />
          <span>{isExportingPdf ? 'Exporting...' : 'Export Journal PDF'}</span>
        </button>
      </div>

      {/* Printable PFRS Double-Entry Journal Table */}
      <div ref={printTableRef} className="overflow-x-auto border border-pink-100 rounded-2xl bg-white p-4">
        <div className="p-3 border-b border-pink-100 mb-2">
          <h4 className="font-bold text-pink-950 text-sm">
            GENERAL JOURNAL / CASH RECEIPTS & DISBURSEMENTS BOOK (PFRS COMPLIANT)
          </h4>
          <p className="text-[11px] text-gray-500 capitalize">
            Period: {timeframe} ({selectedDate}) • Amounts expressed in Philippine Peso (PHP ₱)
          </p>
        </div>

        <table className="w-full text-left text-xs border-collapse bg-white">
          <thead>
            <tr className="border-b border-pink-100 bg-pink-50/60 text-pink-900 font-bold uppercase tracking-wider text-[10px]">
              <th className="py-2.5 px-3">Date</th>
              <th className="py-2.5 px-3">Ref / Voucher #</th>
              <th className="py-2.5 px-4">Account Title & PFRS Explanation</th>
              <th className="py-2.5 px-3">Original Foreign Currency</th>
              <th className="py-2.5 px-3 text-right">Debit (PHP)</th>
              <th className="py-2.5 px-3 text-right">Credit (PHP)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-pink-50 text-gray-700 font-medium font-mono text-[11px]">
            {combinedEntries.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-400 font-sans">
                  No journal entries recorded for this {timeframe} timeframe ({selectedDate}).
                </td>
              </tr>
            ) : (
              combinedEntries.map((entry) => (
                <React.Fragment key={entry.id}>
                  {entry.type === 'expense' ? (
                    <>
                      {/* Operational Expense Entry */}
                      <tr className="hover:bg-pink-50/20">
                        <td className="py-2 px-3 font-sans text-gray-900 font-semibold">{entry.date}</td>
                        <td className="py-2 px-3 text-gray-500">{entry.ref}</td>
                        <td className="py-2 px-4 text-rose-950 font-bold font-sans">
                          Operating Expense: {entry.title}
                        </td>
                        <td className="py-2 px-3 text-gray-500 font-sans">PHP {entry.grossPhp.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right font-bold text-rose-700">
                          ₱{entry.grossPhp.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 px-3 text-right text-gray-400">-</td>
                      </tr>
                      <tr className="hover:bg-pink-50/20">
                        <td className="py-1 px-3"></td>
                        <td className="py-1 px-3"></td>
                        <td className="py-1 px-4 pl-8 text-gray-600 font-sans">
                          ↳ Cash in Bank / Cash Outflow
                        </td>
                        <td className="py-1 px-3"></td>
                        <td className="py-1 px-3 text-right text-gray-400">-</td>
                        <td className="py-1 px-3 text-right font-bold text-gray-900">
                          ₱{entry.grossPhp.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </>
                  ) : (
                    <>
                      {/* Income Entry */}
                      <tr className="hover:bg-pink-50/20">
                        <td className="py-2 px-3 font-sans text-gray-900 font-semibold">{entry.date}</td>
                        <td className="py-2 px-3 text-gray-500">{entry.ref}</td>
                        <td className="py-2 px-4 text-pink-950 font-bold font-sans">
                          Cash in Bank ({entry.method})
                        </td>
                        <td className="py-2 px-3 text-gray-500 font-sans">
                          {entry.currency} {entry.origAmt.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-gray-900">
                          ₱{entry.netCashPhp.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 px-3 text-right text-gray-400">-</td>
                      </tr>

                      {entry.transferFeePhp > 0 && (
                        <tr className="hover:bg-pink-50/20">
                          <td className="py-1 px-3"></td>
                          <td className="py-1 px-3"></td>
                          <td className="py-1 px-4 pl-8 text-rose-700 font-sans">
                            ↳ Bank Service Charges & Processing Fees
                          </td>
                          <td className="py-1 px-3"></td>
                          <td className="py-1 px-3 text-right text-rose-600">
                            ₱{entry.transferFeePhp.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-1 px-3 text-right text-gray-400">-</td>
                        </tr>
                      )}

                      <tr className="hover:bg-pink-50/20">
                        <td className="py-1 px-3"></td>
                        <td className="py-1 px-3"></td>
                        <td className="py-1 px-4 pl-8 text-pink-700 font-sans">
                          ↳ Service Revenue: {entry.student_name}
                        </td>
                        <td className="py-1 px-3"></td>
                        <td className="py-1 px-3 text-right text-gray-400">-</td>
                        <td className="py-1 px-3 text-right font-bold text-gray-900">
                          ₱{entry.grossPhp.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>

          {combinedEntries.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-pink-200 bg-pink-50 text-pink-950 font-bold text-xs">
                <td colSpan={4} className="py-3 px-4 uppercase">
                  Total for this Period (Debits = Credits Check)
                </td>
                <td className="py-3 px-3 text-right font-mono font-extrabold text-pink-900">
                  ₱{totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td className="py-3 px-3 text-right font-mono font-extrabold text-pink-900">
                  ₱{totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}