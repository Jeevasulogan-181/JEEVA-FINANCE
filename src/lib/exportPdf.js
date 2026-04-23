import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// ─── Colours ────────────────────────────────────────────────
const GOLD      = [201, 168, 76]
const GOLD_DARK = [156, 122, 46]
const DARK      = [44,  42,  37]
const MID       = [107, 99,  85]
const LIGHT     = [168, 158, 140]
const GREEN     = [59,  175, 126]
const RED       = [224, 92,  92]
const WHITE     = [255, 255, 255]
const OFF_WHITE = [250, 250, 248]

// ─── Helpers ────────────────────────────────────────────────
function fmt(n) {
  return 'RM ' + parseFloat(n || 0).toLocaleString('en-MY', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  })
}

function monthName(m) {
  return ['January','February','March','April','May','June',
          'July','August','September','October','November','December'][m]
}

/**
 * Draw the standard page header used on every statement
 * Returns the Y position after the header
 */
function drawHeader(doc, title, subtitle, period) {
  const pw = doc.internal.pageSize.getWidth()

  // Gold bar at top
  doc.setFillColor(...GOLD)
  doc.rect(0, 0, pw, 18, 'F')

  // App name
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...WHITE)
  doc.text('Finance Dashboard', 14, 11)

  // "Statement" label right side
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('ACCOUNT STATEMENT', pw - 14, 11, { align: 'right' })

  // Section title
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DARK)
  doc.text(title, 14, 30)

  // Subtitle + period
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...MID)
  doc.text(subtitle, 14, 37)
  doc.text(`Period: ${period}`, pw - 14, 37, { align: 'right' })

  // Divider
  doc.setDrawColor(...GOLD)
  doc.setLineWidth(0.5)
  doc.line(14, 41, pw - 14, 41)

  return 46 // next y
}

/**
 * Draw a small summary box row: label → value
 */
function summaryRow(doc, y, label, value, valueColor) {
  const pw = doc.internal.pageSize.getWidth()
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...MID)
  doc.text(label, 14, y)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...(valueColor || DARK))
  doc.text(value, pw - 14, y, { align: 'right' })
}

/**
 * Draw footer on each page
 */
function drawFooter(doc) {
  const pw  = doc.internal.pageSize.getWidth()
  const ph  = doc.internal.pageSize.getHeight()
  const pages = doc.internal.getNumberOfPages()

  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setDrawColor(...LIGHT)
    doc.setLineWidth(0.3)
    doc.line(14, ph - 14, pw - 14, ph - 14)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...LIGHT)
    doc.text(
      `Generated on ${new Date().toLocaleDateString('en-MY', { dateStyle: 'long' })}   ·   Finance Dashboard`,
      14, ph - 8
    )
    doc.text(`Page ${i} of ${pages}`, pw - 14, ph - 8, { align: 'right' })
  }
}

// ─── Filter records by month/year ───────────────────────────
function filterByPeriod(records, year, month) {
  // month is 0-indexed (JS Date style), or null = full year
  return records.filter(r => {
    if (!r.date) return false
    const d = new Date(r.date)
    if (d.getFullYear() !== year) return false
    if (month !== null && d.getMonth() !== month) return false
    return true
  })
}

