import { useContext, useState, useEffect } from 'react'
import { Plus, Wallet, TrendingDown, Pencil, Trash2 } from 'lucide-react'
import { Doughnut, Bar, Line } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, BarElement, LineElement, PointElement, CategoryScale, LinearScale, Filler, Tooltip, Legend } from 'chart.js'
import { RecordsContext, ToastContext } from '../../pages/Dashboard'
import { createRecord, deleteRecord, updateRecord } from '../../lib/db'
import { fmt, today } from '../../lib/utils'
import Modal from '../ui/Modal'
import { BtnGold, BtnOutline, BtnDanger } from '../ui/Button'
import { FormInput, FormSelect, FormTextarea } from '../ui/FormField'
import EditTransactionModal from '../ui/EditTransactionModal'

ChartJS.register(ArcElement, BarElement, LineElement, PointElement, CategoryScale, LinearScale, Filler, Tooltip, Legend)

const DAILY_CATS = [
  { label: 'Food & Drinks',  icon: '🍔', color: '#FF8A65' },
  { label: 'Transport',      icon: '🚌', color: '#42A5F5' },
  { label: 'Groceries',      icon: '🛒', color: '#66BB6A' },
  { label: 'Personal Care',  icon: '💆', color: '#AB47BC' },
  { label: 'Entertainment',  icon: '🎬', color: '#EC407A' },
  { label: 'Miscellaneous',  icon: '📦', color: '#BDBDBD' },
]
const catColor = (cat) => DAILY_CATS.find(c => c.label === cat)?.color || '#BDBDBD'
const catIcon  = (cat) => DAILY_CATS.find(c => c.label === cat)?.icon || '📦'

const chartOpts = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { labels: { font: { family: 'Lato', size: 11 }, color: '#6B6355', boxWidth: 12 } } },
}
const barOpts = {
  ...chartOpts,
  scales: {
    x: { ticks: { color: '#A89E8C', font: { size: 10 } }, grid: { color: '#EDE8DC' } },
    y: { ticks: { color: '#A89E8C', font: { size: 10 }, callback: v => 'RM' + v.toLocaleString() }, grid: { color: '#EDE8DC' } },
  },
}

function getMonthRange(year, month) {
  const start = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const end   = new Date(year, month + 1, 0).toISOString().split('T')[0]
  return { start, end }
}

