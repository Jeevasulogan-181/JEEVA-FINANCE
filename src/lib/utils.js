/** Format number as Malaysian Ringgit */
export function fmt(n) {
  return 'RM ' + parseFloat(n || 0).toLocaleString('en-MY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/** Get month label e.g. "March 2025" */
export function getMonthLabel(date) {
  return date.toLocaleDateString('en-MY', { month: 'long', year: 'numeric' })
}

/** Today's date as YYYY-MM-DD */
export function today() {
  return new Date().toISOString().split('T')[0]
}

/** Aggregate monthly expense/income totals for charts (last N months) */
export function monthlyExpenses(records, months = 6) {
  const now = new Date()
  return Array.from({ length: months }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1)
    const label = d.toLocaleDateString('en-MY', { month: 'short' })
    const isMatch = (r) => {
      const rd = new Date(r.date)
      return rd.getFullYear() === d.getFullYear() && rd.getMonth() === d.getMonth()
    }
    const total = records
      .filter(r => isMatch(r) && (r.transaction_type === 'expense' || r.type === 'credit_transaction' || r.transaction_type === 'withdrawal'))
      .reduce((s, r) => s + parseFloat(r.amount || 0), 0)
    const totalIncome = records
      .filter(r => isMatch(r) && r.transaction_type === 'income')
      .reduce((s, r) => s + parseFloat(r.amount || 0), 0)
    return { label, total, totalIncome }
  })
}

/** Sum amounts by category */
export function categorySums(records) {
  return records.reduce((acc, r) => {
    const c = r.category || 'Other'
    acc[c] = (acc[c] || 0) + parseFloat(r.amount || 0)
    return acc
  }, {})
}

export const CAT_COLORS = {
  Food:          '#FF8A65',
  Transport:     '#42A5F5',
  Shopping:      '#AB47BC',
  Utilities:     '#26A69A',
  Entertainment: '#EC407A',
  Healthcare:    '#66BB6A',
  Salary:        '#C9A84C',
  Business:      '#F0D98C',
  Travel:        '#78909C',
  Other:         '#BDBDBD',
}