// ────────────────────────────────────────────────────────────
// INCOME STATEMENT
// ────────────────────────────────────────────────────────────
export function exportIncomePDF({ records, year, month, bank }) {
  const doc    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const bankLabel = bank === 'cimb' ? 'CIMB Bank' : 'Public Bank'
  const period = month !== null
    ? `${monthName(month)} ${year}`
    : `Year ${year}`

  let y = drawHeader(doc, `Income Statement — ${bankLabel}`, 'Transactions for selected period', period)

  // Filter
  const allRecs   = records.filter(r => r.type === 'income_transaction' && r.bank === bank)
  const filtered  = filterByPeriod(allRecs, year, month)

  // Totals
  let income = 0, expenses = 0, savings = 0
  filtered.forEach(r => {
    const a = parseFloat(r.amount || 0)
    if (r.transaction_type === 'income')  income   += a
    if (r.transaction_type === 'expense') expenses += a
    if (r.transaction_type === 'savings') savings  += a
  })
  const balance = income - expenses - savings

  // Summary box
  doc.setFillColor(...OFF_WHITE)
  doc.roundedRect(14, y, doc.internal.pageSize.getWidth() - 28, 28, 2, 2, 'F')
  summaryRow(doc, y + 7,  'Total Income',   fmt(income),   GREEN)
  summaryRow(doc, y + 13, 'Total Expenses', fmt(expenses), RED)
  summaryRow(doc, y + 19, 'Savings Transfers', fmt(savings), GOLD_DARK)
  summaryRow(doc, y + 25, 'Net Balance',    fmt(balance),  balance >= 0 ? GREEN : RED)
  y += 34

  // Table
  const rows = [...filtered]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map(r => [
      r.date || '',
      r.description || '',
      r.category || '-',
      r.transaction_type || '',
      (r.transaction_type === 'income' ? '+' : '-') + ' ' + fmt(r.amount),
    ])

  autoTable(doc, {
    startY: y,
    head: [['Date', 'Description', 'Category', 'Type', 'Amount']],
    body: rows.length ? rows : [['', 'No transactions for this period', '', '', '']],
    styles: {
      font: 'helvetica', fontSize: 8, cellPadding: 3,
      textColor: DARK, lineColor: [237, 232, 220], lineWidth: 0.2,
    },
    headStyles: {
      fillColor: GOLD, textColor: WHITE, fontStyle: 'bold', fontSize: 8,
    },
    alternateRowStyles: { fillColor: OFF_WHITE },
    columnStyles: {
      0: { cellWidth: 24 },
      3: { cellWidth: 22 },
      4: { cellWidth: 30, halign: 'right' },
    },
    didParseCell(data) {
      if (data.section === 'body' && data.column.index === 4) {
        const val = String(data.cell.raw)
        data.cell.styles.textColor = val.startsWith('+') ? GREEN : RED
        data.cell.styles.fontStyle = 'bold'
      }
    },
  })

  drawFooter(doc)
  doc.save(`income-statement-${bankLabel.replace(' ', '-').toLowerCase()}-${period.replace(' ', '-')}.pdf`)
}

// ────────────────────────────────────────────────────────────
// SAVINGS STATEMENT
// ────────────────────────────────────────────────────────────
export function exportSavingsPDF({ records, year, month, bank }) {
  const doc       = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const bankLabel = bank === 'bsn' ? 'BSN' : 'Standard Chartered'
  const period    = month !== null ? `${monthName(month)} ${year}` : `Year ${year}`

  let y = drawHeader(doc, `Savings Statement — ${bankLabel}`, 'Transactions for selected period', period)

  const allRecs  = records.filter(r => r.type === 'savings_transaction' && r.bank === bank)
  const filtered = filterByPeriod(allRecs, year, month)

  let deposits = 0, withdrawals = 0
  filtered.forEach(r => {
    const a = parseFloat(r.amount || 0)
    if (r.transaction_type === 'deposit')    deposits    += a
    if (r.transaction_type === 'withdrawal') withdrawals += a
  })
  const balance = deposits - withdrawals

  // Running balance for opening
  const allSorted = [...allRecs].sort((a, b) => new Date(a.date) - new Date(b.date))
  let openingBal = 0
  allSorted.forEach(r => {
    const d = new Date(r.date)
    const inPeriod = month !== null
      ? (d.getFullYear() === year && d.getMonth() === month)
      : d.getFullYear() === year
    if (!inPeriod) {
      openingBal += r.transaction_type === 'deposit'
        ? parseFloat(r.amount || 0)
        : -parseFloat(r.amount || 0)
    }
  })

  // Summary box
  doc.setFillColor(...OFF_WHITE)
  doc.roundedRect(14, y, doc.internal.pageSize.getWidth() - 28, 28, 2, 2, 'F')
  summaryRow(doc, y + 7,  'Opening Balance',    fmt(openingBal),          DARK)
  summaryRow(doc, y + 13, 'Total Deposits',     fmt(deposits),             GREEN)
  summaryRow(doc, y + 19, 'Total Withdrawals',  fmt(withdrawals),          RED)
  summaryRow(doc, y + 25, 'Closing Balance',    fmt(openingBal + balance), GREEN)
  y += 34

  // Running balance column
  let running = openingBal
  const rows = [...filtered]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map(r => {
      const a = parseFloat(r.amount || 0)
      running += r.transaction_type === 'deposit' ? a : -a
      return [
        r.date || '',
        r.description || '',
        r.transaction_type === 'deposit' ? '+' + fmt(a) : '',
        r.transaction_type === 'withdrawal' ? '-' + fmt(a) : '',
        fmt(running),
      ]
    })

  autoTable(doc, {
    startY: y,
    head: [['Date', 'Description', 'Deposit', 'Withdrawal', 'Balance']],
    body: rows.length ? rows : [['', 'No transactions for this period', '', '', '']],
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 3, textColor: DARK, lineColor: [237, 232, 220], lineWidth: 0.2 },
    headStyles: { fillColor: GOLD, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: OFF_WHITE },
    columnStyles: {
      0: { cellWidth: 24 },
      2: { cellWidth: 28, halign: 'right' },
      3: { cellWidth: 28, halign: 'right' },
      4: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
    },
    didParseCell(data) {
      if (data.section === 'body') {
        if (data.column.index === 2 && data.cell.raw) data.cell.styles.textColor = GREEN
        if (data.column.index === 3 && data.cell.raw) data.cell.styles.textColor = RED
      }
    },
  })

  drawFooter(doc)
  doc.save(`savings-statement-${bankLabel.replace(' ', '-').toLowerCase()}-${period.replace(' ', '-')}.pdf`)
}

