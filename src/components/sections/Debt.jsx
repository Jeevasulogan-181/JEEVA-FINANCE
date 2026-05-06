import { useState, useEffect, useContext } from 'react'
import { Plus, Trash2, CreditCard, Landmark, Gem, ChevronDown, ChevronUp } from 'lucide-react'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, BarElement, LineElement, PointElement, CategoryScale, LinearScale, Filler, Tooltip, Legend } from 'chart.js'
import { ToastContext } from '../../pages/Dashboard'
import { fetchDebts, createDebt, deleteDebt, fetchDebtPayments, addDebtPayment, deleteDebtPayment, updateDebt } from '../../lib/debtGoalDb'
import { fmt } from '../../lib/utils'
import Modal from '../ui/Modal'
import { BtnGold, BtnOutline, BtnDanger } from '../ui/Button'
import { FormInput, FormSelect, FormTextarea } from '../ui/FormField'

ChartJS.register(ArcElement, BarElement, LineElement, PointElement, CategoryScale, LinearScale, Filler, Tooltip, Legend)

const DEBT_TYPES = [
  { value: 'credit_card', label: 'Credit Card',   icon: '💳', color: '#E05C5C' },
  { value: 'gold',        label: 'Gold Loan',      icon: '🥇', color: '#C9A84C' },
  { value: 'compassia',   label: 'Compassia',      icon: '🏢', color: '#42A5F5' },
  { value: 'personal',    label: 'Personal Loan',  icon: '👤', color: '#AB47BC' },
  { value: 'car',         label: 'Car Loan',        icon: '🚗', color: '#26A69A' },
  { value: 'home',        label: 'Home Loan',       icon: '🏠', color: '#66BB6A' },
  { value: 'other',       label: 'Other',           icon: '📋', color: '#BDBDBD' },
]

const typeInfo = (type) => DEBT_TYPES.find(t => t.value === type) || DEBT_TYPES[6]

const chartOpts = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { labels: { font: { family: 'Lato', size: 11 }, color: '#6B6355', boxWidth: 12 } } },
}
const barOpts = { ...chartOpts, scales: { x: { ticks: { color: '#A89E8C', font: { size: 10 } }, grid: { color: '#EDE8DC' } }, y: { ticks: { color: '#A89E8C', font: { size: 10 }, callback: v => 'RM' + v.toLocaleString() }, grid: { color: '#EDE8DC' } } } }

function today() { return new Date().toISOString().split('T')[0] }

function monthsLeft(remaining, monthly) {
  if (!monthly || monthly <= 0) return '—'
  const m = Math.ceil(remaining / monthly)
  if (m > 120) return '10+ years'
  if (m >= 12) return `${Math.floor(m / 12)}y ${m % 12}m`
  return `${m} months`
}

function payoffDate(remaining, monthly) {
  if (!monthly || monthly <= 0) return '—'
  const months = Math.ceil(remaining / monthly)
  const d = new Date()
  d.setMonth(d.getMonth() + months)
  return d.toLocaleDateString('en-MY', { month: 'short', year: 'numeric' })
}

