import { useState, useEffect, useContext } from 'react'
import { Plus, Trash2, TrendingUp, Building2, Target, Calendar, DollarSign } from 'lucide-react'
import { Line, Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, LineElement, PointElement, ArcElement, CategoryScale, LinearScale, Filler, Tooltip, Legend } from 'chart.js'
import { ToastContext } from '../../pages/Dashboard'
import { fetchGoals, createGoal, updateGoal, deleteGoal } from '../../lib/debtGoalDb'
import { fmt } from '../../lib/utils'
import Modal from '../ui/Modal'
import { BtnGold, BtnDanger } from '../ui/Button'
import { FormInput, FormSelect, FormTextarea } from '../ui/FormField'

ChartJS.register(LineElement, PointElement, ArcElement, CategoryScale, LinearScale, Filler, Tooltip, Legend)

const GOAL_TYPES = [
  { value: 'savings',        label: 'Save for a Goal',        icon: '🎯', color: '#C9A84C', desc: 'e.g. Buy a car, vacation, gadget' },
  { value: 'monthly_target', label: 'Monthly Savings Target', icon: '📅', color: '#42A5F5', desc: 'e.g. Save RM500 every month' },
  { value: 'debt_free',      label: 'Debt-Free Target',       icon: '🔓', color: '#3BAF7E', desc: 'Track when you will be debt-free' },
  { value: 'net_worth',      label: 'Net Worth Target',       icon: '📈', color: '#AB47BC', desc: 'e.g. Reach RM100,000 net worth' },
  { value: 'aurean',         label: 'AUREAN SOLUTIONS Target', icon: '🏢', color: '#1A237E', desc: 'Business savings target for AUREAN SOLUTIONS' },
]

const ICONS = ['🎯','🚗','✈️','🏠','💍','📱','🎓','💻','🏖️','🌏','💰','🏦','🎁','🏋️','📚']
const typeInfo = t => GOAL_TYPES.find(g => g.value === t) || GOAL_TYPES[0]
const today    = () => new Date().toISOString().split('T')[0]

function daysUntil(dateStr) {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr + 'T00:00:00') - new Date()) / 864e5)
}
function formatDays(days) {
  if (days === null) return '—'
  if (days < 0) return 'Overdue'
  if (days === 0) return 'Today!'
  if (days < 30) return `${days} days`
  if (days < 365) return `${Math.floor(days/30)}m ${days%30}d`
  return `${Math.floor(days/365)}y ${Math.floor((days%365)/30)}m`
}