// ────────────────────────────────────────────────────────────
// CREDIT CARD STATEMENT
// ────────────────────────────────────────────────────────────
export function exportCreditPDF({ records, settings, year, month }) {
  const doc    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const period = month !== null ? `${monthName(month)} ${year}` : `Year ${year}`

  let y = drawHeader(doc, 'Credit Card Statement — UOB', 'Spending for selected period', period)

  const allRecs  = records.filter(r => r.type === 'credit_transaction')
  const filtered = filterByPeriod(allRecs, year, month)

  const totalSpent  = filtered.reduce((s, r) => s + parseFloat(r.amount || 0), 0)
  const creditLimit = settings?.limit || 0
  const available   = creditLimit - records.filter(r => r.type === 'credit_transaction').reduce((s, r) => s + parseFloat(r.amount || 0), 0)

  // Category breakdown
  const cats = {}
  filtered.forEach(r => {
    const c = r.category || 'Other'
    cats[c] = (cats[c] || 0) + parseFloat(r.amount || 0)
  })

  // Summary box
  doc.setFillColor(...OFF_WHITE)
  doc.roundedRect(14, y, doc.internal.pageSize.getWidth() - 28, 28, 2, 2, 'F')
  summaryRow(doc, y + 7,  'Credit Limit',          fmt(creditLimit), DARK)
  summaryRow(doc, y + 13, 'Available Credit',       fmt(available),   GREEN)
  summaryRow(doc, y + 19, `Spent This ${month !== null ? 'Month' : 'Year'}`, fmt(totalSpent), RED)
  summaryRow(doc, y + 25, 'Due Day',                `${settings?.due_day || '-'} of each month`, MID)
  y += 34

  // Transactions table
  const rows = [...filtered]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map(r => [r.date || '', r.description || '', r.category || '-', fmt(r.amount)])

  autoTable(doc, {
    startY: y,
    head: [['Date', 'Description', 'Category', 'Amount']],
    body: rows.length ? rows : [['', 'No transactions for this period', '', '']],
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 3, textColor: DARK, lineColor: [237, 232, 220], lineWidth: 0.2 },
    headStyles: { fillColor: GOLD, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: OFF_WHITE },
    columnStyles: {
      0: { cellWidth: 24 },
      3: { cellWidth: 28, halign: 'right', fontStyle: 'bold', textColor: RED },
    },
    foot: rows.length ? [['', '', 'TOTAL', fmt(totalSpent)]] : [],
    footStyles: { fillColor: [250, 243, 220], textColor: GOLD_DARK, fontStyle: 'bold' },
  })

  // Category breakdown
  if (Object.keys(cats).length > 0) {
    const finalY = doc.lastAutoTable.finalY + 10
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...DARK)
    doc.text('Spending by Category', 14, finalY)

    autoTable(doc, {
      startY: finalY + 4,
      head: [['Category', 'Amount', '% of Total']],
      body: Object.entries(cats)
        .sort((a, b) => b[1] - a[1])
        .map(([cat, amt]) => [
          cat,
          fmt(amt),
          totalSpent > 0 ? ((amt / totalSpent) * 100).toFixed(1) + '%' : '0%',
        ]),
      styles: { font: 'helvetica', fontSize: 8, cellPadding: 3, textColor: DARK, lineColor: [237, 232, 220], lineWidth: 0.2 },
      headStyles: { fillColor: [156, 122, 46], textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: OFF_WHITE },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
      },
    })
  }

  drawFooter(doc)
  doc.save(`credit-statement-uob-${period.replace(' ', '-')}.pdf`)
}