// ── Debt Card ────────────────────────────────────────────────
function DebtCard({ debt, payments, onDelete, onPay, onPayDelete }) {
  const [expanded, setExpanded] = useState(false)
  const info = typeInfo(debt.debt_type)
  const pct  = debt.total_amount > 0 ? Math.min(((debt.total_amount - debt.remaining) / debt.total_amount) * 100, 100) : 0
  const debtPayments = payments.filter(p => p.debt_id === debt.id).sort((a, b) => new Date(b.date) - new Date(a.date))

  return (
    <div className="bg-white rounded-2xl border border-[#EDE8DC] overflow-hidden" style={{ boxShadow: '0 2px 16px rgba(180,150,60,0.10)' }}>
      {/* Top colour bar */}
      <div className="h-1.5 w-full" style={{ background: info.color }} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: info.color + '20' }}>
              {info.icon}
            </div>
            <div>
              <h3 className="font-display text-[15px] font-bold text-[#2C2A25]">{debt.name}</h3>
              <p className="text-[11px] text-[#A89E8C]">{info.label}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <BtnGold onClick={() => onPay(debt)} className="py-1.5 px-3 text-xs">Pay</BtnGold>
            <BtnDanger onClick={() => onDelete(debt.id)}><Trash2 size={13} /></BtnDanger>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-[#FAFAF8] rounded-xl p-3 text-center border border-[#EDE8DC]">
            <p className="text-[10px] text-[#A89E8C] mb-0.5">Remaining</p>
            <p className="text-[13px] font-bold text-[#E05C5C]">{fmt(debt.remaining)}</p>
          </div>
          <div className="bg-[#FAFAF8] rounded-xl p-3 text-center border border-[#EDE8DC]">
            <p className="text-[10px] text-[#A89E8C] mb-0.5">Monthly</p>
            <p className="text-[13px] font-bold text-[#2C2A25]">{fmt(debt.monthly_payment)}</p>
          </div>
          <div className="bg-[#FAFAF8] rounded-xl p-3 text-center border border-[#EDE8DC]">
            <p className="text-[10px] text-[#A89E8C] mb-0.5">Payoff</p>
            <p className="text-[11px] font-bold text-[#9C7A2E]">{payoffDate(debt.remaining, debt.monthly_payment)}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-2">
          <div className="flex justify-between mb-1">
            <span className="text-[11px] text-[#A89E8C]">Paid: {fmt(debt.total_amount - debt.remaining)} of {fmt(debt.total_amount)}</span>
            <span className="text-[11px] font-bold" style={{ color: info.color }}>{pct.toFixed(1)}% paid</span>
          </div>
          <div className="h-2.5 bg-[#EDE8DC] rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: info.color }} />
          </div>
          <p className="text-[10px] text-[#A89E8C] mt-1">{monthsLeft(debt.remaining, debt.monthly_payment)} remaining</p>
        </div>

        {/* Interest rate & due day */}
        {(debt.interest_rate > 0 || debt.due_day) && (
          <div className="flex gap-3 mt-3">
            {debt.interest_rate > 0 && (
              <span className="text-[11px] bg-[#FAF3DC] text-[#9C7A2E] px-2.5 py-1 rounded-full border border-[#F0D98C]">
                {debt.interest_rate}% p.a.
              </span>
            )}
            {debt.due_day && (
              <span className="text-[11px] bg-[#FAFAF8] text-[#6B6355] px-2.5 py-1 rounded-full border border-[#EDE8DC]">
                Due: {debt.due_day}th
              </span>
            )}
          </div>
        )}

        {/* Expand payment history */}
        {debtPayments.length > 0 && (
          <button onClick={() => setExpanded(e => !e)}
            className="w-full mt-3 flex items-center justify-center gap-1 text-[11px] text-[#A89E8C] hover:text-[#9C7A2E] transition-colors">
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {expanded ? 'Hide' : 'Show'} payment history ({debtPayments.length})
          </button>
        )}

        {expanded && (
          <div className="mt-3 border-t border-[#EDE8DC] pt-3">
            {debtPayments.slice(0, 6).map(p => (
              <div key={p.id} className="flex items-center justify-between py-1.5">
                <div>
                  <p className="text-[12px] text-[#2C2A25] font-medium">{fmt(p.amount)}</p>
                  <p className="text-[10px] text-[#A89E8C]">{p.date}</p>
                </div>
                <BtnDanger onClick={() => onPayDelete(p.id, debt.id)} className="py-1 px-2 text-[10px]">
                  <Trash2 size={11} />
                </BtnDanger>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Debt Section ─────────────────────────────────────────
export default function Debt() {
  const addToast = useContext(ToastContext)
  const [debts,    setDebts]    = useState([])
  const [payments, setPayments] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [addOpen,  setAddOpen]  = useState(false)
  const [payOpen,  setPayOpen]  = useState(false)
  const [payDebt,  setPayDebt]  = useState(null)
  const [saving,   setSaving]   = useState(false)

  const [form, setForm] = useState({
    name: '', debt_type: 'credit_card', total_amount: '', remaining: '',
    monthly_payment: '', interest_rate: '', due_day: '1',
    start_date: today(), end_date: '', notes: '', color: '#C9A84C',
  })
  const [payForm, setPayForm] = useState({ amount: '', date: today(), notes: '' })
  const set  = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setP = (k, v) => setPayForm(f => ({ ...f, [k]: v }))

  async function load() {
    try {
      const [d, p] = await Promise.all([fetchDebts(), fetchDebtPayments()])
      setDebts(d); setPayments(p)
    } catch(e) { addToast(e.message, 'error') }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function handleAddDebt(e) {
    e.preventDefault(); setSaving(true)
    try {
      const info = typeInfo(form.debt_type)
      await createDebt({
        name: form.name, debt_type: form.debt_type,
        total_amount: parseFloat(form.total_amount),
        remaining: parseFloat(form.remaining || form.total_amount),
        monthly_payment: parseFloat(form.monthly_payment),
        interest_rate: parseFloat(form.interest_rate || 0),
        due_day: parseInt(form.due_day || 1),
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        notes: form.notes, color: info.color,
      })
      await load(); setAddOpen(false); addToast('Debt added!', 'success')
      setForm({ name:'', debt_type:'credit_card', total_amount:'', remaining:'', monthly_payment:'', interest_rate:'', due_day:'1', start_date:today(), end_date:'', notes:'', color:'#C9A84C' })
    } catch(e) { addToast(e.message, 'error') }
    setSaving(false)
  }

  async function handlePay(e) {
    e.preventDefault(); setSaving(true)
    try {
      const amt = parseFloat(payForm.amount)
      await addDebtPayment({ debt_id: payDebt.id, amount: amt, date: payForm.date, notes: payForm.notes })
      // Update remaining balance
      const newRemaining = Math.max(0, payDebt.remaining - amt)
      await updateDebt(payDebt.id, { remaining: newRemaining })
      await load(); setPayOpen(false); addToast('Payment recorded!', 'success')
      setPayForm({ amount: '', date: today(), notes: '' })
    } catch(e) { addToast(e.message, 'error') }
    setSaving(false)
  }

  async function handleDeleteDebt(id) {
    try { await deleteDebt(id); await load(); addToast('Debt removed.', 'success') }
    catch(e) { addToast(e.message, 'error') }
  }

  async function handleDeletePayment(payId, debtId) {
    try {
      const pay = payments.find(p => p.id === payId)
      await deleteDebtPayment(payId)
      const debt = debts.find(d => d.id === debtId)
      if (debt && pay) await updateDebt(debtId, { remaining: debt.remaining + parseFloat(pay.amount) })
      await load(); addToast('Payment removed.', 'success')
    } catch(e) { addToast(e.message, 'error') }
  }

  // ── Computed stats ──────────────────────────────────────────
  const totalDebt     = debts.reduce((s, d) => s + parseFloat(d.remaining || 0), 0)
  const totalOriginal = debts.reduce((s, d) => s + parseFloat(d.total_amount || 0), 0)
  const totalMonthly  = debts.reduce((s, d) => s + parseFloat(d.monthly_payment || 0), 0)
  const totalPaid     = totalOriginal - totalDebt

  // Doughnut — debt breakdown by type
  const doughnutData = {
    labels: debts.map(d => d.name),
    datasets: [{ data: debts.map(d => parseFloat(d.remaining)), backgroundColor: debts.map(d => typeInfo(d.debt_type).color), borderWidth: 0 }],
  }

  // Bar — monthly payment by debt
  const barData = {
    labels: debts.map(d => d.name),
    datasets: [{ label: 'Monthly Payment', data: debts.map(d => parseFloat(d.monthly_payment)), backgroundColor: debts.map(d => typeInfo(d.debt_type).color), borderRadius: 6 }],
  }

  // Line — projected payoff (next 12 months)
  const months = Array.from({ length: 13 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() + i)
    return d.toLocaleDateString('en-MY', { month: 'short', year: '2-digit' })
  })
  const projected = Array.from({ length: 13 }, (_, i) => Math.max(0, totalDebt - (totalMonthly * i)))
  const lineData = {
    labels: months,
    datasets: [{ label: 'Projected Debt', data: projected, borderColor: '#E05C5C', backgroundColor: 'rgba(224,92,92,0.10)', fill: true, tension: 0.4, pointRadius: 3 }],
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="spinner" /></div>

  return (
    <div className="section-enter">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-display text-[22px] text-[#2C2A25]">Debt Tracker</h2>
          <p className="text-[13px] text-[#A89E8C] mt-0.5">Track and manage all your debts</p>
        </div>
        <BtnGold onClick={() => setAddOpen(true)}><Plus size={14} /> Add Debt</BtnGold>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        {[
          { label: 'Total Debt',        value: fmt(totalDebt),     color: '#E05C5C' },
          { label: 'Total Monthly',     value: fmt(totalMonthly),  color: '#2C2A25' },
          { label: 'Total Paid',        value: fmt(totalPaid),     color: '#3BAF7E' },
          { label: 'No. of Debts',      value: debts.length,       color: '#9C7A2E' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-[#EDE8DC] px-5 py-4" style={{ boxShadow: '0 2px 12px rgba(180,150,60,0.1)' }}>
            <p className="text-[12px] text-[#A89E8C]">{label}</p>
            <p className="font-display text-[22px] font-bold mt-1" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {debts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#EDE8DC] p-16 text-center" style={{ boxShadow: '0 2px 16px rgba(180,150,60,0.1)' }}>
          <p className="text-4xl mb-3">🎉</p>
          <h3 className="font-display text-[18px] text-[#2C2A25] mb-2">No debts tracked yet</h3>
          <p className="text-[13px] text-[#A89E8C] mb-5">Add your debts to track payments and progress</p>
          <BtnGold onClick={() => setAddOpen(true)}><Plus size={14} /> Add First Debt</BtnGold>
        </div>
      ) : (
        <>
          {/* Charts */}
          <div className="grid grid-cols-3 gap-4 mb-5">
            <div className="bg-white rounded-2xl border border-[#EDE8DC] p-5" style={{ boxShadow: '0 2px 16px rgba(180,150,60,0.1)' }}>
              <h4 className="font-display text-[13px] mb-3">Debt Breakdown</h4>
              <div className="relative h-[180px]"><Doughnut data={doughnutData} options={chartOpts} /></div>
            </div>
            <div className="bg-white rounded-2xl border border-[#EDE8DC] p-5" style={{ boxShadow: '0 2px 16px rgba(180,150,60,0.1)' }}>
              <h4 className="font-display text-[13px] mb-3">Monthly Payments</h4>
              <div className="relative h-[180px]"><Bar data={barData} options={barOpts} /></div>
            </div>
            <div className="bg-white rounded-2xl border border-[#EDE8DC] p-5" style={{ boxShadow: '0 2px 16px rgba(180,150,60,0.1)' }}>
              <h4 className="font-display text-[13px] mb-3">Projected Payoff (12 months)</h4>
              <div className="relative h-[180px]">
                <Line data={lineData} options={{ ...barOpts, scales: { ...barOpts.scales, y: { ...barOpts.scales.y, min: 0 } } }} />
              </div>
            </div>
          </div>

          {/* Overall progress */}
          <div className="bg-white rounded-2xl border border-[#EDE8DC] p-5 mb-5" style={{ boxShadow: '0 2px 16px rgba(180,150,60,0.1)' }}>
            <div className="flex justify-between mb-2">
              <span className="text-[13px] font-semibold text-[#2C2A25]">Overall Debt Repayment Progress</span>
              <span className="text-[13px] font-bold text-[#3BAF7E]">
                {totalOriginal > 0 ? ((totalPaid / totalOriginal) * 100).toFixed(1) : 0}% paid off
              </span>
            </div>
            <div className="h-3 bg-[#EDE8DC] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${totalOriginal > 0 ? (totalPaid / totalOriginal) * 100 : 0}%`, background: 'linear-gradient(90deg,#66BB6A,#3BAF7E)' }} />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-[11px] text-[#A89E8C]">Paid: {fmt(totalPaid)}</span>
              <span className="text-[11px] text-[#A89E8C]">Remaining: {fmt(totalDebt)}</span>
            </div>
          </div>

          {/* Debt cards grid */}
          <div className="grid grid-cols-2 gap-4">
            {debts.map(debt => (
              <DebtCard
                key={debt.id} debt={debt} payments={payments}
                onDelete={handleDeleteDebt}
                onPay={(d) => { setPayDebt(d); setPayForm({ amount: String(d.monthly_payment), date: today(), notes: '' }); setPayOpen(true) }}
                onPayDelete={handleDeletePayment}
              />
            ))}
          </div>
        </>
      )}

      {/* Add Debt Modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add New Debt">
        <form onSubmit={handleAddDebt} className="flex flex-col gap-3.5">
          <FormInput label="Debt Name" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Gold Loan, Compassia" required />
          <FormSelect label="Debt Type" value={form.debt_type} onChange={e => set('debt_type', e.target.value)}>
            {DEBT_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
          </FormSelect>
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Total Amount (RM)" type="number" step="0.01" min="0.01" value={form.total_amount} onChange={e => set('total_amount', e.target.value)} placeholder="0.00" required />
            <FormInput label="Remaining Balance (RM)" type="number" step="0.01" min="0" value={form.remaining} onChange={e => set('remaining', e.target.value)} placeholder="Leave blank = same as total" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Monthly Payment (RM)" type="number" step="0.01" min="0.01" value={form.monthly_payment} onChange={e => set('monthly_payment', e.target.value)} placeholder="0.00" required />
            <FormInput label="Interest Rate (% p.a.)" type="number" step="0.01" min="0" value={form.interest_rate} onChange={e => set('interest_rate', e.target.value)} placeholder="0.00" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Due Day of Month" type="number" min="1" max="31" value={form.due_day} onChange={e => set('due_day', e.target.value)} placeholder="1" />
            <FormInput label="Start Date" type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
          </div>
          <FormTextarea label="Notes (optional)" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any additional notes..." rows={2} />
          <BtnGold type="submit" disabled={saving} className="justify-center mt-1">{saving ? 'Saving…' : 'Add Debt'}</BtnGold>
        </form>
      </Modal>

      {/* Record Payment Modal */}
      <Modal open={payOpen} onClose={() => setPayOpen(false)} title={`Record Payment — ${payDebt?.name || ''}`}>
        <form onSubmit={handlePay} className="flex flex-col gap-3.5">
          {payDebt && (
            <div className="bg-[#FAF3DC] rounded-xl px-4 py-3 border border-[#F0D98C]">
              <p className="text-xs text-[#6B6355]">Remaining balance</p>
              <p className="text-[18px] font-bold text-[#E05C5C] font-display">{fmt(payDebt.remaining)}</p>
              <p className="text-xs text-[#A89E8C] mt-0.5">Monthly payment: {fmt(payDebt.monthly_payment)}</p>
            </div>
          )}
          <FormInput label="Payment Amount (RM)" type="number" step="0.01" min="0.01" value={payForm.amount} onChange={e => setP('amount', e.target.value)} placeholder="0.00" required />
          <FormInput label="Payment Date" type="date" value={payForm.date} onChange={e => setP('date', e.target.value)} required />
          <FormTextarea label="Notes (optional)" value={payForm.notes} onChange={e => setP('notes', e.target.value)} placeholder="e.g. March payment" rows={2} />
          <BtnGold type="submit" disabled={saving} className="justify-center mt-1">{saving ? 'Saving…' : 'Record Payment'}</BtnGold>
        </form>
      </Modal>
    </div>
  )
}
