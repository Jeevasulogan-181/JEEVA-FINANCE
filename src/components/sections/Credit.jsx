import { useContext, useState } from 'react'
import { Plus, FileDown, Pencil, Settings } from 'lucide-react'
import { Doughnut, Line } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, LineElement, PointElement, CategoryScale, LinearScale, Filler, Tooltip, Legend } from 'chart.js'
import { RecordsContext, ToastContext } from '../../pages/Dashboard'
import { createRecord, deleteRecord, updateRecord, saveSettings } from '../../lib/db'
import { fmt, today } from '../../lib/utils'
import Modal from '../ui/Modal'
import { BtnGold, BtnDanger, BtnOutline } from '../ui/Button'
import { FormInput, FormSelect } from '../ui/FormField'
import ExportModal from '../ui/ExportModal'
import EditTransactionModal from '../ui/EditTransactionModal'
import { exportCreditPDF } from '../../lib/exportPdf'

ChartJS.register(ArcElement, LineElement, PointElement, CategoryScale, LinearScale, Filler, Tooltip, Legend)

const C  = { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { font: { family: 'Lato', size: 11 }, color: '#6B6355', boxWidth: 12 } } } }
const LC = { ...C, scales: { x: { ticks: { color: '#A89E8C', font: { size: 10 } }, grid: { color: '#EDE8DC' } }, y: { ticks: { color: '#A89E8C', font: { size: 10 }, callback: v => 'RM' + v.toLocaleString() }, grid: { color: '#EDE8DC' } } } }

const CATEGORIES = ['Food', 'Shopping', 'Transport', 'Entertainment', 'Utilities', 'Healthcare', 'Travel', 'Other']
const CAT_COLORS = { Food: '#FF7043', Shopping: '#AB47BC', Transport: '#42A5F5', Entertainment: '#FFA726', Utilities: '#26A69A', Healthcare: '#EF5350', Travel: '#66BB6A', Other: '#BDBDBD' }