// ────────────────────────────────────────────────────────────
// FULL FINANCIAL REPORT — All sections in one PDF
// ────────────────────────────────────────────────────────────
export function exportFullReportPDF({ records, settings, year, month }) {
  const doc    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pw     = doc.internal.pageSize.getWidth()
  const period = month !== null ? `${monthName(month)} ${year}` : `Full Year ${year}`
  const generatedOn = new Date().toLocaleDateString('en-MY', { dateStyle: 'long' })

  // ── Cover Page ─────────────────────────────────────────────
  // Background gradient effect
  doc.setFillColor(250, 243, 220)
  doc.rect(0, 0, pw, 297, 'F')

  // Gold top bar
  doc.setFillColor(...GOLD)
  doc.rect(0, 0, pw, 40, 'F')

  // Logo area
  doc.setFillColor(...GOLD_DARK)
  doc.circle(pw / 2, 22, 10, 'F')
  doc.setTextColor(...WHITE)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('FD', pw / 2, 26, { align: 'center' })

  // Title
  doc.setTextColor(...DARK)
  doc.setFontSize(26)
  doc.setFont('helvetica', 'bold')
  doc.text('Financial Report', pw / 2, 75, { align: 'center' })

  doc.setFontSize(14)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...MID)
  doc.text(period, pw / 2, 87, { align: 'center' })

  // Decorative line
  doc.setDrawColor(...GOLD)
  doc.setLineWidth(1)
  doc.line(pw / 2 - 30, 94, pw / 2 + 30, 94)

  // Summary boxes on cover
  const ci = calcIncomeTotal(records, 'cimb')
  const pb = calcIncomeTotal(records, 'public')
  const bs = calcSavingsTotal(records, 'bsn')
  const sc = calcSavingsTotal(records, 'sc')

  const filteredIncome   = filterByPeriod(records.filter(r => r.type === 'income_transaction'), year, month)
  const filteredSavings  = filterByPeriod(records.filter(r => r.type === 'savings_transaction'), year, month)
  const filteredCredit   = filterByPeriod(records.filter(r => r.type === 'credit_transaction'), year, month)

  let totalIncome = 0, totalExpenses = 0, totalSavingsIn = 0, totalCredit = 0
  filteredIncome.forEach(r => {
    const a = parseFloat(r.amount || 0)
    if (r.transaction_type === 'income') totalIncome += a
    if (r.transaction_type === 'expense') totalExpenses += a
  })
  filteredSavings.forEach(r => {
    if (r.transaction_type === 'deposit') totalSavingsIn += parseFloat(r.amount || 0)
  })
  totalCredit = filteredCredit.reduce((s, r) => s + parseFloat(r.amount || 0), 0)

  const netBalance = totalIncome - totalExpenses - totalCredit

  // 4 stat boxes
  const boxes = [
    { label: 'Total Income',    value: fmt(totalIncome),   color: GREEN },
    { label: 'Total Expenses',  value: fmt(totalExpenses), color: RED   },
    { label: 'Total Savings',   value: fmt(totalSavingsIn),color: [...GOLD_DARK] },
    { label: 'Credit Spent',    value: fmt(totalCredit),   color: RED   },
  ]
  const bw = (pw - 28 - 12) / 4
  boxes.forEach((b, i) => {
    const bx = 14 + i * (bw + 4)
    doc.setFillColor(...WHITE)
    doc.roundedRect(bx, 104, bw, 28, 2, 2, 'F')
    doc.setDrawColor(...GOLD)
    doc.setLineWidth(0.3)
    doc.roundedRect(bx, 104, bw, 28, 2, 2, 'S')
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...MID)
    doc.text(b.label, bx + bw / 2, 111, { align: 'center' })
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...b.color)
    doc.text(b.value, bx + bw / 2, 119, { align: 'center' })
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...MID)
    doc.text('(period)', bx + bw / 2, 126, { align: 'center' })
  })

  // Net balance highlight
  doc.setFillColor(...WHITE)
  doc.roundedRect(14, 140, pw - 28, 22, 3, 3, 'F')
  doc.setDrawColor(...(netBalance >= 0 ? GREEN : RED))
  doc.setLineWidth(0.8)
  doc.roundedRect(14, 140, pw - 28, 22, 3, 3, 'S')
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...MID)
  doc.text('Net Balance (Income − Expenses − Credit)', pw / 2, 149, { align: 'center' })
  doc.setFontSize(14)
  doc.setTextColor(...(netBalance >= 0 ? GREEN : RED))
  doc.text(fmt(netBalance), pw / 2, 158, { align: 'center' })

  // Table of Contents
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DARK)
  doc.text('Contents', 14, 178)
  doc.setDrawColor(...GOLD)
  doc.setLineWidth(0.4)
  doc.line(14, 181, pw - 14, 181)

  const sections = [
    '1.  Overview Summary',
    '2.  Income — CIMB Bank',
    '3.  Income — Public Bank',
    '4.  Savings — BSN',
    '5.  Savings — Standard Chartered',
    '6.  Credit Card — UOB',
    '7.  All Transactions (Combined)',
  ]
  sections.forEach((s, i) => {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...MID)
    doc.text(s, 20, 189 + i * 8)
  })

  // Cover footer
  doc.setFontSize(8)
  doc.setTextColor(...LIGHT)
  doc.text(`Generated on ${generatedOn}   ·   Finance Dashboard`, pw / 2, 270, { align: 'center' })
  doc.text('Private & Confidential', pw / 2, 277, { align: 'center' })

  // ── Page 2: Overview Summary ───────────────────────────────
  doc.addPage()
  let y = drawHeader(doc, '1. Overview Summary', 'Complete financial snapshot for period', period)

  // All 4 bank balances
  doc.setFillColor(...OFF_WHITE)
  doc.roundedRect(14, y, pw - 28, 44, 2, 2, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...GOLD_DARK)
  doc.text('INCOME BANKS', 18, y + 7)
  summaryRow(doc, y + 14, 'CIMB — Balance',       fmt(ci.balance),  ci.balance >= 0 ? GREEN : RED)
  summaryRow(doc, y + 20, 'Public Bank — Balance', fmt(pb.balance),  pb.balance >= 0 ? GREEN : RED)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...GOLD_DARK)
  doc.text('SAVINGS BANKS', 18, y + 29)
  summaryRow(doc, y + 36, 'BSN — Balance',               fmt(bs.balance), GREEN)
  summaryRow(doc, y + 42, 'Standard Chartered — Balance', fmt(sc.balance), GREEN)
  y += 52

  // Credit card summary
  const creditSpent = records.filter(r => r.type === 'credit_transaction').reduce((s, r) => s + parseFloat(r.amount || 0), 0)
  const creditLimit = settings?.limit || 0
  const utilPct = creditLimit > 0 ? ((creditSpent / creditLimit) * 100).toFixed(1) : '0'

  doc.setFillColor(...OFF_WHITE)
  doc.roundedRect(14, y, pw - 28, 22, 2, 2, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...GOLD_DARK)
  doc.text('UOB CREDIT CARD', 18, y + 7)
  summaryRow(doc, y + 14, 'Total Spent (all time)', fmt(creditSpent), RED)
  summaryRow(doc, y + 20, `Credit Limit / Utilisation`, `${fmt(creditLimit)} / ${utilPct}%`, MID)
  y += 30

  // Period transactions count
  const totalTxns = filteredIncome.length + filteredSavings.length + filteredCredit.length
  doc.setFillColor(230, 242, 255)
  doc.roundedRect(14, y, pw - 28, 16, 2, 2, 'F')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...MID)
  doc.text(`Total transactions in ${period}: ${totalTxns}`, pw / 2, y + 10, { align: 'center' })
  y += 24

  // Mini combined table — recent 15 transactions
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DARK)
  doc.text('Recent Transactions (all accounts)', 14, y)
  y += 4

  const allFiltered = [...filteredIncome, ...filteredSavings, ...filteredCredit]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 15)

  const bankLbl = { cimb: 'CIMB', public: 'Public Bank', bsn: 'BSN', sc: 'Std. Chartered', uob: 'UOB' }

  autoTable(doc, {
    startY: y,
    head: [['Date', 'Description', 'Account', 'Type', 'Amount']],
    body: allFiltered.length ? allFiltered.map(r => {
      const isPos = r.transaction_type === 'income' || r.transaction_type === 'deposit'
      const isNeg = r.transaction_type === 'expense' || r.transaction_type === 'withdrawal' || r.type === 'credit_transaction'
      return [r.date || '', r.description || '', bankLbl[r.bank] || r.bank || '—', r.transaction_type || '', (isNeg ? '- ' : '+ ') + fmt(r.amount)]
    }) : [['', 'No transactions for this period', '', '', '']],
    styles: { font: 'helvetica', fontSize: 7.5, cellPadding: 2.5, textColor: DARK, lineColor: [237, 232, 220], lineWidth: 0.2 },
    headStyles: { fillColor: GOLD, textColor: WHITE, fontStyle: 'bold', fontSize: 7.5 },
    alternateRowStyles: { fillColor: OFF_WHITE },
    columnStyles: {
      0: { cellWidth: 22 },
      3: { cellWidth: 20 },
      4: { cellWidth: 28, halign: 'right' },
    },
    didParseCell(data) {
      if (data.section === 'body' && data.column.index === 4) {
        data.cell.styles.textColor = String(data.cell.raw).startsWith('-') ? RED : GREEN
        data.cell.styles.fontStyle = 'bold'
      }
    },
  })

  // ── Page 3: Income CIMB ────────────────────────────────────
  doc.addPage()
  y = drawHeader(doc, '2. Income — CIMB Bank', 'Income, expenses and transfers', period)
  y = addIncomeSection(doc, records, year, month, 'cimb', y)

  // ── Page 4: Income Public Bank ─────────────────────────────
  doc.addPage()
  y = drawHeader(doc, '3. Income — Public Bank', 'Income, expenses and transfers', period)
  y = addIncomeSection(doc, records, year, month, 'public', y)

  // ── Page 5: Savings BSN ────────────────────────────────────
  doc.addPage()
  y = drawHeader(doc, '4. Savings — BSN', 'Deposits and withdrawals', period)
  y = addSavingsSection(doc, records, year, month, 'bsn', y)

  // ── Page 6: Savings Standard Chartered ────────────────────
  doc.addPage()
  y = drawHeader(doc, '5. Savings — Standard Chartered', 'Deposits and withdrawals', period)
  y = addSavingsSection(doc, records, year, month, 'sc', y)

  // ── Page 7: Credit Card ─────────────────────────────────────
  doc.addPage()
  y = drawHeader(doc, '6. Credit Card — UOB', 'Spending and category breakdown', period)
  y = addCreditSection(doc, records, settings, year, month, y)

  // ── Page 8: All Transactions Combined ─────────────────────
  doc.addPage()
  y = drawHeader(doc, '7. All Transactions', 'Combined list from all accounts', period)
  addAllTransactions(doc, records, year, month, y)

  drawFooter(doc)
  doc.save(`full-financial-report-${period.replace(' ', '-')}.pdf`)
}