export default function DailyExpenses() {
  const { records, reload } = useContext(RecordsContext)
  const addToast            = useContext(ToastContext)

  const now = new Date()
  const [viewYear,  setViewYear]  = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [addOpen,   setAddOpen]   = useState(false)
  const [budgetOpen,setBudgetOpen]= useState(false)
  const [editRecord,setEditRecord]= useState(null)
  const [saving,    setSaving]    = useState(false)

  const [form, setForm] = useState({
    description: '', amount: '', date: today(),
    daily_category: 'Food & Drinks', notes: '',
  })
  const [budgetForm, setBudgetForm] = useState({ amount: '', source_bank: 'cimb', month: '' })
  const set  = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setB = (k, v) => setBudgetForm(f => ({ ...f, [k]: v }))

  // ── Data helpers ─────────────────────────────────────────────
  // All daily expenses
  const allExpenses = records.filter(r => r.type === 'daily_expense')

  // Current month expenses
  const { start, end } = getMonthRange(viewYear, viewMonth)
  const monthExpenses = allExpenses.filter(r => r.date >= start && r.date <= end)

  // Monthly budget record for selected month
  const budgetKey = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`
  const budgetRecord = records.find(r => r.type === 'daily_budget' && r.date?.startsWith(budgetKey))
  const monthBudget = budgetRecord ? parseFloat(budgetRecord.amount) : 0

  // Totals
  const totalSpent   = monthExpenses.reduce((s, r) => s + parseFloat(r.amount || 0), 0)
  const remaining    = monthBudget - totalSpent
  const pct          = monthBudget > 0 ? Math.min((totalSpent / monthBudget) * 100, 100) : 0
  const dailyAvg     = monthExpenses.length > 0 ? (totalSpent / new Date(viewYear, viewMonth + 1, 0).getDate()) : 0

  // Category sums
  const catSums = {}
  monthExpenses.forEach(r => {
    const cat = r.daily_category || r.category || 'Miscellaneous'
    catSums[cat] = (catSums[cat] || 0) + parseFloat(r.amount || 0)
  })

  // Daily spending line (each day of month)
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const dailyTotals = Array.from({ length: daysInMonth }, (_, i) => {
    const d = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`
    return monthExpenses.filter(r => r.date === d).reduce((s, r) => s + parseFloat(r.amount || 0), 0)
  })
  // Running total
  let running = 0
  const runningTotals = dailyTotals.map(v => { running += v; return running })

  const lineData = {
    labels: Array.from({ length: daysInMonth }, (_, i) => i + 1),
    datasets: [
      { label: 'Daily Spending', data: dailyTotals, borderColor: '#C9A84C', backgroundColor: 'rgba(201,168,76,0.10)', fill: true, tension: 0.3, pointRadius: 2 },
      { label: 'Cumulative',     data: runningTotals, borderColor: '#E05C5C', backgroundColor: 'transparent', tension: 0.3, pointRadius: 0, borderDash: [4, 3] },
    ],
  }
  if (monthBudget > 0) {
    lineData.datasets.push({ label: 'Budget', data: Array(daysInMonth).fill(monthBudget), borderColor: '#3BAF7E', borderDash: [6, 4], borderWidth: 1.5, pointRadius: 0, backgroundColor: 'transparent' })
  }

  const doughnutData = {
    labels: Object.keys(catSums).length ? Object.keys(catSums) : ['No spending'],
    datasets: [{ data: Object.keys(catSums).length ? Object.values(catSums) : [1], backgroundColor: Object.keys(catSums).length ? Object.keys(catSums).map(catColor) : ['#EDE8DC'], borderWidth: 0 }],
  }

  // Last 6 months bar
  const last6 = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
    const s = d.toISOString().split('T')[0].slice(0, 7)
    const total = allExpenses.filter(r => r.date?.startsWith(s)).reduce((sum, r) => sum + parseFloat(r.amount || 0), 0)
    return { label: d.toLocaleDateString('en-MY', { month: 'short' }), total }
  })
  const barData = {
    labels: last6.map(m => m.label),
    datasets: [{ label: 'Monthly Spending', data: last6.map(m => m.total), backgroundColor: 'rgba(201,168,76,0.8)', borderRadius: 6 }],
  }

  // ── Handlers ─────────────────────────────────────────────────
  async function handleAddExpense(e) {
    e.preventDefault(); setSaving(true)
    try {
      await createRecord({
        type: 'daily_expense',
        description: form.description,
        amount: parseFloat(form.amount),
        date: form.date,
        daily_category: form.daily_category,
        category: form.daily_category,
        bank: 'daily',
        transaction_type: 'expense',
      })
      await reload(); setAddOpen(false); addToast('Expense added!', 'success')
      setForm({ description: '', amount: '', date: today(), daily_category: 'Food & Drinks', notes: '' })
    } catch(err) { addToast(err.message, 'error') }
    setSaving(false)
  }

  async function handleSetBudget(e) {
    e.preventDefault(); setSaving(true)
    try {
      const monthDate = `${budgetForm.month || budgetKey}-01`
      // Remove old budget for this month if exists
      if (budgetRecord) await deleteRecord(budgetRecord.id)
      // Create income withdrawal in source bank
      await createRecord({
        type: 'income_transaction',
        bank: budgetForm.source_bank,
        transaction_type: 'expense',
        description: `Monthly Daily Expenses Budget — ${new Date(viewYear, viewMonth).toLocaleDateString('en-MY', { month: 'long', year: 'numeric' })}`,
        category: 'Daily Budget',
        amount: parseFloat(budgetForm.amount),
        date: monthDate,
        savings_target: '',
      })
      // Create daily budget record
      await createRecord({
        type: 'daily_budget',
        description: 'Monthly Daily Expenses Budget',
        amount: parseFloat(budgetForm.amount),
        date: monthDate,
        bank: budgetForm.source_bank,
        category: 'budget',
        transaction_type: 'budget',
      })
      await reload(); setBudgetOpen(false); addToast('Budget set! Withdrawal recorded in your income bank.', 'success')
    } catch(err) { addToast(err.message, 'error') }
    setSaving(false)
  }

  async function handleDelete(id) {
    try { await deleteRecord(id); await reload(); addToast('Deleted.', 'success') }
    catch(err) { addToast(err.message, 'error') }
  }

  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString('en-MY', { month: 'long', year: 'numeric' })

  return (
    <div className="section-enter">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-display text-[22px] text-[#2C2A25]">Daily Expenses</h2>
          <p className="text-[13px] text-[#A89E8C] mt-0.5">Monthly cash budget tracker</p>
        </div>
        <div className="flex gap-2.5">
          <BtnOutline onClick={() => { setBudgetForm({ amount: monthBudget || '', source_bank: budgetRecord?.bank || 'cimb', month: budgetKey }); setBudgetOpen(true) }}>
            <Wallet size={14} /> Set Budget
          </BtnOutline>
          <BtnGold onClick={() => setAddOpen(true)}>
            <Plus size={14} /> Add Expense
          </BtnGold>
        </div>
      </div>

      {/* Month navigator */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => { const d = new Date(viewYear, viewMonth - 1); setViewYear(d.getFullYear()); setViewMonth(d.getMonth()) }}
          className="p-1.5 border border-[#F0D98C] rounded-lg hover:bg-[#FAF3DC] transition-colors text-[#9C7A2E]">◀</button>
        <span className="font-display text-[16px] font-semibold text-[#2C2A25] min-w-[160px] text-center">{monthLabel}</span>
        <button onClick={() => { const d = new Date(viewYear, viewMonth + 1); setViewYear(d.getFullYear()); setViewMonth(d.getMonth()) }}
          className="p-1.5 border border-[#F0D98C] rounded-lg hover:bg-[#FAF3DC] transition-colors text-[#9C7A2E]">▶</button>
      </div>

      {/* Budget status */}
      {monthBudget > 0 ? (
        <div className="bg-white rounded-2xl border border-[#EDE8DC] p-5 mb-5" style={{ boxShadow: '0 2px 16px rgba(180,150,60,0.1)' }}>
          <div className="flex justify-between items-center mb-3">
            <div>
              <p className="text-[13px] font-semibold text-[#2C2A25]">Monthly Budget: <span style={{ color: '#9C7A2E' }}>{fmt(monthBudget)}</span></p>
              <p className="text-[11px] text-[#A89E8C] mt-0.5">Withdrawn from {budgetRecord?.bank === 'cimb' ? 'CIMB' : 'Public Bank'}</p>
            </div>
            <div className="text-right">
              <p className="text-[22px] font-display font-bold" style={{ color: remaining >= 0 ? '#3BAF7E' : '#E05C5C' }}>{fmt(remaining)}</p>
              <p className="text-[11px] text-[#A89E8C]">{remaining >= 0 ? 'remaining' : 'over budget'}</p>
            </div>
          </div>
          <div className="h-3 bg-[#EDE8DC] rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, background: pct > 90 ? 'linear-gradient(90deg,#FFAB9A,#E05C5C)' : pct > 70 ? 'linear-gradient(90deg,#FFD54F,#E08030)' : 'linear-gradient(90deg,#F0D98C,#C9A84C)' }} />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[11px] text-[#A89E8C]">Spent: {fmt(totalSpent)} ({pct.toFixed(1)}%)</span>
            <span className="text-[11px] text-[#A89E8C]">Daily avg: {fmt(dailyAvg)}/day</span>
          </div>
        </div>
      ) : (
        <div className="bg-[#FAF3DC] rounded-2xl border border-[#F0D98C] p-5 mb-5 text-center">
          <p className="text-[14px] text-[#9C7A2E] font-semibold mb-1">No budget set for {monthLabel}</p>
          <p className="text-[12px] text-[#A89E8C] mb-3">Set a monthly budget to track your daily spending against it. The amount will be recorded as a withdrawal from your income bank.</p>
          <BtnGold onClick={() => { setBudgetForm({ amount: '', source_bank: 'cimb', month: budgetKey }); setBudgetOpen(true) }}>
            <Wallet size={14} /> Set Monthly Budget
          </BtnGold>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        {[
          { label: 'Total Spent',    value: fmt(totalSpent),    color: '#E05C5C' },
          { label: 'Remaining',      value: fmt(Math.max(0, remaining)), color: '#3BAF7E' },
          { label: 'Transactions',   value: monthExpenses.length, color: '#2C2A25' },
          { label: 'Daily Average',  value: fmt(dailyAvg),      color: '#9C7A2E' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-[#EDE8DC] px-5 py-4" style={{ boxShadow: '0 2px 12px rgba(180,150,60,0.1)' }}>
            <p className="text-[12px] text-[#A89E8C]">{label}</p>
            <p className="font-display text-[20px] font-bold mt-1" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="col-span-2 bg-white rounded-2xl border border-[#EDE8DC] p-5" style={{ boxShadow: '0 2px 16px rgba(180,150,60,0.1)' }}>
          <h4 className="font-display text-[13px] mb-3">Daily Spending — {monthLabel}</h4>
          <div className="relative h-[200px]">
            <Line data={lineData} options={{ ...barOpts, scales: { ...barOpts.scales, x: { ...barOpts.scales.x, ticks: { ...barOpts.scales.x.ticks, maxTicksLimit: 10 } } } }} />
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-[#EDE8DC] p-5" style={{ boxShadow: '0 2px 16px rgba(180,150,60,0.1)' }}>
          <h4 className="font-display text-[13px] mb-3">By Category</h4>
          <div className="relative h-[200px]"><Doughnut data={doughnutData} options={chartOpts} /></div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-5">
        {/* 6-month bar */}
        <div className="bg-white rounded-2xl border border-[#EDE8DC] p-5" style={{ boxShadow: '0 2px 16px rgba(180,150,60,0.1)' }}>
          <h4 className="font-display text-[13px] mb-3">Monthly Spending (Last 6 Months)</h4>
          <div className="relative h-[180px]"><Bar data={barData} options={barOpts} /></div>
        </div>
        {/* Category breakdown list */}
        <div className="bg-white rounded-2xl border border-[#EDE8DC] p-5" style={{ boxShadow: '0 2px 16px rgba(180,150,60,0.1)' }}>
          <h4 className="font-display text-[13px] mb-3">Category Breakdown</h4>
          {Object.keys(catSums).length === 0 ? (
            <p className="text-[13px] text-[#A89E8C] text-center py-8">No expenses this month</p>
          ) : (
            <div className="flex flex-col gap-2">
              {Object.entries(catSums).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => {
                const catPct = totalSpent > 0 ? ((amt / totalSpent) * 100).toFixed(1) : 0
                return (
                  <div key={cat} className="flex items-center gap-2.5">
                    <span className="text-base">{catIcon(cat)}</span>
                    <div className="flex-1">
                      <div className="flex justify-between mb-0.5">
                        <span className="text-[12px] text-[#2C2A25] font-medium">{cat}</span>
                        <span className="text-[12px] font-bold" style={{ color: catColor(cat) }}>{fmt(amt)}</span>
                      </div>
                      <div className="h-1.5 bg-[#EDE8DC] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${catPct}%`, background: catColor(cat) }} />
                      </div>
                    </div>
                    <span className="text-[11px] text-[#A89E8C] w-8 text-right">{catPct}%</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Transactions table */}
      <div className="bg-white rounded-2xl border border-[#EDE8DC] p-5" style={{ boxShadow: '0 2px 16px rgba(180,150,60,0.1)' }}>
        <h4 className="font-display text-[14px] mb-4">Transactions — {monthLabel}</h4>
        <div className="overflow-y-auto max-h-[400px] border border-[#EDE8DC] rounded-xl">
          <table className="w-full border-collapse text-[13px]">
            <thead className="sticky top-0 z-10">
              <tr>{['Date','Description','Category','Amount','Actions'].map(h => (
                <th key={h} className="bg-[#FAF3DC] text-[#9C7A2E] font-semibold text-[11px] tracking-[0.8px] uppercase px-3.5 py-2.5 text-left">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {[...monthExpenses].sort((a, b) => new Date(b.date) - new Date(a.date)).map(r => (
                <tr key={r.id} className="hover:bg-[#FDFAF2]">
                  <td className="px-3.5 py-2.5 border-b border-[#EDE8DC] text-[#6B6355]">{r.date}</td>
                  <td className="px-3.5 py-2.5 border-b border-[#EDE8DC] text-[#6B6355]">{r.description}</td>
                  <td className="px-3.5 py-2.5 border-b border-[#EDE8DC]">
                    <span className="flex items-center gap-1 text-[12px]">
                      <span>{catIcon(r.daily_category || r.category)}</span>
                      <span style={{ color: catColor(r.daily_category || r.category) }}>{r.daily_category || r.category}</span>
                    </span>
                  </td>
                  <td className="px-3.5 py-2.5 border-b border-[#EDE8DC] font-semibold text-[#E05C5C]">- {fmt(r.amount)}</td>
                  <td className="px-3.5 py-2.5 border-b border-[#EDE8DC]">
                    <div className="flex gap-1.5">
                      <button onClick={() => setEditRecord(r)}
                        className="p-1.5 border border-[#F0D98C] rounded-lg hover:bg-[#FAF3DC] transition-colors text-[#9C7A2E]">
                        <Pencil size={12} />
                      </button>
                      <button onClick={() => handleDelete(r.id)}
                        className="p-1.5 border border-[#FFCDD2] rounded-lg hover:bg-[#FFF0F0] transition-colors text-[#E05C5C]">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {monthExpenses.length === 0 && (
                <tr><td colSpan={5} className="text-center text-[#A89E8C] py-8">No expenses for {monthLabel}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Daily Expense">
        <form onSubmit={handleAddExpense} className="flex flex-col gap-3.5">
          <FormInput label="Description" value={form.description} onChange={e => set('description', e.target.value)} placeholder="e.g. Nasi lemak, Grab" required />
          <FormSelect label="Category" value={form.daily_category} onChange={e => set('daily_category', e.target.value)}>
            {DAILY_CATS.map(c => <option key={c.label}>{c.icon} {c.label}</option>)}
          </FormSelect>
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Amount (RM)" type="number" step="0.01" min="0.01" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0.00" required />
            <FormInput label="Date" type="date" value={form.date} onChange={e => set('date', e.target.value)} required />
          </div>
          <BtnGold type="submit" disabled={saving} className="justify-center mt-1">{saving ? 'Saving…' : 'Add Expense'}</BtnGold>
        </form>
      </Modal>

      {/* Set Budget Modal */}
      <Modal open={budgetOpen} onClose={() => setBudgetOpen(false)} title="Set Monthly Budget">
        <form onSubmit={handleSetBudget} className="flex flex-col gap-3.5">
          <div className="bg-[#FAF3DC] rounded-xl p-4 border border-[#F0D98C]">
            <p className="text-[13px] font-semibold text-[#9C7A2E] mb-1">How this works</p>
            <p className="text-[12px] text-[#6B6355]">
              The budget amount will be recorded as an <strong>expense withdrawal</strong> from your selected income bank.
              This keeps your income bank balance accurate — the money is "moved" to your daily use account.
            </p>
          </div>
          <FormInput label="Monthly Budget Amount (RM)" type="number" step="0.01" min="0.01" value={budgetForm.amount} onChange={e => setB('amount', e.target.value)} placeholder="e.g. 1500.00" required />
          <FormSelect label="Withdraw from which bank?" value={budgetForm.source_bank} onChange={e => setB('source_bank', e.target.value)}>
            <option value="cimb">CIMB Bank</option>
            <option value="public">Public Bank</option>
          </FormSelect>
          <FormInput label="For Month" type="month" value={budgetForm.month || budgetKey} onChange={e => setB('month', e.target.value)} required />
          <div className="bg-white rounded-xl p-3 border border-[#EDE8DC] text-center">
            <p className="text-[12px] text-[#A89E8C]">This will also appear as an expense in your</p>
            <p className="text-[13px] font-bold text-[#2C2A25]">{budgetForm.source_bank === 'cimb' ? 'CIMB' : 'Public Bank'} income statement</p>
          </div>
          <BtnGold type="submit" disabled={saving} className="justify-center mt-1">{saving ? 'Saving…' : 'Set Budget & Record Withdrawal'}</BtnGold>
        </form>
      </Modal>

      {/* Edit Modal */}
      <EditTransactionModal
        record={editRecord}
        open={!!editRecord}
        onClose={() => setEditRecord(null)}
        onSaved={async () => { setEditRecord(null); await reload() }}
        addToast={addToast}
      />
    </div>
  )
}
