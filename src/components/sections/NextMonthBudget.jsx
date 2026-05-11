import { useState, useEffect, useContext, useCallback } from 'react'
import {
  Plus, Trash2, Home, Car, Zap, ShoppingCart, PiggyBank,
  Edit3, Check, X, TrendingUp, AlertCircle, CheckCircle2,
  ChevronDown, ChevronUp, Calendar, Wallet, RefreshCw
} from 'lucide-react'
import { ToastContext } from '../../pages/Dashboard'
import { supabase } from '../../lib/supabase'
import { fmt } from '../../lib/utils'
import { BtnGold, BtnDanger, BtnOutline } from '../ui/Button'
import { FormInput, FormSelect } from '../ui/FormField'
import Modal from '../ui/Modal'

// ── Category config ───────────────────────────────────────────
const CATEGORIES = [
  { value: 'housing',       label: 'Housing / Rent',       icon: Home,        color: '#42A5F5', emoji: '🏠' },
  { value: 'car',           label: 'Car Instalment',        icon: Car,         color: '#AB47BC', emoji: '🚗' },
  { value: 'utilities',     label: 'Utilities',             icon: Zap,         color: '#26A69A', emoji: '⚡' },
  { value: 'monthly_use',   label: 'Monthly Use',           icon: ShoppingCart,color: '#FF8A65', emoji: '🛒' },
  { value: 'savings',       label: 'Savings',               icon: PiggyBank,   color: '#3BAF7E', emoji: '💰' },
  { value: 'other',         label: 'Other',                 icon: Wallet,      color: '#C9A84C', emoji: '📦' },
]

const catInfo = (v) => CATEGORIES.find(c => c.value === v) || CATEGORIES[5]

// ── DB helpers ────────────────────────────────────────────────
async function fetchBudget() {
  const { data, error } = await supabase
    .from('next_month_budget')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

async function createBudgetItem(item) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('next_month_budget')
    .insert([{ ...item, user_id: user.id }])
    .select()
    .single()
  if (error) throw error
  return data
}

async function updateBudgetItem(id, updates) {
  const { data, error } = await supabase
    .from('next_month_budget')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

async function deleteBudgetItem(id) {
  const { error } = await supabase.from('next_month_budget').delete().eq('id', id)
  if (error) throw error
}

// ── Next month label ─────────────────────────────────────────
function getNextMonthLabel() {
  const d = new Date()
  d.setMonth(d.getMonth() + 1)
  return d.toLocaleDateString('en-MY', { month: 'long', year: 'numeric' })
}

// ── Inline editable amount cell ───────────────────────────────
function EditableAmount({ value, onSave }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)

  function commit() {
    const n = parseFloat(val)
    if (!isNaN(n) && n >= 0) onSave(n)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          autoFocus
          type="number" step="0.01" min="0"
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
          className="w-28 px-2 py-1 border-[1.5px] border-[#C9A84C] rounded-lg text-[13px] outline-none bg-[#FAF3DC] text-[#2C2A25] font-semibold"
        />
        <button onClick={commit} className="w-6 h-6 flex items-center justify-center rounded-full bg-[#3BAF7E] text-white"><Check size={11} /></button>
        <button onClick={() => setEditing(false)} className="w-6 h-6 flex items-center justify-center rounded-full bg-[#EDE8DC] text-[#6B6355]"><X size={11} /></button>
      </div>
    )
  }

  return (
    <button
      onClick={() => { setVal(value); setEditing(true) }}
      className="flex items-center gap-1.5 group"
    >
      <span className="font-display text-[15px] font-bold text-[#2C2A25]">{fmt(value)}</span>
      <Edit3 size={11} className="text-[#C9A84C] opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  )
}