// ─── Section builders ─────────────────────────────────────────
function calcIncomeTotal(records, bank) {
  let income = 0, expenses = 0, savings = 0
  records.filter(r => r.type === 'income_transaction' && r.bank === bank).forEach(r => {
    const a = parseFloat(r.amount || 0)
    if (r.transaction_type === 'income') income += a
    else if (r.transaction_type === 'expense') expenses += a
    else if (r.transaction_type === 'savings') savings += a
  })
  return { income, expenses, savings, balance: income - expenses - savings }
}

function calcSavingsTotal(records, bank) {
  let d = 0, w = 0
  records.filter(r => r.type === 'savings_transaction' && r.bank === bank).forEach(r => {
    const a = parseFloat(r.amount || 0)
    if (r.transaction_type === 'deposit') d += a; else w += a
  })
  return { deposits: d, withdrawals: w, balance: d - w }
}

function addIncomeSection(doc, records, year, month, bank, y) {
  const pw       = doc.internal.pageSize.getWidth()
  const bankRecs = records.filter(r => r.type === 'income_transaction' && r.bank === bank)
  const filtered = filterByPeriod(bankRecs, year, month)
  let income = 0, expenses = 0, savings = 0
  filtered.forEach(r => {
    const a = parseFloat(r.amount || 0)
    if (r.transaction_type === 'income') income += a
    if (r.transaction_type === 'expense') expenses += a
    if (r.transaction_type === 'savings') savings += a
  })
  const balance = income - expenses - savings

  doc.setFillColor(...OFF_WHITE)
  doc.roundedRect(14, y, pw - 28, 28, 2, 2, 'F')
  summaryRow(doc, y + 7,  'Total Income',        fmt(income),   GREEN)
  summaryRow(doc, y + 13, 'Total Expenses',       fmt(expenses), RED)
  summaryRow(doc, y + 19, 'Savings Transfers',    fmt(savings),  GOLD_DARK)
  summaryRow(doc, y + 25, 'Net Balance',          fmt(balance),  balance >= 0 ? GREEN : RED)
  y += 34

  const rows = [...filtered].sort((a, b) => new Date(a.date) - new Date(b.date)).map(r => [
    r.date || '', r.description || '', r.category || '-', r.transaction_type || '',
    (r.transaction_type === 'income' ? '+ ' : '- ') + fmt(r.amount),
  ])

  autoTable(doc, {
    startY: y,
    head: [['Date', 'Description', 'Category', 'Type', 'Amount']],
    body: rows.length ? rows : [['', 'No transactions for this period', '', '', '']],
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 3, textColor: DARK, lineColor: [237, 232, 220], lineWidth: 0.2 },
    headStyles: { fillColor: GOLD, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: OFF_WHITE },
    columnStyles: { 0: { cellWidth: 24 }, 3: { cellWidth: 22 }, 4: { cellWidth: 30, halign: 'right' } },
    didParseCell(data) {
      if (data.section === 'body' && data.column.index === 4) {
        data.cell.styles.textColor = String(data.cell.raw).startsWith('+') ? GREEN : RED
        data.cell.styles.fontStyle = 'bold'
      }
    },
    foot: rows.length ? [['', '', '', 'TOTAL INCOME', '+ ' + fmt(income)], ['', '', '', 'TOTAL EXPENSES', '- ' + fmt(expenses)]] : [],
    footStyles: { fillColor: [250, 243, 220], textColor: GOLD_DARK, fontStyle: 'bold' },
  })
  return doc.lastAutoTable?.finalY || y
}