function EditBtn({ onClick }) {
  return (
    <button onClick={onClick}
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-[#9C7A2E] bg-[#FAF3DC] border border-[#F0D98C] hover:bg-[#F0D98C] transition-colors">
      <Pencil size={11} /> Edit
    </button>
  )
}

export default function Credit() {
  const { records, settings, setSettings, reload } = useContext(RecordsContext)
  const addToast = useContext(ToastContext)

  const [addOpen,    setAddOpen]    = useState(false)
  const [cfgOpen,    setCfgOpen]    = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [editRec,    setEditRec]    = useState(null)
  const [saving,     setSaving]     = useState(false)

  const [form, setForm] = useState({ description: '', category: 'Food', amount: '', date: today() })
  const [cfg,  setCfg]  = useState({ limit: settings.limit, due_day: settings.due_day, email: settings.email || '' })
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setC = (k, v) => setCfg(c => ({ ...c, [k]: v }))

  const creditRecs = records.filter(r => r.type === 'credit_transaction')
  const totalSpent = creditRecs.reduce((s, r) => s + parseFloat(r.amount || 0), 0)
  const limit      = parseFloat(settings.limit || 0)
  const available  = limit - totalSpent
  const utilPct    = limit > 0 ? Math.min((totalSpent / limit) * 100, 100) : 0

  // Category sums
  const catSums = {}
  CATEGORIES.forEach(c => { catSums[c] = 0 })
  creditRecs.forEach(r => { catSums[r.category] = (catSums[r.category] || 0) + parseFloat(r.amount || 0) })
  const usedCats = CATEGORIES.filter(c => catSums[c] > 0)

  const doughnutData = {
    labels:   usedCats.length ? usedCats : ['No spending'],
    datasets: [{ data: usedCats.length ? usedCats.map(c => catSums[c]) : [1], backgroundColor: usedCats.length ? usedCats.map(c => CAT_COLORS[c]) : ['#EEE'], borderWidth: 0 }],
  }

  // Monthly trend
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - 5 + i)
    return { label: d.toLocaleDateString('en-MY', { month: 'short', year: '2-digit' }), month: d.getMonth(), year: d.getFullYear() }
  })
  const lineData = {
    labels: months.map(m => m.label),
    datasets: [{
      label: 'Monthly Spend',
      data: months.map(m => creditRecs.filter(r => { const d = new Date(r.date); return d.getMonth() === m.month && d.getFullYear() === m.year }).reduce((s, r) => s + parseFloat(r.amount || 0), 0)),
      borderColor: '#E05C5C', backgroundColor: 'rgba(224,92,92,0.12)', fill: true, tension: 0.4, pointRadius: 4,
    }],
  }

  const sorted = [...creditRecs].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 15)

  async function handleAdd(e) {
    e.preventDefault(); setSaving(true)
    try {
      await createRecord({ type: 'credit_transaction', bank: 'uob', transaction_type: 'expense', description: form.description, category: form.category, amount: parseFloat(form.amount), date: form.date })
      await reload(); setAddOpen(false); addToast('Expense added!', 'success')
      setForm({ description: '', category: 'Food', amount: '', date: today() })
    } catch(err) { addToast(err.message, 'error') }
    setSaving(false)
  }

  async function handleSaveSettings(e) {
    e.preventDefault(); setSaving(true)
    try {
      await saveSettings({ limit: parseFloat(cfg.limit), due_day: parseInt(cfg.due_day), email: cfg.email })
      setSettings({ limit: parseFloat(cfg.limit), due_day: parseInt(cfg.due_day), email: cfg.email })
      setCfgOpen(false); addToast('Credit settings saved!', 'success')
    } catch(err) { addToast(err.message, 'error') }
    setSaving(false)
  }

  async function handleEdit(id, updates) {
    try { await updateRecord(id, updates); await reload(); addToast('Updated!', 'success') }
    catch(err) { addToast(err.message, 'error') }
  }

  async function handleDelete(id) {
    try { await deleteRecord(id); await reload(); addToast('Deleted.', 'success') }
    catch(err) { addToast(err.message, 'error') }
  }

  return (
    <div className="section-enter">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div><h2 className="font-display text-[22px]">Credit Card</h2><p className="text-[13px] text-[#A89E8C] mt-0.5">UOB Credit Card spending tracker</p></div>
        <div className="flex gap-2.5">
          <BtnGold onClick={() => setExportOpen(true)} style={{ background: 'linear-gradient(135deg,#6B6355,#2C2A25)' }}><FileDown size={14}/> Export PDF</BtnGold>
          <BtnOutline onClick={() => { setCfg({ limit: settings.limit, due_day: settings.due_day, email: settings.email || '' }); setCfgOpen(true) }}><Settings size={13}/> Set Limit</BtnOutline>
          <BtnGold onClick={() => setAddOpen(true)}><Plus size={14}/> Add Expense</BtnGold>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Credit Limit',   value: fmt(limit),     color: '#2C2A25' },
          { label: 'Total Spent',    value: fmt(totalSpent), color: '#E05C5C' },
          { label: 'Available',      value: fmt(available),  color: '#3BAF7E' },
          { label: 'Utilisation',    value: `${utilPct.toFixed(1)}%`, color: utilPct > 70 ? '#E05C5C' : '#9C7A2E' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-[#EDE8DC] px-5 py-4" style={{ boxShadow: '0 2px 12px rgba(180,150,60,0.1)' }}>
            <p className="text-[12px] text-[#A89E8C]">{label}</p>
            <p className="font-display text-[22px] font-bold" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Utilisation bar */}
      {limit > 0 && (
        <div className="bg-white rounded-2xl border border-[#EDE8DC] p-5 mb-5" style={{ boxShadow: '0 2px 16px rgba(180,150,60,0.1)' }}>
          <div className="flex justify-between mb-2">
            <span className="text-[13px] font-semibold text-[#2C2A25]">Credit Utilisation</span>
            <span className="text-[13px] font-bold" style={{ color: utilPct > 70 ? '#E05C5C' : '#3BAF7E' }}>{utilPct.toFixed(1)}%</span>
          </div>
          <div className="h-3 bg-[#EDE8DC] rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${utilPct}%`, background: utilPct > 70 ? 'linear-gradient(90deg,#EF5350,#E05C5C)' : 'linear-gradient(90deg,#66BB6A,#3BAF7E)' }} />
          </div>
          {settings.due_day && <p className="text-[11px] text-[#A89E8C] mt-1.5">Payment due: {settings.due_day}th of each month</p>}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="bg-white rounded-2xl border border-[#EDE8DC] p-5" style={{ boxShadow: '0 2px 16px rgba(180,150,60,0.1)' }}>
          <h4 className="font-display text-[13px] mb-3">Spending by Category</h4>
          <div className="relative h-[200px]"><Doughnut data={doughnutData} options={C} /></div>
        </div>
        <div className="bg-white rounded-2xl border border-[#EDE8DC] p-5" style={{ boxShadow: '0 2px 16px rgba(180,150,60,0.1)' }}>
          <h4 className="font-display text-[13px] mb-3">Monthly Spending Trend</h4>
          <div className="relative h-[200px]"><Line data={lineData} options={LC} /></div>
        </div>
      </div>

      {/* Transactions table */}
      <div className="bg-white rounded-2xl border border-[#EDE8DC] p-5" style={{ boxShadow: '0 2px 16px rgba(180,150,60,0.1)' }}>
        <h4 className="font-display text-[13px] mb-3">UOB Transactions</h4>
        <div className="overflow-y-auto max-h-[400px] border border-[#EDE8DC] rounded-xl">
          <table className="w-full border-collapse text-[13px]">
            <thead className="sticky top-0 z-10"><tr>
              {['Date','Description','Category','Amount','Actions'].map(h => (
                <th key={h} className="bg-[#FAF3DC] text-[#9C7A2E] font-semibold text-[11px] tracking-[0.8px] uppercase px-3.5 py-2.5 text-left">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {sorted.length === 0
                ? <tr><td colSpan={5} className="text-center text-[#A89E8C] py-6">No transactions yet</td></tr>
                : sorted.map(r => (
                  <tr key={r.id} className="hover:bg-[#FDFAF2]">
                    <td className="px-3.5 py-2.5 border-b border-[#EDE8DC] text-[#6B6355]">{r.date}</td>
                    <td className="px-3.5 py-2.5 border-b border-[#EDE8DC] text-[#2C2A25]">{r.description}</td>
                    <td className="px-3.5 py-2.5 border-b border-[#EDE8DC]">
                      <span className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white" style={{ background: CAT_COLORS[r.category] || '#999' }}>{r.category}</span>
                    </td>
                    <td className="px-3.5 py-2.5 border-b border-[#EDE8DC] font-bold text-[#E05C5C]">- {fmt(r.amount)}</td>
                    <td className="px-3.5 py-2.5 border-b border-[#EDE8DC]">
                      <div className="flex gap-1.5">
                        <EditBtn onClick={() => setEditRec(r)} />
                        <BtnDanger onClick={() => handleDelete(r.id)} className="py-1 px-2.5 text-[11px]">Del</BtnDanger>
                      </div>
                    </td>
                  </tr>
                ))
              }
            </tbody>
            {sorted.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={3} className="px-3.5 py-2.5 text-[12px] font-bold text-[#6B6355] bg-[#FAF3DC]">Total</td>
                  <td colSpan={2} className="px-3.5 py-2.5 text-[13px] font-bold text-[#E05C5C] bg-[#FAF3DC]">- {fmt(totalSpent)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Modals */}
      <EditTransactionModal open={!!editRec} onClose={() => setEditRec(null)} record={editRec} onSave={handleEdit} />

      <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} title="Export Credit Card Statement"
        bankLabel="UOB Credit Card"
        onExport={({ year, month }) => exportCreditPDF({ records, settings, year, month })} />

      {/* Add Expense */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Credit Card Expense">
        <form onSubmit={handleAdd} className="flex flex-col gap-3.5">
          {limit > 0 && (
            <div className="bg-[#FFEBEE] rounded-xl px-4 py-3 border border-[#FFCDD2]">
              <p className="text-xs text-[#E05C5C]">Available Credit</p>
              <p className="text-[18px] font-bold text-[#E05C5C] font-display">{fmt(available)}</p>
            </div>
          )}
          <FormInput label="Description" value={form.description} onChange={e => setF('description', e.target.value)} placeholder="e.g. Lunch, Shopping" required />
          <FormSelect label="Category" value={form.category} onChange={e => setF('category', e.target.value)}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </FormSelect>
          <FormInput label="Amount (RM)" type="number" step="0.01" min="0.01" value={form.amount} onChange={e => setF('amount', e.target.value)} placeholder="0.00" required />
          <FormInput label="Date" type="date" value={form.date} onChange={e => setF('date', e.target.value)} required />
          <BtnGold type="submit" disabled={saving} className="justify-center mt-1">{saving ? 'Saving…' : 'Add Expense'}</BtnGold>
        </form>
      </Modal>

      {/* Credit Settings */}
      <Modal open={cfgOpen} onClose={() => setCfgOpen(false)} title="UOB Credit Card Settings">
        <form onSubmit={handleSaveSettings} className="flex flex-col gap-3.5">
          <FormInput label="Credit Limit (RM)" type="number" step="0.01" min="0" value={cfg.limit} onChange={e => setC('limit', e.target.value)} placeholder="e.g. 10000" required />
          <FormInput label="Payment Due Day" type="number" min="1" max="31" value={cfg.due_day} onChange={e => setC('due_day', e.target.value)} placeholder="e.g. 15" required />
          <FormInput label="Reminder Email" type="email" value={cfg.email} onChange={e => setC('email', e.target.value)} placeholder="your@email.com" />
          <BtnGold type="submit" disabled={saving} className="justify-center mt-1">{saving ? 'Saving…' : 'Save Settings'}</BtnGold>
        </form>
      </Modal>
    </div>
  )
}
