'use client'

import React, { useRef, useState } from 'react'
import { Download, FileText } from 'lucide-react'

interface JournalReportProps {
  payments?: any[]
  students?: any[]
  selectedDate?: string
  timeframe?: 'daily' | 'weekly' | 'monthly' | 'annual'
}

export default function JournalReport({
  payments = [],
  students = [],
  selectedDate = new Date().toISOString().split('T')[0],
  timeframe = 'monthly'
}: JournalReportProps) {
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const printTableRef = useRef<HTMLDivElement>(null)

  // Filter and build entries based on timeframe & selected date
  const combinedEntries = React.useMemo(() => {
    const list: any[] = []

    // 1. Process payments
    payments.forEach((p) => {
      const phpAmt = Number(
        p.gross_amount_php ||
        p.php_equivalent ||
        p.payment_amount ||
        p.net_amount_php ||
        0
      )
      const origAmt = Number(p.original_amount || p.payment_amount || phpAmt)
      const rawDate = p.payment_date || p.created_at || ''
      const dateStr = typeof rawDate === 'string' ? rawDate.split('T')[0] : ''

      if (phpAmt > 0 && dateStr) {
        list.push({
          id: `pay-${p.id}`,
          date: dateStr,
          student_name: p.student_name || 'Private Student',
          currency: p.currency || 'PHP',
          origAmt,
          phpAmt,
          ref: p.reference_no || 'OR-PAY',
          method: p.payment_method || 'Bank Transfer'
        })
      }
    })

    // 2. Process student package rates if no direct payment row exists
    students.forEach((s) => {
      const phpAmt = Number(s.php_equivalent || s.payment_amount || 0)
      const origAmt = Number(s.payment_amount || phpAmt)
      const rawDate = s.start_date || s.created_at || new Date().toISOString()
      const dateStr = typeof rawDate === 'string' ? rawDate.split('T')[0] : ''

      const alreadyInPayments = payments.some((p) => p.student_id === s.id)

      if (phpAmt > 0 && !alreadyInPayments && dateStr) {
        list.push({
          id: `stu-${s.id}`,
          date: dateStr,
          student_name: s.name,
          currency: s.payment_currency || 'PHP',
          origAmt,
          phpAmt,
          ref: `OR-${s.name.substring(0, 3).toUpperCase()}`,
          method: s.country === 'China' ? 'WeChat / Alipay' : 'International Remittance'
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
  }, [payments, students, selectedDate, timeframe])

  const totalDebit = combinedEntries.reduce((sum, item) => sum + item.phpAmt, 0)
  const totalCredit = totalDebit

  // Export CSV
  const exportToCSV = () => {
    const headers = [
      'Date',
      'Ref / OR No.',
      'Account Title & Explanation',
      'Client / Student',
      'Original Currency',
      'Original Amount',
      'Debit (PHP - Cash/Bank)',
      'Credit (PHP - Teaching Income)'
    ]

    const rows: string[][] = []

    combinedEntries.forEach((entry) => {
      rows.push([
        entry.date,
        `"${entry.ref}"`,
        `"Cash in Bank / ${entry.method}"`,
        `"${entry.student_name}"`,
        entry.currency,
        String(entry.origAmt),
        String(entry.phpAmt),
        ''
      ])

      rows.push([
        '',
        '',
        `"   Service Revenue (Teaching Income)"`,
        `"${entry.student_name}"`,
        '',
        '',
        '',
        String(entry.phpAmt)
      ])
    })

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `BIR_Journal_Entries_${selectedDate}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Export PDF (300 DPI PNG High-Resolution)
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
        filename: `BIR_General_Journal_${timeframe.toUpperCase()}_${selectedDate}.pdf`,
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
      console.warn('html2pdf direct render failed, falling back to print preview:', err)
      const printWindow = window.open('', '_blank')
      if (printWindow && printTableRef.current) {
        printWindow.document.write(`
          <html>
            <head>
              <title>BIR General Journal - ${selectedDate}</title>
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
        alert('Please allow popups or verify html2pdf is installed.')
      }
    } finally {
      setIsExportingPdf(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Top Action Buttons */}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={exportToCSV}
          className="px-3.5 py-1.5 bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
        >
          <Download size={13} />
          <span>Export CSV</span>
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

      {/* Printable Journal Table Container */}
      <div ref={printTableRef} className="overflow-x-auto border border-pink-100 rounded-2xl bg-white p-4">
        <div className="p-3 border-b border-pink-100 mb-2">
          <h4 className="font-bold text-pink-950 text-sm">GENERAL JOURNAL / CASH RECEIPTS BOOK</h4>
          <p className="text-[11px] text-gray-500 capitalize">
            Period: {timeframe} ({selectedDate}) • Amounts expressed in Philippine Peso (PHP ₱)
          </p>
        </div>

        <table className="w-full text-left text-xs border-collapse bg-white">
          <thead>
            <tr className="border-b border-pink-100 bg-pink-50/60 text-pink-900 font-bold uppercase tracking-wider text-[10px]">
              <th className="py-2.5 px-3">Date</th>
              <th className="py-2.5 px-3">Ref / OR #</th>
              <th className="py-2.5 px-4">Account Title & Explanation</th>
              <th className="py-2.5 px-3">Original Currency</th>
              <th className="py-2.5 px-3 text-right">Debit (PHP)</th>
              <th className="py-2.5 px-3 text-right">Credit (PHP)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-pink-50 text-gray-700 font-medium font-mono text-[11px]">
            {combinedEntries.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-400 font-sans">
                  No journal entries found for this {timeframe} timeframe ({selectedDate}).
                </td>
              </tr>
            ) : (
              combinedEntries.map((entry) => (
                <React.Fragment key={entry.id}>
                  {/* Debit Row */}
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
                      ₱{entry.phpAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-3 text-right text-gray-400">-</td>
                  </tr>

                  {/* Credit Row */}
                  <tr className="hover:bg-pink-50/20">
                    <td className="py-1 px-3"></td>
                    <td className="py-1 px-3"></td>
                    <td className="py-1 px-4 pl-8 text-pink-700 font-sans">
                      ↳ Service Revenue: {entry.student_name}
                    </td>
                    <td className="py-1 px-3"></td>
                    <td className="py-1 px-3 text-right text-gray-400">-</td>
                    <td className="py-1 px-3 text-right font-bold text-gray-900">
                      ₱{entry.phpAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </React.Fragment>
              ))
            )}
          </tbody>

          {combinedEntries.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-pink-200 bg-pink-50 text-pink-950 font-bold text-xs">
                <td colSpan={4} className="py-3 px-4 uppercase">
                  Total for this Period
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