// ── AUREAN SOLUTIONS Dedicated Card ─────────────────────────
function AureanCard({ goal, onDelete, onUpdate }) {
  const [contributing, setContributing] = useState(false)
  const [amount, setAmount] = useState('')

  const current   = parseFloat(goal.current_amount || 0)
  const target    = parseFloat(goal.target_amount || 0)
  const pct       = target > 0 ? Math.min((current / target) * 100, 100) : 0
  const remaining = Math.max(0, target - current)
  const days      = daysUntil(goal.target_date)
  const monthlyNeeded = days !== null && days > 0 ? (remaining / (days / 30)) : null

  // Milestone markers at 25%, 50%, 75%, 100%
  const milestones = [25, 50, 75, 100]

  // Projection line
  const projLabels = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() + i)
    return d.toLocaleDateString('en-MY', { month: 'short', year: '2-digit' })
  })
  const monthly = parseFloat(goal.monthly_target || 0)
  const projData = projLabels.map((_, i) => Math.min(target, current + monthly * i))

  const lineData = {
    labels: projLabels,
    datasets: [
      { label: 'Projected', data: projData, borderColor: '#C9A84C', backgroundColor: 'rgba(201,168,76,0.15)', fill: true, tension: 0.4, pointRadius: 2 },
      { label: 'Target',    data: Array(12).fill(target), borderColor: 'rgba(255,255,255,0.2)', borderDash: [5,5], borderWidth: 1.5, pointRadius: 0, fill: false },
    ],
  }

  async function handleContribute() {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) return
    await onUpdate(goal.id, { current_amount: Math.min(target, current + amt) })
    setAmount(''); setContributing(false)
  }

  return (
    <div className="col-span-2 rounded-2xl overflow-hidden relative" style={{ background: 'linear-gradient(135deg, #0D1B4B 0%, #1A237E 40%, #283593 100%)', boxShadow: '0 8px 40px rgba(13,27,75,0.35)' }}>

      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #C9A84C, transparent)', transform: 'translate(30%, -30%)' }} />
      <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full opacity-5" style={{ background: 'radial-gradient(circle, #fff, transparent)', transform: 'translate(-30%, 30%)' }} />

      <div className="relative p-7">
        {/* Header */}
        <div className="flex items-start justify-between mb-7">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#C9A84C,#9C7A2E)', boxShadow: '0 4px 16px rgba(201,168,76,0.4)' }}>
              <Building2 size={26} color="white" />
            </div>
            <div>
              <p className="text-[11px] font-bold tracking-[2px] text-[#C9A84C] uppercase mb-1">Business Target</p>
              <h3 className="font-display text-[22px] font-bold text-white">{goal.name}</h3>
              <p className="text-[12px] text-[rgba(255,255,255,0.5)] mt-0.5">AUREAN SOLUTIONS SDN. BHD.</p>
            </div>
          </div>
          <BtnDanger onClick={() => onDelete(goal.id)} className="opacity-60 hover:opacity-100"><Trash2 size={13}/></BtnDanger>
        </div>

        {/* Main stats */}
        <div className="grid grid-cols-4 gap-4 mb-7">
          {[
            { label: 'Target',       value: fmt(target),                          icon: <Target size={14}/> },
            { label: 'Saved',        value: fmt(current),                         icon: <DollarSign size={14}/> },
            { label: 'Remaining',    value: fmt(remaining),                       icon: <TrendingUp size={14}/> },
            { label: 'Time Left',    value: formatDays(days),                     icon: <Calendar size={14}/> },
          ].map(({ label, value, icon }) => (
            <div key={label} className="rounded-xl p-3.5" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="flex items-center gap-1.5 text-[#C9A84C] mb-1.5">{icon}<p className="text-[10px] font-bold tracking-[1px] uppercase opacity-80">{label}</p></div>
              <p className="text-[15px] font-bold text-white">{value}</p>
            </div>
          ))}
        </div>

        {/* Progress bar with milestones */}
        <div className="mb-6">
          <div className="flex justify-between mb-2">
            <span className="text-[13px] font-semibold text-white">{pct.toFixed(1)}% Complete</span>
            {monthlyNeeded && <span className="text-[12px] text-[#C9A84C]">Need {fmt(monthlyNeeded)}/month to hit target</span>}
          </div>
          {/* Main progress bar */}
          <div className="h-4 rounded-full relative overflow-hidden" style={{ background: 'rgba(255,255,255,0.12)' }}>
            <div className="h-full rounded-full transition-all duration-700 relative"
              style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#9C7A2E,#C9A84C,#F0D98C)' }}>
              <div className="absolute inset-0 rounded-full" style={{ background: 'linear-gradient(180deg,rgba(255,255,255,0.25),transparent)' }} />
            </div>
            {/* Milestone markers */}
            {milestones.map(m => (
              <div key={m} className="absolute top-0 h-full w-[2px]" style={{ left: `${m}%`, background: 'rgba(255,255,255,0.2)', transform: 'translateX(-50%)' }} />
            ))}
          </div>
          {/* Milestone labels */}
          <div className="flex justify-between mt-1.5">
            {milestones.map(m => (
              <span key={m} className="text-[10px]" style={{ color: pct >= m ? '#C9A84C' : 'rgba(255,255,255,0.3)', fontWeight: pct >= m ? '700' : '400' }}>
                {m === 100 ? '🏆' : `${m}%`}
              </span>
            ))}
          </div>
        </div>

        {/* Projection chart + notes */}
        <div className="grid grid-cols-3 gap-5 mb-6">
          <div className="col-span-2">
            <p className="text-[11px] text-[rgba(255,255,255,0.5)] mb-2 font-semibold tracking-[1px] uppercase">Savings Projection</p>
            <div className="relative h-[130px]">
              <Line data={lineData} options={{
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  x: { ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
                  y: { ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 9 }, callback: v => 'RM' + (v/1000).toFixed(0) + 'k' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                },
              }} />
            </div>
          </div>
          <div>
            <p className="text-[11px] text-[rgba(255,255,255,0.5)] mb-2 font-semibold tracking-[1px] uppercase">Status</p>
            {pct >= 100 ? (
              <div className="rounded-xl p-4 text-center h-[130px] flex flex-col items-center justify-center"
                style={{ background: 'linear-gradient(135deg,rgba(59,175,126,0.3),rgba(59,175,126,0.1))', border: '1px solid rgba(59,175,126,0.4)' }}>
                <p className="text-3xl mb-1">🏆</p>
                <p className="text-[13px] font-bold text-[#66BB6A]">Target Achieved!</p>
              </div>
            ) : (
              <div className="rounded-xl p-4 h-[130px] flex flex-col justify-between"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div>
                  <p className="text-[10px] text-[rgba(255,255,255,0.4)] uppercase tracking-[1px]">Est. completion</p>
                  <p className="text-[14px] font-bold text-white mt-0.5">
                    {goal.target_date ? new Date(goal.target_date+'T00:00:00').toLocaleDateString('en-MY',{month:'short',year:'numeric'}) : '—'}
                  </p>
                </div>
                {goal.notes && <p className="text-[11px] text-[rgba(255,255,255,0.4)] italic line-clamp-3">{goal.notes}</p>}
              </div>
            )}
          </div>
        </div>

        {/* Add progress */}
        {pct < 100 && (
          !contributing ? (
            <button onClick={() => setContributing(true)}
              className="w-full py-3 rounded-xl text-[13px] font-bold transition-all hover:-translate-y-px"
              style={{ background: 'linear-gradient(135deg,#C9A84C,#9C7A2E)', color: 'white', boxShadow: '0 4px 16px rgba(201,168,76,0.3)' }}>
              + Add Contribution
            </button>
          ) : (
            <div className="flex gap-3">
              <input type="number" step="0.01" min="0.01" value={amount} onChange={e => setAmount(e.target.value)}
                placeholder="Contribution amount (RM)"
                className="flex-1 px-4 py-2.5 rounded-xl text-[13px] outline-none font-medium"
                style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(201,168,76,0.4)', color: 'white' }} />
              <button onClick={handleContribute}
                className="px-5 py-2.5 rounded-xl text-[13px] font-bold text-white transition-all"
                style={{ background: 'linear-gradient(135deg,#C9A84C,#9C7A2E)' }}>Save</button>
              <button onClick={() => setContributing(false)}
                className="px-4 py-2.5 rounded-xl text-[12px] font-medium transition-all"
                style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}>Cancel</button>
            </div>
          )
        )}
      </div>
    </div>
  )
}