function addSavingsSection(doc, records, year, month, bank, y) {
  const pw       = doc.internal.pageSize.getWidth()
  const bankRecs = records.filter(r => r.type === 'savings_transaction' && r.bank === bank)
  const filtered = filterByPeriod(bankRecs, year, month)
  let deposits = 0, withdrawals = 0
  filtered.forEach(r => {
    const a = parseFloat(r.amount || 0)
    if (r.transaction_type === 'deposit') deposits += a; else withdrawals += a
  })

  // Opening balance (before period)
  let opening = 0
  const allSorted = [...bankRecs].sort((a, b) => new Date(a.date) - new Date(b.date))
  allSorted.forEach(r => {
    const d = new Date(r.date)
    const inPeriod = month !== null
      ? d.getFullYear() === year && d.getMonth() === month
      : d.getFullYear() === year
    if (!inPeriod) opening += r.transaction_type === 'deposit' ? parseFloat(r.amount || 0) : -parseFloat(r.amount || 0)
  })

  doc.setFillColor(...OFF_WHITE)
  doc.roundedRect(14, y, pw - 28, 28, 2, 2, 'F')
  summaryRow(doc, y + 7,  'Opening Balance',   fmt(opening),                     DARK)
  summaryRow(doc, y + 13, 'Total Deposits',    fmt(deposits),                    GREEN)
  summaryRow(doc, y + 19, 'Total Withdrawals', fmt(withdrawals),                 RED)
  summaryRow(doc, y + 25, 'Closing Balance',   fmt(opening + deposits - withdrawals), GREEN)
  y += 34

  let running = opening
  const rows = [...filtered].sort((a, b) => new Date(a.date) - new Date(b.date)).map(r => {
    const a = parseFloat(r.amount || 0)
    running += r.transaction_type === 'deposit' ? a : -a
    return [r.date || '', r.description || '', r.transaction_type === 'deposit' ? '+ ' + fmt(a) : '', r.transaction_type === 'withdrawal' ? '- ' + fmt(a) : '', fmt(running)]
  })

  autoTable(doc, {
    startY: y,
    head: [['Date', 'Description', 'Deposit', 'Withdrawal', 'Balance']],
    body: rows.length ? rows : [['', 'No transactions for this period', '', '', '']],
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 3, textColor: DARK, lineColor: [237, 232, 220], lineWidth: 0.2 },
    headStyles: { fillColor: GOLD, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: OFF_WHITE },
    columnStyles: { 0: { cellWidth: 24 }, 2: { cellWidth: 28, halign: 'right' }, 3: { cellWidth: 28, halign: 'right' }, 4: { cellWidth: 30, halign: 'right', fontStyle: 'bold' } },
    didParseCell(data) {
      if (data.section === 'body') {
        if (data.column.index === 2 && data.cell.raw) data.cell.styles.textColor = GREEN
        if (data.column.index === 3 && data.cell.raw) data.cell.styles.textColor = RED
      }
    },
  })
  return doc.lastAutoTable?.finalY || y
}