// ── Budget item row ───────────────────────────────────────────
function BudgetRow({ item, onUpdate, onDelete }) {
  const info = catInfo(item.category)
  const Icon = info.icon
  const isPaid = item.is_paid

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-all ${
        isPaid
          ? 'bg-[#F4FBF7] border-[#B8E6D0]'
          : 'bg-white border-[#EDE8DC]'
      }`}
      style={{ boxShadow: '0 1px 8px rgba(180,150,60,0.07)' }}
    >
      {/* Category icon */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: info.color + '18' }}
      >
        <Icon size={18} style={{ color: info.color }} />
      </div>

      {/* Label */}
      <div className="flex-1 min-w-0">
        <p className={`text-[13.5px] font-semibold truncate ${isPaid ? 'text-[#6B6355] line-through' : 'text-[#2C2A25]'}`}>
          {item.label}
        </p>
        <span
          className="text-[10px] font-bold tracking-[0.8px] uppercase px-1.5 py-0.5 rounded-full"
          style={{ background: info.color + '18', color: info.color }}
        >
          {info.emoji} {info.label}
        </span>
      </div>

      {/* Amount — inline edit */}
      <EditableAmount
        value={parseFloat(item.amount)}
        onSave={v => onUpdate(item.id, { amount: v })}
      />

      {/* Paid toggle */}
      <button
        onClick={() => onUpdate(item.id, { is_paid: !isPaid })}
        className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all flex-shrink-0 ${
          isPaid
            ? 'bg-[#3BAF7E] text-white'
            : 'bg-[#EDE8DC] text-[#A89E8C] hover:bg-[#C9A84C] hover:text-white'
        }`}
        title={isPaid ? 'Mark unpaid' : 'Mark paid'}
      >
        <Check size={14} />
      </button>

      {/* Delete */}
      <BtnDanger onClick={() => onDelete(item.id)} className="flex-shrink-0 !px-2 !py-1.5">
        <Trash2 size={13} />
      </BtnDanger>
    </div>
  )
}

