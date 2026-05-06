import { useContext, useState, useEffect } from 'react'
import { Plus, Wallet, ArrowDownLeft, Pencil, Trash2, Settings } from 'lucide-react'
import { Doughnut, Bar, Line } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, BarElement, LineElement, PointElement, CategoryScale, LinearScale, Filler, Tooltip, Legend } from 'chart.js'
import { RecordsContext, ToastContext } from '../../pages/Dashboard'
import { createRecord, updateRecord, deleteRecord } from '../../lib/db'
import { fetchBudgets, setBudget, deleteBudget, fetchDailyExpenses, createDailyExpense, deleteDailyExpense } from '../../lib/dailyExpensesDb'
import { fmt } from '../../lib/utils'
import Modal from '../ui/Modal'
import { BtnGold, BtnDanger, BtnOutline } from '../ui/Button'
import { FormInput, FormSelect, FormTextarea } from '../ui/FormField'
import EditTransactionModal from '../ui/EditTransactionModal'

ChartJS.register(ArcElement, BarElement, LineElement, PointElement, CategoryScale, LinearScale, Filler, Tooltip, Legend)

const CATEGORIES = ['Food & Drinks', 'Transport', 'Groceries', 'Personal Care', 'Entertainment', 'Miscellaneous']
const CAT_COLORS = {
  'Food & Drinks': '#FF7043', 'Transport': '#42A5F5', 'Groceries': '#66BB6A',
  'Personal Care': '#AB47BC', 'Entertainment': '#FFA726', 'Miscellaneous': '#BDBDBD',
}
const CAT_ICONS = {
  'Food & Drinks': '🍜', 'Transport': '🚌', 'Groceries': '🛒',
  'Personal Care': '💆', 'Entertainment': '🎮', 'Miscellaneous': '📦',
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const today  = () => new Date().toISOString().split('T')[0]

function pct(spent, budget) {
  if (!budget || budget <= 0) return 0
  return Math.min((spent / budget) * 100, 100)
}

function barColor(p) {
  if (p >= 90) return '#E05C5C'
  if (p >= 70) return '#FFA726'
  return '#3BAF7E'
}

export default function DailyExpenses() {
  const { records, reload: reloadRecords } = useContext(RecordsContext)
  const addToast = useContext(ToastContext)

  const now = new Date()
  const [selMonth,   setSelMonth]   = useState(now.getMonth() + 1)  // 1-12
  const [selYear,    setSelYear]    = useState(now.getFullYear())
  const [budgets,    setBudgets]    = useState([])
  const [expenses,   setExpenses]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [addExpOpen, setAddExpOpen] = useState(false)
  const [budgetOpen, setBudgetOpen] = useState(false)
  const [editRec,    setEditRec]    = useState(null)
  const [saving,     setSaving]     = useState(false)

  const [expForm, setExpForm] = useState({ description: '', category: 'Food & Drinks', amount: '', date: today(), notes: '' })
  const [budForm, setBudForm] = useState({ amount: '', from_bank: 'cimb', notes: '' })
  const setE = (k, v) => setExpForm(f => ({ ...f, [k]: v }))
  const setB = (k, v) => setBudForm(f => ({ ...f, [k]: v }))

  async function load() {
    try {
      const [b, e] = await Promise.all([fetchBudgets(), fetchDailyExpenses()])
      setBudgets(b); setExpenses(e)
    } catch(err) { addToast(err.message, 'error') }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  // ── Current month data ─────────────────────────────────────
  const currentBudget = budgets.find(b => b.month === selMonth && b.year === selYear)
  const budgetAmt     = parseFloat(currentBudget?.budget_amount || 0)

  const monthExpenses = expenses.filter(e => {
    const d = new Date(e.date)
    return d.getMonth() + 1 === selMonth && d.getFullYear() === selYear
  })

  const totalSpent = monthExpenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0)
  const remaining  = Math.max(0, budgetAmt - totalSpent)
  const spentPct   = pct(totalSpent, budgetAmt)
  const overBudget = totalSpent > budgetAmt && budgetAmt > 0

  // Category breakdown
  const catTotals = {}
  CATEGORIES.forEach(c => { catTotals[c] = 0 })
  monthExpenses.forEach(e => { catTotals[e.category] = (catTotals[e.category] || 0) + parseFloat(e.amount || 0) })

  // Charts
  const doughnutData = {
    labels:   CATEGORIES.filter(c => catTotals[c] > 0),
    datasets: [{ data: CATEGORIES.filter(c => catTotals[c] > 0).map(c => catTotals[c]), backgroundColor: CATEGORIES.filter(c => catTotals[c] > 0).map(c => CAT_COLORS[c]), borderWidth: 0 }],
  }

  const barData = {
    labels: CATEGORIES,
    datasets: [{ label: 'Spent', data: CATEGORIES.map(c => catTotals[c]), backgroundColor: CATEGORIES.map(c => CAT_COLORS[c]), borderRadius: 6 }],
  }

  // Daily spending trend
  const daysInMonth = new Date(selYear, selMonth, 0).getDate()
  const dailyLabels = Array.from({ length: daysInMonth }, (_, i) => `${i + 1}`)
  const dailyData   = Array(daysInMonth).fill(0)
  monthExpenses.forEach(e => { const day = new Date(e.date).getDate() - 1; if (dailyData[day] !== undefined) dailyData[day] += parseFloat(e.amount || 0) })
  const cumulativeData = dailyData.reduce((acc, v, i) => { acc.push((acc[i - 1] || 0) + v); return acc }, [])

  const lineData = {
    labels: dailyLabels,
    datasets: [
      { label: 'Daily Spending', data: dailyData, borderColor: '#FF7043', backgroundColor: 'rgba(255,112,67,0.15)', fill: true, tension: 0.4, pointRadius: 2 },
      { label: 'Cumulative',     data: cumulativeData, borderColor: '#42A5F5', backgroundColor: 'transparent', fill: false, tension: 0.4, pointRadius: 0, borderWidth: 1.5 },
    ],
  }
  if (budgetAmt > 0) {
    lineData.datasets.push({ label: 'Budget', data: Array(daysInMonth).fill(budgetAmt), borderColor: '#EDE8DC', borderDash: [5,5], borderWidth: 1.5, pointRadius: 0, fill: false })
  }

  // Last 6 months summary
  const last6 = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(selYear, selMonth - 1 - i, 1)
    return { month: d.getMonth() + 1, year: d.getFullYear(), label: d.toLocaleDateString('en-MY', { month: 'short', year: '2-digit' }) }
  }).reverse()
  const monthlyTrend = {
    labels: last6.map(m => m.label),
    datasets: [{
      label: 'Monthly Spend', borderRadius: 6,
      data: last6.map(m => expenses.filter(e => { const d = new Date(e.date); return d.getMonth()+1===m.month && d.getFullYear()===m.year }).reduce((s,e) => s+parseFloat(e.amount||0), 0)),
      backgroundColor: last6.map((m, i) => i === 5 ? '#C9A84C' : 'rgba(201,168,76,0.35)'),
    }],
  }

  // ── Handlers ───────────────────────────────────────────────
  async function handleAddExpense(e) {
    e.preventDefault(); setSaving(true)
    try {
      await createDailyExpense({ description: expForm.description, category: expForm.category, amount: parseFloat(expForm.amount), date: expForm.date, transaction_type: 'expense' })
      await load(); setAddExpOpen(false); addToast('Expense added!', 'success')
      setExpForm({ description: '', category: 'Food & Drinks', amount: '', date: today(), notes: '' })
    } catch(err) { addToast(err.message, 'error') }
    setSaving(false)
  }

  async function handleSetBudget(e) {
    e.preventDefault(); setSaving(true)
    try {
      await setBudget({ month: selMonth, year: selYear, budget_amount: parseFloat(budForm.amount), from_bank: budForm.from_bank, notes: budForm.notes })
      // Also record as expense in income section (withdrawal from income bank)
      await createRecord({
        type: 'income_transaction', bank: budForm.from_bank,
        transaction_type: 'expense', category: 'Daily Budget',
        description: `GXBank transfer — ${MONTHS[selMonth-1]} ${selYear} daily budget`,
        amount: parseFloat(budForm.amount), date: today(),
      })
      await load(); await reloadRecords(); setBudgetOpen(false); addToast('Budget set & recorded in income!', 'success')
      setBudForm({ amount: '', from_bank: 'cimb', notes: '' })
    } catch(err) { addToast(err.message, 'error') }
    setSaving(false)
  }

  async function handleEdit(id, updates) {
    try { await updateRecord(id, updates); await load(); addToast('Updated!', 'success') }
    catch(err) { addToast(err.message, 'error') }
  }

  async function handleDelete(id) {
    try { await deleteDailyExpense(id); await load(); addToast('Deleted.', 'success') }
    catch(err) { addToast(err.message, 'error') }
  }

  const years = [selYear - 1, selYear, selYear + 1]

  if (loading) return <div className="flex items-center justify-center py-20"><div className="spinner" /></div>

  return (
    <div className="section-enter">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#1565C0,#0D47A1)' }}>
            <Wallet size={20} color="white" />
          </div>
          <div>
            <h2 className="font-display text-[22px] text-[#2C2A25]">Daily Expenses</h2>
            <p className="text-[13px] text-[#A89E8C] mt-0.5">GXBank — Monthly Budget Tracker</p>
          </div>
        </div>
        <div className="flex gap-2.5">
          <BtnOutline onClick={() => { setBudForm({ amount: String(budgetAmt || ''), from_bank: currentBudget?.from_bank || 'cimb', notes: currentBudget?.notes || '' }); setBudgetOpen(true) }}>
            <Settings size={14} /> {currentBudget ? 'Update Budget' : 'Set Budget'}
          </BtnOutline>
          <BtnGold onClick={() => setAddExpOpen(true)}>
            <Plus size={14} /> Add Expense
          </BtnGold>
        </div>
      </div>

      {/* Month selector */}
      <div className="flex items-center gap-3 mb-5">
        <FormSelect value={selMonth} onChange={e => setSelMonth(Number(e.target.value))} label="" className="w-36">
          {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </FormSelect>
        <FormSelect value={selYear} onChange={e => setSelYear(Number(e.target.value))} label="" className="w-28">
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </FormSelect>
        <div className="text-[12px] text-[#A89E8C] ml-2">
          Showing: <strong className="text-[#2C2A25]">{MONTHS[selMonth-1]} {selYear}</strong>
        </div>
      </div>

      {/* GXBank budget card */}
      <div className="rounded-2xl p-6 mb-5 relative overflow-hidden" style={{ background: 'linear-gradient(135deg,#0D47A1 0%,#1565C0 50%,#1976D2 100%)', boxShadow: '0 8px 32px rgba(13,71,161,0.35)' }}>
        <div className="absolute top-0 right-0 w-56 h-56 rounded-full opacity-10" style={{ background: 'radial-gradient(circle,#fff,transparent)', transform: 'translate(30%,-30%)' }} />
        <div className="relative">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[11px] font-bold tracking-[2px] text-[rgba(255,255,255,0.6)] uppercase mb-1">GXBank · Daily Expenses</p>
              <p className="text-[28px] font-bold text-white font-display">{fmt(remaining)}</p>
              <p className="text-[13px] text-[rgba(255,255,255,0.6)] mt-0.5">remaining this month</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-[rgba(255,255,255,0.5)] mb-1">Monthly Budget</p>
              <p className="text-[20px] font-bold text-[#90CAF9]">{budgetAmt > 0 ? fmt(budgetAmt) : '—'}</p>
              {currentBudget && <p className="text-[11px] text-[rgba(255,255,255,0.4)] mt-0.5">from {currentBudget.from_bank === 'cimb' ? 'CIMB' : 'Public Bank'}</p>}
            </div>
          </div>

          {budgetAmt > 0 ? (
            <>
              <div className="h-3 rounded-full mb-2 overflow-hidden" style={{ background: 'rgba(255,255,255,0.15)' }}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${spentPct}%`, background: spentPct >= 90 ? 'linear-gradient(90deg,#EF5350,#F44336)' : spentPct >= 70 ? 'linear-gradient(90deg,#FFA726,#FF9800)' : 'linear-gradient(90deg,#66BB6A,#43A047)' }} />
              </div>
              <div className="flex justify-between">
                <span className="text-[12px] text-[rgba(255,255,255,0.6)]">Spent: <strong className="text-white">{fmt(totalSpent)}</strong></span>
                <span className="text-[12px]" style={{ color: spentPct >= 90 ? '#EF9A9A' : 'rgba(255,255,255,0.6)' }}>
                  {overBudget ? `⚠ Over by ${fmt(totalSpent - budgetAmt)}` : `${spentPct.toFixed(1)}% used`}
                </span>
              </div>
            </>
          ) : (
            <div className="text-center py-2">
              <p className="text-[13px] text-[rgba(255,255,255,0.5)]">No budget set for this month.</p>
              <button onClick={() => setBudgetOpen(true)} className="text-[13px] text-[#90CAF9] font-semibold underline mt-1">Set budget →</button>
            </div>
          )}

          {/* Quick stats */}
          <div className="grid grid-cols-4 gap-3 mt-5">
            {[
              { label: 'Transactions', value: monthExpenses.length },
              { label: 'Daily Avg', value: fmt(monthExpenses.length ? totalSpent / new Date().getDate() : 0) },
              { label: 'Biggest Day', value: fmt(Math.max(...(dailyData.length ? dailyData : [0]))) },
              { label: 'Days Left', value: `${new Date(selYear, selMonth, 0).getDate() - new Date().getDate()} days` },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.1)' }}>
                <p className="text-[10px] text-[rgba(255,255,255,0.5)] uppercase tracking-[1px]">{label}</p>
                <p className="text-[14px] font-bold text-white mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {monthExpenses.length === 0 && budgetAmt > 0 ? (
        <div className="bg-white rounded-2xl border border-[#EDE8DC] p-12 text-center mb-5" style={{ boxShadow: '0 2px 16px rgba(180,150,60,0.1)' }}>
          <p className="text-4xl mb-3">🎉</p>
          <h3 className="font-display text-[17px] text-[#2C2A25] mb-1">No expenses yet this month</h3>
          <p className="text-[13px] text-[#A89E8C] mb-4">Start tracking your daily spending</p>
          <BtnGold onClick={() => setAddExpOpen(true)}><Plus size={14}/> Add First Expense</BtnGold>
        </div>
      ) : monthExpenses.length > 0 && (
        <>
          {/* Charts row */}
          <div className="grid grid-cols-3 gap-4 mb-5">
            <div className="bg-white rounded-2xl border border-[#EDE8DC] p-5" style={{ boxShadow: '0 2px 16px rgba(180,150,60,0.1)' }}>
              <h4 className="font-display text-[13px] mb-3">Spending by Category</h4>
              <div className="relative h-[180px]"><Doughnut data={doughnutData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { size: 10, family: 'Lato' }, color: '#6B6355', boxWidth: 10, padding: 8 } } } }} /></div>
            </div>
            <div className="bg-white rounded-2xl border border-[#EDE8DC] p-5" style={{ boxShadow: '0 2px 16px rgba(180,150,60,0.1)' }}>
              <h4 className="font-display text-[13px] mb-3">Category Breakdown</h4>
              <div className="relative h-[180px]">
                <Bar data={barData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#A89E8C', font: { size: 9 } }, grid: { display: false } }, y: { ticks: { color: '#A89E8C', font: { size: 9 }, callback: v => 'RM' + v }, grid: { color: '#EDE8DC' } } } }} />
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-[#EDE8DC] p-5" style={{ boxShadow: '0 2px 16px rgba(180,150,60,0.1)' }}>
              <h4 className="font-display text-[13px] mb-3">6-Month Trend</h4>
              <div className="relative h-[180px]">
                <Bar data={monthlyTrend} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#A89E8C', font: { size: 9 } }, grid: { display: false } }, y: { ticks: { color: '#A89E8C', font: { size: 9 }, callback: v => 'RM'+v }, grid: { color: '#EDE8DC' } } } }} />
              </div>
            </div>
          </div>

          {/* Daily spending chart */}
          <div className="bg-white rounded-2xl border border-[#EDE8DC] p-5 mb-5" style={{ boxShadow: '0 2px 16px rgba(180,150,60,0.1)' }}>
            <h4 className="font-display text-[13px] mb-3">Daily Spending — {MONTHS[selMonth-1]} {selYear}</h4>
            <div className="relative h-[180px]">
              <Line data={lineData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { font: { size: 10, family: 'Lato' }, color: '#6B6355', boxWidth: 10 } } }, scales: { x: { ticks: { color: '#A89E8C', font: { size: 9 } }, grid: { color: '#EDE8DC' } }, y: { ticks: { color: '#A89E8C', font: { size: 9 }, callback: v => 'RM'+v }, grid: { color: '#EDE8DC' } } } }} />
            </div>
          </div>

          {/* Category cards */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {CATEGORIES.map(cat => {
              const spent = catTotals[cat] || 0
              const p = budgetAmt > 0 ? pct(spent, budgetAmt / CATEGORIES.length) : 0
              return (
                <div key={cat} className="bg-white rounded-2xl border border-[#EDE8DC] p-4" style={{ boxShadow: '0 2px 12px rgba(180,150,60,0.08)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{CAT_ICONS[cat]}</span>
                    <p className="text-[12px] font-semibold text-[#2C2A25]">{cat}</p>
                  </div>
                  <p className="font-display text-[18px] font-bold" style={{ color: CAT_COLORS[cat] }}>{fmt(spent)}</p>
                  <div className="h-1.5 bg-[#EDE8DC] rounded-full mt-2 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(p, 100)}%`, background: CAT_COLORS[cat] }} />
                  </div>
                  <p className="text-[10px] text-[#A89E8C] mt-1">{monthExpenses.filter(e => e.category === cat).length} transactions</p>
                </div>
              )
            })}
          </div>

          {/* Transactions table */}
          <div className="bg-white rounded-2xl border border-[#EDE8DC] p-5" style={{ boxShadow: '0 2px 16px rgba(180,150,60,0.1)' }}>
            <h4 className="font-display text-[13px] mb-3">Transactions — {MONTHS[selMonth-1]} {selYear}</h4>
            <div className="overflow-y-auto max-h-[400px] border border-[#EDE8DC] rounded-xl">
              <table className="w-full border-collapse text-[13px]">
                <thead className="sticky top-0 z-10"><tr>
                  {['Date','Description','Category','Amount','Actions'].map(h => (
                    <th key={h} className="bg-[#FAF3DC] text-[#9C7A2E] font-semibold text-[11px] tracking-[0.8px] uppercase px-3.5 py-2.5 text-left">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {[...monthExpenses].sort((a,b) => new Date(b.date)-new Date(a.date)).map(exp => (
                    <tr key={exp.id} className="hover:bg-[#FDFAF2]">
                      <td className="px-3.5 py-2.5 border-b border-[#EDE8DC] text-[#6B6355]">{exp.date}</td>
                      <td className="px-3.5 py-2.5 border-b border-[#EDE8DC] text-[#2C2A25] font-medium">{exp.description}</td>
                      <td className="px-3.5 py-2.5 border-b border-[#EDE8DC]">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-white" style={{ background: CAT_COLORS[exp.category] || '#999' }}>
                          {CAT_ICONS[exp.category]} {exp.category}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 border-b border-[#EDE8DC] font-bold text-[#E05C5C]">- {fmt(exp.amount)}</td>
                      <td className="px-3.5 py-2.5 border-b border-[#EDE8DC]">
                        <div className="flex gap-1.5">
                          <button onClick={() => setEditRec(exp)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-[#9C7A2E] bg-[#FAF3DC] border border-[#F0D98C] hover:bg-[#F0D98C] transition-colors">
                            <Pencil size={11}/> Edit
                          </button>
                          <BtnDanger onClick={() => handleDelete(exp.id)} className="py-1 px-2.5 text-[11px]">Del</BtnDanger>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} className="px-3.5 py-2.5 text-[12px] font-bold text-[#6B6355] bg-[#FAF3DC]">Total Spent</td>
                    <td colSpan={2} className="px-3.5 py-2.5 text-[13px] font-bold text-[#E05C5C] bg-[#FAF3DC]">- {fmt(totalSpent)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Set Budget Modal */}
      <Modal open={budgetOpen} onClose={() => setBudgetOpen(false)} title={`Set Monthly Budget — ${MONTHS[selMonth-1]} ${selYear}`}>
        <form onSubmit={handleSetBudget} className="flex flex-col gap-3.5">
          <div className="bg-[#E3F2FD] rounded-xl p-4 border border-[#90CAF9]">
            <div className="flex items-center gap-2 mb-1">
              <Wallet size={16} color="#1565C0" />
              <p className="text-[13px] font-bold text-[#1565C0]">GXBank Daily Budget</p>
            </div>
            <p className="text-[12px] text-[#1976D2]">This amount will be transferred from your income bank to GXBank and recorded as an expense in your income section — keeping your income account clean.</p>
          </div>
          <FormInput label={`Budget Amount for ${MONTHS[selMonth-1]} (RM)`} type="number" step="0.01" min="1" value={budForm.amount} onChange={e => setB('amount', e.target.value)} placeholder="e.g. 500.00" required />
          <FormSelect label="Transfer From" value={budForm.from_bank} onChange={e => setB('from_bank', e.target.value)}>
            <option value="cimb">CIMB Bank</option>
            <option value="public">Public Bank</option>
          </FormSelect>
          <FormTextarea label="Notes (optional)" value={budForm.notes} onChange={e => setB('notes', e.target.value)} placeholder="e.g. Monthly allowance for daily use" rows={2} />
          <BtnGold type="submit" disabled={saving} className="justify-center mt-1">
            <ArrowDownLeft size={14}/> {saving ? 'Saving…' : 'Set Budget & Transfer'}
          </BtnGold>
        </form>
      </Modal>

      {/* Add Expense Modal */}
      <Modal open={addExpOpen} onClose={() => setAddExpOpen(false)} title="Add Daily Expense">
        <form onSubmit={handleAddExpense} className="flex flex-col gap-3.5">
          {budgetAmt > 0 && (
            <div className="bg-[#E3F2FD] rounded-xl px-4 py-3 border border-[#90CAF9]">
              <p className="text-xs text-[#1976D2]">GXBank Balance</p>
              <p className="text-[18px] font-bold text-[#1565C0] font-display">{fmt(remaining)}</p>
              <p className="text-xs text-[#90CAF9]">{fmt(totalSpent)} spent of {fmt(budgetAmt)}</p>
            </div>
          )}
          <FormInput label="Description" value={expForm.description} onChange={e => setE('description', e.target.value)} placeholder="e.g. Lunch at mamak, Grab to office" required />
          <FormSelect label="Category" value={expForm.category} onChange={e => setE('category', e.target.value)}>
            {CATEGORIES.map(c => <option key={c} value={c}>{CAT_ICONS[c]} {c}</option>)}
          </FormSelect>
          <FormInput label="Amount (RM)" type="number" step="0.01" min="0.01" value={expForm.amount} onChange={e => setE('amount', e.target.value)} placeholder="0.00" required />
          <FormInput label="Date" type="date" value={expForm.date} onChange={e => setE('date', e.target.value)} required />
          <BtnGold type="submit" disabled={saving} className="justify-center mt-1">{saving ? 'Saving…' : 'Add Expense'}</BtnGold>
        </form>
      </Modal>

      {/* Edit Modal */}
      <EditTransactionModal open={!!editRec} onClose={() => setEditRec(null)} record={editRec} onSave={handleEdit} />
    </div>
  )
}