function addCreditSection(doc, records, settings, year, month, y) {
  const pw       = doc.internal.pageSize.getWidth()
  const filtered = filterByPeriod(records.filter(r => r.type === 'credit_transaction'), year, month)
  const spent    = filtered.reduce((s, r) => s + parseFloat(r.amount || 0), 0)
  const limit    = settings?.limit || 0
  const avail    = limit - records.filter(r => r.type === 'credit_transaction').reduce((s, r) => s + parseFloat(r.amount || 0), 0)
  const pct      = limit > 0 ? ((records.filter(r => r.type === 'credit_transaction').reduce((s, r) => s + parseFloat(r.amount || 0), 0) / limit) * 100).toFixed(1) : '0'

  doc.setFillColor(...OFF_WHITE)
  doc.roundedRect(14, y, pw - 28, 28, 2, 2, 'F')
  summaryRow(doc, y + 7,  'Credit Limit',     fmt(limit),  DARK)
  summaryRow(doc, y + 13, 'Available Credit', fmt(avail),  GREEN)
  summaryRow(doc, y + 19, 'Spent This Period', fmt(spent), RED)
  summaryRow(doc, y + 25, 'Overall Utilisation', `${pct}%`, parseFloat(pct) > 70 ? RED : GREEN)
  y += 34

  // Category breakdown
  const cats = {}
  filtered.forEach(r => { const c = r.category || 'Other'; cats[c] = (cats[c] || 0) + parseFloat(r.amount || 0) })

  const rows = [...filtered].sort((a, b) => new Date(a.date) - new Date(b.date)).map(r => [r.date || '', r.description || '', r.category || '-', fmt(r.amount)])

  autoTable(doc, {
    startY: y,
    head: [['Date', 'Description', 'Category', 'Amount']],
    body: rows.length ? rows : [['', 'No transactions for this period', '', '']],
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 3, textColor: DARK, lineColor: [237, 232, 220], lineWidth: 0.2 },
    headStyles: { fillColor: GOLD, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: OFF_WHITE },
    columnStyles: { 0: { cellWidth: 24 }, 3: { cellWidth: 28, halign: 'right', fontStyle: 'bold', textColor: RED } },
    foot: rows.length ? [['', '', 'TOTAL', fmt(spent)]] : [],
    footStyles: { fillColor: [250, 243, 220], textColor: GOLD_DARK, fontStyle: 'bold' },
  })

  // Category breakdown table
  if (Object.keys(cats).length > 0) {
    const fy = doc.lastAutoTable.finalY + 8
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...DARK)
    doc.text('Spending by Category', 14, fy)
    autoTable(doc, {
      startY: fy + 4,
      head: [['Category', 'Amount', '% of Total']],
      body: Object.entries(cats).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => [cat, fmt(amt), spent > 0 ? ((amt / spent) * 100).toFixed(1) + '%' : '0%']),
      styles: { font: 'helvetica', fontSize: 8, cellPadding: 3, textColor: DARK, lineColor: [237, 232, 220], lineWidth: 0.2 },
      headStyles: { fillColor: GOLD_DARK, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: OFF_WHITE },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
    })
  }
  return doc.lastAutoTable?.finalY || y
}