// ── Category group ────────────────────────────────────────────
function CategoryGroup({ cat, items, onUpdate, onDelete }) {
  const [open, setOpen] = useState(true)
  const info = catInfo(cat)
  const Icon = info.icon
  const total = items.reduce((s, i) => s + parseFloat(i.amount || 0), 0)
  const paidCount = items.filter(i => i.is_paid).length

  return (
    <div className="rounded-2xl border border-[#EDE8DC] overflow-hidden" style={{ boxShadow: '0 2px 12px rgba(180,150,60,0.08)' }}>
      {/* Group header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-white hover:bg-[#FAFAF8] transition-colors"
      >
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: info.color + '20' }}>
          <Icon size={16} style={{ color: info.color }} />
        </div>
        <span className="text-[13px] font-bold text-[#2C2A25] flex-1 text-left">{info.label}</span>
        <span className="text-[11px] text-[#A89E8C] mr-1">{paidCount}/{items.length} paid</span>
        <span className="font-display text-[14px] font-bold text-[#9C7A2E] mr-2">{fmt(total)}</span>
        {open ? <ChevronUp size={14} className="text-[#A89E8C]" /> : <ChevronDown size={14} className="text-[#A89E8C]" />}
      </button>

      {open && (
        <div className="flex flex-col gap-2 p-3 bg-[#FAFAF8] border-t border-[#EDE8DC]">
          {items.map(item => (
            <BudgetRow key={item.id} item={item} onUpdate={onUpdate} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main section ──────────────────────────────────────────────
export default function NextMonthBudget() {
  const addToast = useContext(ToastContext)
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [resetConfirm, setResetConfirm] = useState(false)

  const [form, setForm] = useState({ label: '', category: 'housing', amount: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const load = useCallback(async () => {
    try { setItems(await fetchBudget()) }
    catch (e) { addToast(e.message, 'error') }
    setLoading(false)
  }, [addToast])

  useEffect(() => { load() }, [load])

  async function handleAdd(e) {
    e.preventDefault()
    if (!form.label.trim() || !form.amount) return
    setSaving(true)
    try {
      await createBudgetItem({
        label:    form.label.trim(),
        category: form.category,
        amount:   parseFloat(form.amount),
        is_paid:  false,
      })
      await load()
      setAddOpen(false)
      addToast('Budget item added!', 'success')
      setForm({ label: '', category: 'housing', amount: '' })
    } catch (e) { addToast(e.message, 'error') }
    setSaving(false)
  }

  async function handleUpdate(id, updates) {
    try { await updateBudgetItem(id, updates); await load() }
    catch (e) { addToast(e.message, 'error') }
  }

  async function handleDelete(id) {
    try { await deleteBudgetItem(id); await load(); addToast('Item removed.', 'success') }
    catch (e) { addToast(e.message, 'error') }
  }

  async function handleResetPaid() {
    try {
      const paid = items.filter(i => i.is_paid)
      await Promise.all(paid.map(i => updateBudgetItem(i.id, { is_paid: false })))
      await load()
      addToast('All items reset to unpaid!', 'success')
    } catch (e) { addToast(e.message, 'error') }
    setResetConfirm(false)
  }

  // ── Stats ────────────────────────────────────────────────
  const totalBudget   = items.reduce((s, i) => s + parseFloat(i.amount || 0), 0)
  const totalPaid     = items.filter(i => i.is_paid).reduce((s, i) => s + parseFloat(i.amount || 0), 0)
  const totalUnpaid   = totalBudget - totalPaid
  const paidPct       = totalBudget > 0 ? (totalPaid / totalBudget) * 100 : 0
  const paidCount     = items.filter(i => i.is_paid).length

  // Group by category (only categories present in items)
  const grouped = CATEGORIES
    .map(c => ({ cat: c.value, items: items.filter(i => i.category === c.value) }))
    .filter(g => g.items.length > 0)

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="spinner" />
    </div>
  )

  return (
    <div className="section-enter">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <h2 className="font-display text-[22px] text-[#2C2A25]">Next Month Budget</h2>
          <div className="flex items-center gap-2 mt-0.5">
            <Calendar size={13} className="text-[#A89E8C]" />
            <p className="text-[13px] text-[#A89E8C]">Plan your spending for {getNextMonthLabel()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {items.some(i => i.is_paid) && (
            <BtnOutline onClick={() => setResetConfirm(true)}>
              <RefreshCw size={13} /> Reset Paid
            </BtnOutline>
          )}
          <BtnGold onClick={() => setAddOpen(true)}>
            <Plus size={14} /> Add Item
          </BtnGold>
        </div>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Budget',  value: fmt(totalBudget),  color: '#9C7A2E',  icon: <Wallet size={15} />     },
          { label: 'Paid / Set',    value: fmt(totalPaid),    color: '#3BAF7E',  icon: <CheckCircle2 size={15}/> },
          { label: 'Remaining',     value: fmt(totalUnpaid),  color: '#E05C5C',  icon: <AlertCircle size={15}/> },
          { label: 'Items Tracked', value: `${paidCount} / ${items.length}`, color: '#C9A84C', icon: <TrendingUp size={15}/> },
        ].map(({ label, value, color, icon }) => (
          <div key={label} className="bg-white rounded-2xl border border-[#EDE8DC] px-4 py-4" style={{ boxShadow: '0 2px 12px rgba(180,150,60,0.10)' }}>
            <div className="flex items-center gap-1.5 mb-2" style={{ color }}>
              {icon}
              <p className="text-[11px] font-bold tracking-[0.5px] uppercase opacity-80">{label}</p>
            </div>
            <p className="font-display text-[18px] md:text-[20px] font-bold" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── Progress bar ── */}
      {items.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#EDE8DC] px-5 py-4 mb-6" style={{ boxShadow: '0 2px 12px rgba(180,150,60,0.08)' }}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-[13px] font-semibold text-[#2C2A25]">Budget Progress</span>
            <span className="text-[12px] font-bold text-[#9C7A2E]">{paidPct.toFixed(1)}% accounted for</span>
          </div>
          <div className="h-3.5 bg-[#EDE8DC] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${paidPct}%`,
                background: paidPct >= 100
                  ? 'linear-gradient(90deg,#3BAF7E,#66BB6A)'
                  : 'linear-gradient(90deg,#C9A84C,#F0D98C)',
              }}
            />
          </div>

          {/* Category breakdown bar */}
          <div className="mt-3">
            <p className="text-[10px] text-[#A89E8C] font-semibold uppercase tracking-[0.8px] mb-1.5">By Category</p>
            <div className="flex h-2 rounded-full overflow-hidden gap-px">
              {CATEGORIES.map(c => {
                const catTotal = items.filter(i => i.category === c.value).reduce((s, i) => s + parseFloat(i.amount || 0), 0)
                const pct = totalBudget > 0 ? (catTotal / totalBudget) * 100 : 0
                if (pct === 0) return null
                return (
                  <div key={c.value} style={{ width: `${pct}%`, background: c.color }} title={`${c.label}: ${fmt(catTotal)}`} />
                )
              })}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2">
              {CATEGORIES.filter(c => items.some(i => i.category === c.value)).map(c => {
                const catTotal = items.filter(i => i.category === c.value).reduce((s, i) => s + parseFloat(i.amount || 0), 0)
                return (
                  <div key={c.value} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ background: c.color }} />
                    <span className="text-[11px] text-[#6B6355]">{c.emoji} {c.label}</span>
                    <span className="text-[11px] font-bold text-[#2C2A25]">{fmt(catTotal)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Budget items grouped ── */}
      {grouped.length > 0 ? (
        <div className="flex flex-col gap-3">
          {grouped.map(({ cat, items: catItems }) => (
            <CategoryGroup
              key={cat}
              cat={cat}
              items={catItems}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#EDE8DC] p-16 text-center" style={{ boxShadow: '0 2px 16px rgba(180,150,60,0.1)' }}>
          <p className="text-4xl mb-3">📋</p>
          <h3 className="font-display text-[18px] text-[#2C2A25] mb-2">No budget items yet</h3>
          <p className="text-[13px] text-[#A89E8C] mb-5">
            Plan your expenses for {getNextMonthLabel()} — housing, car, utilities, and more.
          </p>
          <BtnGold onClick={() => setAddOpen(true)}><Plus size={14} /> Add First Item</BtnGold>
        </div>
      )}

      {/* ── Add item modal ── */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Budget Item">
        <form onSubmit={handleAdd} className="flex flex-col gap-3.5">

          {/* Quick-fill suggestions */}
          <div>
            <p className="text-[11px] font-semibold text-[#A89E8C] mb-2 uppercase tracking-[0.8px]">Quick Fill</p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'House Rent',      category: 'housing',     amount: '' },
                { label: 'Car Instalment',  category: 'car',         amount: '' },
                { label: 'Electricity',     category: 'utilities',   amount: '' },
                { label: 'Water Bill',      category: 'utilities',   amount: '' },
                { label: 'Internet',        category: 'utilities',   amount: '' },
                { label: 'Groceries',       category: 'monthly_use', amount: '' },
                { label: 'Savings',         category: 'savings',     amount: '' },
              ].map(s => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, label: s.label, category: s.category }))}
                  className="px-3 py-1.5 rounded-full text-[11px] font-medium bg-[#FAF3DC] text-[#9C7A2E] border border-[#F0D98C] hover:bg-[#F0D98C] transition-colors"
                >
                  {catInfo(s.category).emoji} {s.label}
                </button>
              ))}
            </div>
          </div>

          <FormSelect label="Category" value={form.category} onChange={e => set('category', e.target.value)}>
            {CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
            ))}
          </FormSelect>

          <FormInput
            label="Item Name"
            value={form.label}
            onChange={e => set('label', e.target.value)}
            placeholder="e.g. House Rent, Car Instalment, Savings…"
            required
          />

          <FormInput
            label="Planned Amount (RM)"
            type="number"
            step="0.01"
            min="0.01"
            value={form.amount}
            onChange={e => set('amount', e.target.value)}
            placeholder="0.00"
            required
          />

          <BtnGold type="submit" disabled={saving} className="justify-center mt-1">
            {saving ? 'Saving…' : 'Add to Budget'}
          </BtnGold>
        </form>
      </Modal>

      {/* ── Reset confirmation ── */}
      <Modal open={resetConfirm} onClose={() => setResetConfirm(false)} title="Reset Paid Items">
        <div className="text-center py-3">
          <RefreshCw size={32} className="mx-auto text-[#C9A84C] mb-3" />
          <p className="text-[14px] text-[#2C2A25] font-semibold mb-1">Reset all items to unpaid?</p>
          <p className="text-[13px] text-[#A89E8C] mb-5">This is useful at the start of a new month. Amounts will stay the same.</p>
          <div className="flex gap-3 justify-center">
            <BtnGold onClick={handleResetPaid}>Yes, Reset All</BtnGold>
            <BtnOutline onClick={() => setResetConfirm(false)}>Cancel</BtnOutline>
          </div>
        </div>
      </Modal>

    </div>
  )
}