// ── Regular Goal Card ─────────────────────────────────────────
function GoalCard({ goal, onDelete, onUpdate }) {
  const [contributing, setContributing] = useState(false)
  const [amount, setAmount] = useState('')
  const info      = typeInfo(goal.goal_type)
  const current   = parseFloat(goal.current_amount || 0)
  const target    = parseFloat(goal.target_amount || 0)
  const pct       = target > 0 ? Math.min((current / target) * 100, 100) : 0
  const remaining = Math.max(0, target - current)
  const days      = daysUntil(goal.target_date)
  const monthlyNeeded = days !== null && days > 0 ? (remaining / (days / 30)).toFixed(0) : null

  const projLabels = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - 3 + i)
    return d.toLocaleDateString('en-MY', { month: 'short' })
  })
  const monthly = parseFloat(goal.monthly_target || 0)
  const projData = Array.from({ length: 12 }, (_, i) => {
    if (i < 3) return current * (i / 3)
    return Math.min(target, current + monthly * (i - 3))
  })

  const lineData = {
    labels: projLabels,
    datasets: [
      { label: 'Progress', data: projData, borderColor: info.color, backgroundColor: info.color + '20', fill: true, tension: 0.4, pointRadius: 2 },
      { label: 'Target',   data: Array(12).fill(target), borderColor: '#EDE8DC', borderDash: [4,4], borderWidth: 1.5, pointRadius: 0, fill: false },
    ],
  }

  async function handleContribute() {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) return
    await onUpdate(goal.id, { current_amount: Math.min(target, current + amt) })
    setAmount(''); setContributing(false)
  }

  return (
    <div className="bg-white rounded-2xl border border-[#EDE8DC] overflow-hidden" style={{ boxShadow: '0 2px 16px rgba(180,150,60,0.10)' }}>
      <div className="h-1.5" style={{ background: info.color }} />
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: info.color + '15' }}>
              {goal.icon || info.icon}
            </div>
            <div>
              <h3 className="font-display text-[15px] font-bold text-[#2C2A25]">{goal.name}</h3>
              <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: info.color+'20', color: info.color }}>{info.label}</span>
            </div>
          </div>
          <BtnDanger onClick={() => onDelete(goal.id)}><Trash2 size={13}/></BtnDanger>
        </div>

        <div className="mb-4">
          <div className="flex justify-between mb-1.5">
            <span className="text-[12px] font-bold text-[#2C2A25]">{fmt(current)}</span>
            <span className="text-[12px] text-[#A89E8C]">of {fmt(target)}</span>
          </div>
          <div className="h-3 bg-[#EDE8DC] rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: pct >= 100 ? '#3BAF7E' : info.color }} />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[11px]" style={{ color: info.color }}>{pct.toFixed(1)}% complete</span>
            <span className="text-[11px] text-[#A89E8C]">{fmt(remaining)} to go</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          {goal.target_date && (
            <div className="bg-[#FAFAF8] rounded-xl p-2.5 border border-[#EDE8DC]">
              <p className="text-[10px] text-[#A89E8C]">Time Left</p>
              <p className="text-[13px] font-bold" style={{ color: days < 30 ? '#E05C5C' : days < 90 ? '#E08030' : '#2C2A25' }}>{formatDays(days)}</p>
              <p className="text-[10px] text-[#A89E8C]">{new Date(goal.target_date+'T00:00:00').toLocaleDateString('en-MY',{ day:'numeric', month:'short', year:'numeric' })}</p>
            </div>
          )}
          {monthlyNeeded && (
            <div className="bg-[#FAFAF8] rounded-xl p-2.5 border border-[#EDE8DC]">
              <p className="text-[10px] text-[#A89E8C]">Need Monthly</p>
              <p className="text-[13px] font-bold text-[#9C7A2E]">{fmt(monthlyNeeded)}</p>
              <p className="text-[10px] text-[#A89E8C]">to hit target</p>
            </div>
          )}
        </div>

        <div className="mb-4">
          <p className="text-[11px] text-[#A89E8C] mb-1.5">Projected Progress</p>
          <div className="relative h-[100px]">
            <Line data={lineData} options={{
              responsive: true, maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: { x: { ticks: { color:'#A89E8C', font:{size:9} }, grid:{ display:false } }, y: { ticks: { color:'#A89E8C', font:{size:9}, callback: v => 'RM'+v.toLocaleString() }, grid: { color:'#EDE8DC' } } },
            }} />
          </div>
        </div>

        {pct >= 100 && (
          <div className="bg-[#E8F5E9] rounded-xl p-3 text-center border border-[#C8E6C9] mb-3">
            <p className="text-[14px] font-bold text-[#388E3C]">🎉 Goal Achieved!</p>
          </div>
        )}

        {pct < 100 && (
          !contributing ? (
            <BtnGold onClick={() => setContributing(true)} className="w-full justify-center text-xs py-2">+ Add Progress</BtnGold>
          ) : (
            <div className="flex gap-2">
              <input type="number" step="0.01" min="0.01" value={amount} onChange={e => setAmount(e.target.value)}
                placeholder="Amount (RM)"
                className="flex-1 px-3 py-2 border-[1.5px] border-[#EDE8DC] rounded-xl text-sm outline-none bg-[#FAFAF8] focus:border-[#C9A84C] transition-colors" />
              <BtnGold onClick={handleContribute} className="px-3 py-2 text-xs">Save</BtnGold>
              <button onClick={() => setContributing(false)} className="px-3 py-2 text-xs text-[#A89E8C] hover:text-[#6B6355] transition-colors">Cancel</button>
            </div>
          )
        )}

        {goal.notes && <p className="text-[11px] text-[#A89E8C] mt-3 border-t border-[#EDE8DC] pt-2">{goal.notes}</p>}
      </div>
    </div>
  )
}

