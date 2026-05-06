import { useContext, useState } from 'react'
import { Plus, FileDown, Pencil } from 'lucide-react'
import { Bar, Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js'
import { RecordsContext, ToastContext } from '../../pages/Dashboard'
import { createRecord, deleteRecord, updateRecord } from '../../lib/db'
import { setBudget } from '../../lib/dailyExpensesDb'
import { fmt, monthlyExpenses, categorySums, CAT_COLORS, today } from '../../lib/utils'
import Modal from '../ui/Modal'
import { BtnGold, BtnDanger } from '../ui/Button'
import { FormInput, FormSelect } from '../ui/FormField'
import ExportModal from '../ui/ExportModal'
import EditTransactionModal from '../ui/EditTransactionModal'
import { exportIncomePDF } from '../../lib/exportPdf'

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend)

const C  = { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { font: { family: 'Lato', size: 11 }, color: '#6B6355', boxWidth: 12 } } } }
const BC = { ...C, scales: { x: { ticks: { color: '#A89E8C', font: { size: 10 } }, grid: { color: '#EDE8DC' } }, y: { ticks: { color: '#A89E8C', font: { size: 10 }, callback: v => 'RM' + v.toLocaleString() }, grid: { color: '#EDE8DC' } } } }

const TYPES = [
  { value: 'income',   label: 'Income' },
  { value: 'expense',  label: 'Expense' },
  { value: 'savings',  label: 'Transfer to Savings' },
  { value: 'gxbank',   label: '💳 Transfer to GXBank (Daily Expenses)' },
]