function addAllTransactions(doc, records, year, month, y) {
  const allFiltered = filterByPeriod(
    records.filter(r => ['income_transaction','savings_transaction','credit_transaction'].includes(r.type)),
    year, month
  ).sort((a, b) => new Date(a.date) - new Date(b.date))

  const bankLbl = { cimb: 'CIMB', public: 'Public Bank', bsn: 'BSN', sc: 'Std. Chartered', uob: 'UOB' }

  const rows = allFiltered.map(r => {
    const isPos = r.transaction_type === 'income' || r.transaction_type === 'deposit'
    const isNeg = r.transaction_type === 'expense' || r.transaction_type === 'withdrawal' || r.type === 'credit_transaction'
    return [r.date || '', r.description || '', bankLbl[r.bank] || r.bank || '—', r.category || '-', r.transaction_type || '', (isNeg ? '- ' : '+ ') + fmt(r.amount)]
  })

  autoTable(doc, {
    startY: y,
    head: [['Date', 'Description', 'Account', 'Category', 'Type', 'Amount']],
    body: rows.length ? rows : [['', 'No transactions for this period', '', '', '', '']],
    styles: { font: 'helvetica', fontSize: 7.5, cellPadding: 2.5, textColor: DARK, lineColor: [237, 232, 220], lineWidth: 0.2 },
    headStyles: { fillColor: GOLD, textColor: WHITE, fontStyle: 'bold', fontSize: 7.5 },
    alternateRowStyles: { fillColor: OFF_WHITE },
    columnStyles: {
      0: { cellWidth: 21 },
      2: { cellWidth: 26 },
      4: { cellWidth: 20 },
      5: { cellWidth: 26, halign: 'right' },
    },
    didParseCell(data) {
      if (data.section === 'body' && data.column.index === 5) {
        data.cell.styles.textColor = String(data.cell.raw).startsWith('-') ? RED : GREEN
        data.cell.styles.fontStyle = 'bold'
      }
    },
  })
}