// ── Main Goals Section ────────────────────────────────────────
export default function Goals() {
  const addToast = useContext(ToastContext)
  const [goals,   setGoals]   = useState([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [filter,  setFilter]  = useState('all')
  const [selIcon, setSelIcon] = useState('🎯')

  const [form, setForm] = useState({
    name: '', goal_type: 'savings', target_amount: '', current_amount: '0',
    monthly_target: '', target_date: '', notes: '', icon: '🎯',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function load() {
    try { setGoals(await fetchGoals()) } catch(e) { addToast(e.message, 'error') }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function handleAdd(e) {
    e.preventDefault(); setSaving(true)
    try {
      const info = typeInfo(form.goal_type)
      await createGoal({
        name: form.name, goal_type: form.goal_type,
        icon: form.goal_type === 'aurean' ? '🏢' : selIcon,
        target_amount:   parseFloat(form.target_amount),
        current_amount:  parseFloat(form.current_amount || 0),
        monthly_target:  parseFloat(form.monthly_target || 0),
        target_date:     form.target_date || null,
        notes:           form.notes,
        color:           info.color,
      })
      await load(); setAddOpen(false); addToast('Goal added!', 'success')
      setForm({ name:'', goal_type:'savings', target_amount:'', current_amount:'0', monthly_target:'', target_date:'', notes:'', icon:'🎯' })
      setSelIcon('🎯')
    } catch(e) { addToast(e.message, 'error') }
    setSaving(false)
  }

  async function handleUpdate(id, updates) {
    try { await updateGoal(id, updates); await load(); addToast('Progress updated!', 'success') }
    catch(e) { addToast(e.message, 'error') }
  }

  async function handleDelete(id) {
    try { await deleteGoal(id); await load(); addToast('Goal removed.', 'success') }
    catch(e) { addToast(e.message, 'error') }
  }

  const aureanGoals  = goals.filter(g => g.goal_type === 'aurean')
  const regularGoals = goals.filter(g => g.goal_type !== 'aurean')
  const filtered     = filter === 'all' ? regularGoals : regularGoals.filter(g => g.goal_type === filter)
  const totalSaved   = goals.reduce((s, g) => s + parseFloat(g.current_amount || 0), 0)
  const totalTarget  = goals.reduce((s, g) => s + parseFloat(g.target_amount || 0), 0)
  const completed    = goals.filter(g => parseFloat(g.current_amount) >= parseFloat(g.target_amount)).length

  if (loading) return <div className="flex items-center justify-center py-20"><div className="spinner" /></div>

  return (
    <div className="section-enter">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-display text-[22px] text-[#2C2A25]">Goals</h2>
          <p className="text-[13px] text-[#A89E8C] mt-0.5">Track your financial goals and milestones</p>
        </div>
        <BtnGold onClick={() => setAddOpen(true)}><Plus size={14}/> Add Goal</BtnGold>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Saved',    value: fmt(totalSaved),  color: '#3BAF7E' },
          { label: 'Total Target',   value: fmt(totalTarget), color: '#9C7A2E' },
          { label: 'Goals Active',   value: goals.length,     color: '#2C2A25' },
          { label: 'Goals Achieved', value: completed,        color: '#C9A84C' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-[#EDE8DC] px-5 py-4" style={{ boxShadow:'0 2px 12px rgba(180,150,60,0.1)' }}>
            <p className="text-[12px] text-[#A89E8C]">{label}</p>
            <p className="font-display text-[22px] font-bold mt-1" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* AUREAN SOLUTIONS Section */}
      {aureanGoals.length > 0 && (
        <div className="mb-7">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#1A237E]" />
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full" style={{ background: 'linear-gradient(135deg,#0D1B4B,#1A237E)', border: '1px solid rgba(201,168,76,0.3)' }}>
              <Building2 size={13} color="#C9A84C" />
              <span className="text-[11px] font-bold tracking-[2px] text-[#C9A84C] uppercase">Aurean Solutions</span>
            </div>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#1A237E]" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            {aureanGoals.map(g => <AureanCard key={g.id} goal={g} onDelete={handleDelete} onUpdate={handleUpdate} />)}
          </div>
        </div>
      )}

      {/* Regular Goals */}
      {regularGoals.length > 0 && (
        <>
          {aureanGoals.length > 0 && (
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1 bg-[#EDE8DC]" />
              <span className="text-[11px] font-bold tracking-[2px] text-[#A89E8C] uppercase px-3">Personal Goals</span>
              <div className="h-px flex-1 bg-[#EDE8DC]" />
            </div>
          )}
          {/* Filter tabs */}
          <div className="flex gap-2 mb-5 flex-wrap">
            {[{ value:'all', label:'All', icon:'📋' }, ...GOAL_TYPES.filter(t => t.value !== 'aurean')].map(t => (
              <button key={t.value} onClick={() => setFilter(t.value)}
                className={`px-4 py-1.5 rounded-full text-[12px] font-medium transition-all border ${filter===t.value?'text-white border-transparent':'bg-white text-[#6B6355] border-[#EDE8DC] hover:bg-[#FAF3DC]'}`}
                style={filter===t.value ? { background: typeInfo(t.value)?.color || '#C9A84C' } : {}}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {filtered.map(g => <GoalCard key={g.id} goal={g} onDelete={handleDelete} onUpdate={handleUpdate} />)}
          </div>
        </>
      )}

      {goals.length === 0 && (
        <div className="bg-white rounded-2xl border border-[#EDE8DC] p-16 text-center" style={{ boxShadow:'0 2px 16px rgba(180,150,60,0.1)' }}>
          <p className="text-4xl mb-3">🎯</p>
          <h3 className="font-display text-[18px] text-[#2C2A25] mb-2">No goals yet</h3>
          <p className="text-[13px] text-[#A89E8C] mb-5">Set financial goals and track your progress</p>
          <BtnGold onClick={() => setAddOpen(true)}><Plus size={14}/> Add First Goal</BtnGold>
        </div>
      )}

      {/* Add Goal Modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add New Goal">
        <form onSubmit={handleAdd} className="flex flex-col gap-3.5">
          <FormSelect label="Goal Type" value={form.goal_type} onChange={e => set('goal_type', e.target.value)}>
            {GOAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
          </FormSelect>

          {/* Icon picker — hide for Aurean */}
          {form.goal_type !== 'aurean' && (
            <div>
              <p className="text-[12px] font-semibold text-[#6B6355] mb-2">Icon</p>
              <div className="flex flex-wrap gap-2">
                {ICONS.map(ic => (
                  <button key={ic} type="button" onClick={() => { setSelIcon(ic); set('icon', ic) }}
                    className={`w-9 h-9 rounded-xl text-xl flex items-center justify-center transition-all border ${selIcon===ic?'border-[#C9A84C] scale-110':'border-[#EDE8DC] hover:border-[#C9A84C]'}`}
                    style={selIcon===ic?{ background:'#FAF3DC' }:{ background:'#FAFAF8' }}>{ic}</button>
                ))}
              </div>
            </div>
          )}

          {/* AUREAN label */}
          {form.goal_type === 'aurean' && (
            <div className="rounded-xl p-4 flex items-center gap-3" style={{ background:'linear-gradient(135deg,#0D1B4B,#1A237E)', border:'1px solid rgba(201,168,76,0.3)' }}>
              <Building2 size={20} color="#C9A84C" />
              <div>
                <p className="text-[12px] font-bold text-[#C9A84C]">AUREAN SOLUTIONS SDN. BHD.</p>
                <p className="text-[11px] text-[rgba(255,255,255,0.5)]">Business savings target</p>
              </div>
            </div>
          )}

          <FormInput label="Goal Name" value={form.name} onChange={e => set('name', e.target.value)}
            placeholder={form.goal_type==='aurean'?'e.g. Business Capital Fund':'e.g. Buy a Car, Vacation'} required />
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Target Amount (RM)" type="number" step="0.01" min="0.01" value={form.target_amount} onChange={e => set('target_amount', e.target.value)} placeholder="0.00" required />
            <FormInput label="Current Savings (RM)" type="number" step="0.01" min="0" value={form.current_amount} onChange={e => set('current_amount', e.target.value)} placeholder="0.00" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Monthly Saving (RM)" type="number" step="0.01" min="0" value={form.monthly_target} onChange={e => set('monthly_target', e.target.value)} placeholder="0.00" />
            <FormInput label="Target Date" type="date" value={form.target_date} onChange={e => set('target_date', e.target.value)} />
          </div>
          <FormTextarea label="Notes (optional)" value={form.notes} onChange={e => set('notes', e.target.value)}
            placeholder={form.goal_type==='aurean'?'e.g. Capital for expansion, equipment purchase...':'Any notes...'} rows={2} />
          <BtnGold type="submit" disabled={saving} className="justify-center mt-1">{saving?'Saving…':'Add Goal'}</BtnGold>
        </form>
      </Modal>
    </div>
  )
}