function EditBtn({ onClick }) {
  return (
    <button onClick={onClick}
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-[#9C7A2E] bg-[#FAF3DC] border border-[#F0D98C] hover:bg-[#F0D98C] transition-colors">
      <Pencil size={11} /> Edit
    </button>
  )
}

function BankPanel({ bank, records, onDelete, onEdit }) {
  const recs  = records.filter(r => r.type === 'income_transaction' && r.bank === bank)
  const label = bank === 'cimb' ? 'CIMB' : 'Public Bank'
  let income = 0, expenses = 0, savings = 0
  recs.forEach(r => {
    const a = parseFloat(r.amount || 0)
    if (r.transaction_type === 'income')   income   += a
    else if (r.transaction_type === 'expense') expenses += a
    else if (r.transaction_type === 'savings' || r.transaction_type === 'gxbank') savings += a
  })
  const balance = income - expenses - savings  // gxbank transfers already included in savings
  const cats  = categorySums(recs.filter(r => r.transaction_type === 'expense'))
  const mo    = monthlyExpenses(recs)
  const ck    = Object.keys(cats)
  const sorted = [...recs].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10)

  const typeLabel = (t) => {
    if (t === 'income')  return { label: 'income',   bg: '#E8F5E9', color: '#388E3C' }
    if (t === 'expense') return { label: 'expense',  bg: '#FFEBEE', color: '#E05C5C' }
    if (t === 'savings') return { label: 'savings',  bg: '#FFF3E0', color: '#E08030' }
    if (t === 'gxbank')  return { label: '→ GXBank', bg: '#E3F2FD', color: '#1565C0' }
    return { label: t, bg: '#F5F5F5', color: '#666' }
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[['Total Income','#3BAF7E',income],['Total Expenses','#E05C5C',expenses],['Balance','#9C7A2E',balance]].map(([l,col,v]) => (
          <div key={l} className="bg-white rounded-2xl border border-[#EDE8DC] px-5 py-4" style={{ boxShadow:'0 2px 12px rgba(180,150,60,0.1)' }}>
            <p className="text-[12px] text-[#A89E8C]">{l}</p>
            <p className="font-display text-[22px] font-bold" style={{ color:col }}>{fmt(v)}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-2xl border border-[#EDE8DC] p-5" style={{ boxShadow:'0 2px 16px rgba(180,150,60,0.1)' }}>
          <h4 className="font-display text-[13px] mb-2.5">Income vs Expenses</h4>
          <div className="relative h-[200px]">
            <Bar data={{ labels: mo.map(m=>m.label), datasets: [{ label:'Income', data:mo.map(m=>m.totalIncome), backgroundColor:'rgba(59,175,126,0.8)', borderRadius:4 },{ label:'Expenses', data:mo.map(m=>m.total), backgroundColor:'rgba(201,168,76,0.8)', borderRadius:4 }] }} options={BC} />
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-[#EDE8DC] p-5" style={{ boxShadow:'0 2px 16px rgba(180,150,60,0.1)' }}>
          <h4 className="font-display text-[13px] mb-2.5">Category Breakdown</h4>
          <div className="relative h-[200px]">
            <Doughnut data={{ labels:ck.length?ck:['No Data'], datasets:[{ data:ck.length?ck.map(k=>cats[k]):[1], backgroundColor:ck.length?ck.map(k=>CAT_COLORS[k]||'#CCC'):['#EEE'], borderWidth:0 }] }} options={C} />
          </div>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-[#EDE8DC] p-5" style={{ boxShadow:'0 2px 16px rgba(180,150,60,0.1)' }}>
        <h4 className="font-display text-[13px] mb-3">{label} Transactions</h4>
        <div className="overflow-y-auto max-h-[350px] border border-[#EDE8DC] rounded-xl">
          <table className="w-full border-collapse text-[13px]">
            <thead className="sticky top-0 z-10"><tr>
              {['Date','Description','Category','Type','Amount','Actions'].map(h => (
                <th key={h} className="bg-[#FAF3DC] text-[#9C7A2E] font-semibold text-[11px] tracking-[0.8px] uppercase px-3.5 py-2.5 text-left">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {sorted.length === 0
                ? <tr><td colSpan={6} className="text-center text-[#A89E8C] py-6">No transactions</td></tr>
                : sorted.map(r => {
                  const tl = typeLabel(r.transaction_type)
                  const isPos = r.transaction_type === 'income'
                  return (
                    <tr key={r.id} className="hover:bg-[#FDFAF2]">
                      <td className="px-3.5 py-2.5 border-b border-[#EDE8DC] text-[#6B6355]">{r.date}</td>
                      <td className="px-3.5 py-2.5 border-b border-[#EDE8DC] text-[#2C2A25]">{r.description}</td>
                      <td className="px-3.5 py-2.5 border-b border-[#EDE8DC] text-[#6B6355]">{r.category}</td>
                      <td className="px-3.5 py-2.5 border-b border-[#EDE8DC]">
                        <span className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={{ background: tl.bg, color: tl.color }}>{tl.label}</span>
                      </td>
                      <td className={`px-3.5 py-2.5 border-b border-[#EDE8DC] font-semibold ${isPos ? 'text-[#3BAF7E]' : 'text-[#E05C5C]'}`}>
                        {isPos ? '+' : '-'} {fmt(r.amount)}
                      </td>
                      <td className="px-3.5 py-2.5 border-b border-[#EDE8DC]">
                        <div className="flex gap-1.5">
                          <EditBtn onClick={() => onEdit(r)} />
                          <BtnDanger onClick={() => onDelete(r.id)} className="py-1 px-2.5 text-[11px]">Del</BtnDanger>
                        </div>
                      </td>
                    </tr>
                  )
                })
              }
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

export default function Income() {
  const { records, reload } = useContext(RecordsContext)
  const addToast = useContext(ToastContext)
  const [activeBank,  setActiveBank]  = useState('cimb')
  const [modalOpen,   setModalOpen]   = useState(false)
  const [exportOpen,  setExportOpen]  = useState(false)
  const [editRec,     setEditRec]     = useState(null)
  const [saving,      setSaving]      = useState(false)
  const [form, setForm] = useState({
    bank: 'cimb', type: 'income', savingsTarget: 'bsn',
    desc: '', category: 'Salary', amount: '', date: today(),
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const showSavings = form.type === 'savings'
  const showGXBank  = form.type === 'gxbank'

  async function handleSubmit(e) {
    e.preventDefault(); setSaving(true)
    try {
      const now   = new Date(form.date)
      const month = now.getMonth() + 1
      const year  = now.getFullYear()
      const amt   = parseFloat(form.amount)

      // Always create the income record
      await createRecord({
        type:             'income_transaction',
        bank:             form.bank,
        transaction_type: form.type,
        category:         form.type === 'gxbank' ? 'Daily Budget' : form.category,
        description:      form.type === 'gxbank'
          ? `GXBank transfer — Daily expenses ${new Date(form.date).toLocaleDateString('en-MY',{month:'long',year:'numeric'})}`
          : form.desc,
        amount:           amt,
        date:             form.date,
        savings_target:   form.type === 'savings' ? form.savingsTarget : '',
      })

      // If savings — also create deposit in savings section
      if (form.type === 'savings') {
        await createRecord({
          type:             'savings_transaction',
          bank:             form.savingsTarget,
          transaction_type: 'deposit',
          description:      `Transfer from ${form.bank === 'cimb' ? 'CIMB' : 'Public Bank'}`,
          category:         'Transfer',
          amount:           amt,
          date:             form.date,
        })
      }

      // If GXBank — set/update the monthly budget for that month
      if (form.type === 'gxbank') {
        await setBudget({
          month:         month,
          year:          year,
          budget_amount: amt,
          from_bank:     form.bank,
          notes:         form.desc || `Monthly daily expenses budget`,
        })
      }

      await reload()
      setModalOpen(false)
      addToast(
        form.type === 'gxbank'
          ? `RM${amt.toFixed(2)} transferred to GXBank & budget set!`
          : 'Transaction added!',
        'success'
      )
      setForm({ bank: 'cimb', type: 'income', savingsTarget: 'bsn', desc: '', category: 'Salary', amount: '', date: today() })
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
      <div className="flex items-center justify-between mb-5">
        <div><h2 className="font-display text-[22px]">Income</h2><p className="text-[13px] text-[#A89E8C] mt-0.5">Manage your income accounts</p></div>
        <div className="flex gap-2.5">
          <BtnGold onClick={() => setExportOpen(true)} style={{ background:'linear-gradient(135deg,#6B6355,#2C2A25)' }}><FileDown size={14}/> Export PDF</BtnGold>
          <BtnGold onClick={() => setModalOpen(true)}><Plus size={14}/> Add Transaction</BtnGold>
        </div>
      </div>

      <div className="flex gap-2.5 mb-5">
        {['cimb','public'].map(b => (
          <button key={b} onClick={() => setActiveBank(b)}
            className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-all border ${activeBank===b?'bg-gradient-to-br from-[#F0D98C] to-[#C9A84C] text-white border-[#C9A84C] font-semibold':'bg-white text-[#6B6355] border-[#EDE8DC] hover:bg-[#FAF3DC]'}`}>
            {b==='cimb'?'CIMB':'Public Bank'}
          </button>
        ))}
      </div>

      <BankPanel bank={activeBank} records={records} onDelete={handleDelete} onEdit={r => setEditRec(r)} />

      <EditTransactionModal open={!!editRec} onClose={() => setEditRec(null)} record={editRec} onSave={handleEdit} />

      <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} title="Export Income Statement"
        bankLabel={activeBank==='cimb'?'CIMB Bank':'Public Bank'}
        onExport={({ year, month }) => exportIncomePDF({ records, year, month, bank: activeBank })} />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Income Transaction">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <FormSelect label="Bank" value={form.bank} onChange={e => set('bank', e.target.value)}>
            <option value="cimb">CIMB</option>
            <option value="public">Public Bank</option>
          </FormSelect>

          <FormSelect label="Type" value={form.type} onChange={e => set('type', e.target.value)}>
            {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </FormSelect>

          {/* Savings bank selector */}
          {showSavings && (
            <FormSelect label="Savings Bank" value={form.savingsTarget} onChange={e => set('savingsTarget', e.target.value)}>
              <option value="bsn">BSN</option>
              <option value="sc">Standard Chartered</option>
            </FormSelect>
          )}

          {/* GXBank info banner */}
          {showGXBank && (
            <div className="rounded-xl p-4 border" style={{ background: 'linear-gradient(135deg,#E3F2FD,#BBDEFB)', borderColor: '#90CAF9' }}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-lg">💳</span>
                <p className="text-[13px] font-bold text-[#1565C0]">GXBank Daily Expenses</p>
              </div>
              <p className="text-[12px] text-[#1976D2]">
                This will record a withdrawal from your income bank and automatically set your GXBank monthly budget for the selected month. You can then track your daily spending in the <strong>Daily Expenses</strong> section.
              </p>
            </div>
          )}

          {/* Description — hide for GXBank (auto-filled) */}
          {!showGXBank && (
            <FormInput label="Description" value={form.desc} onChange={e => set('desc', e.target.value)}
              placeholder="e.g. Salary, Groceries" required />
          )}
          {showGXBank && (
            <FormInput label="Notes (optional)" value={form.desc} onChange={e => set('desc', e.target.value)}
              placeholder="e.g. May 2026 daily expenses budget" />
          )}

          {/* Category — hide for GXBank */}
          {!showGXBank && (
            <FormSelect label="Category" value={form.category} onChange={e => set('category', e.target.value)}>
              {['Salary','Business','Food','Transport','Utilities','Entertainment','Healthcare','Shopping','Other'].map(c => <option key={c}>{c}</option>)}
            </FormSelect>
          )}

          <FormInput label="Amount (RM)" type="number" step="0.01" min="0.01" value={form.amount}
            onChange={e => set('amount', e.target.value)} placeholder="0.00" required />

          <FormInput label="Date" type="date" value={form.date} onChange={e => set('date', e.target.value)} required />

          {showGXBank && (
            <div className="bg-[#E8F5E9] rounded-xl px-4 py-3 border border-[#C8E6C9] text-[12px] text-[#2E7D32]">
              ✅ The month will be auto-detected from the date above.
            </div>
          )}

          <BtnGold type="submit" disabled={saving} className="justify-center mt-1">
            {saving ? 'Saving…' : showGXBank ? '💳 Transfer to GXBank' : 'Add Transaction'}
          </BtnGold>
        </form>
      </Modal>
    </div>
  )
}