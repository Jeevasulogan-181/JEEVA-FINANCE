import { useContext, useState } from 'react'
import { Plus, FileDown, Pencil } from 'lucide-react'
import { Line, Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, LineElement, PointElement, CategoryScale, LinearScale, Filler, Tooltip, Legend } from 'chart.js'
import { RecordsContext, ToastContext } from '../../pages/Dashboard'
import { createRecord, deleteRecord, updateRecord } from '../../lib/db'
import { fmt, today } from '../../lib/utils'
import Modal from '../ui/Modal'
import { BtnGold, BtnDanger } from '../ui/Button'
import { FormInput, FormSelect } from '../ui/FormField'
import ExportModal from '../ui/ExportModal'
import EditTransactionModal from '../ui/EditTransactionModal'
import { exportSavingsPDF } from '../../lib/exportPdf'

ChartJS.register(ArcElement, LineElement, PointElement, CategoryScale, LinearScale, Filler, Tooltip, Legend)

const C  = { responsive:true, maintainAspectRatio:false, plugins:{ legend:{ labels:{ font:{family:'Lato',size:11}, color:'#6B6355', boxWidth:12 } } } }
const LC = { ...C, scales:{ x:{ticks:{color:'#A89E8C',font:{size:10}},grid:{color:'#EDE8DC'}}, y:{ticks:{color:'#A89E8C',font:{size:10},callback:v=>'RM'+v.toLocaleString()},grid:{color:'#EDE8DC'}} } }

function EditBtn({ onClick }) {
  return (
    <button onClick={onClick}
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-[#9C7A2E] bg-[#FAF3DC] border border-[#F0D98C] hover:bg-[#F0D98C] transition-colors">
      <Pencil size={11} /> Edit
    </button>
  )
}

function BankPanel({ bank, records, onDelete, onEdit }) {
  const recs  = [...records.filter(r => r.type === 'savings_transaction' && r.bank === bank)]
  const label = bank === 'bsn' ? 'BSN' : 'Standard Chartered'
  let deposits = 0, withdrawals = 0
  recs.forEach(r => { const a = parseFloat(r.amount||0); if (r.transaction_type==='deposit') deposits+=a; else withdrawals+=a })
  const sorted = [...recs].sort((a,b) => new Date(a.date)-new Date(b.date))
  let running = 0
  const lineData = { labels: sorted.map(r=>r.date), datasets: [{ label:'Balance', data: sorted.map(r => { running += r.transaction_type==='deposit'?parseFloat(r.amount||0):-parseFloat(r.amount||0); return running }), borderColor:'#C9A84C', backgroundColor:'rgba(201,168,76,0.12)', fill:true, tension:0.4, pointRadius:3 }] }
  const pieData  = { labels:['Deposits','Withdrawals'], datasets:[{ data:[deposits,withdrawals], backgroundColor:['#66BB6A','#E05C5C'], borderWidth:0 }] }
  const desc = [...recs].sort((a,b) => new Date(b.date)-new Date(a.date)).slice(0,10)

  return (
    <>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[['Balance','#388E3C',deposits-withdrawals],['Total Deposits','#3BAF7E',deposits],['Withdrawals','#E05C5C',withdrawals]].map(([l,col,v]) => (
          <div key={l} className="bg-white rounded-2xl border border-[#EDE8DC] px-5 py-4" style={{ boxShadow:'0 2px 12px rgba(180,150,60,0.1)' }}>
            <p className="text-[12px] text-[#A89E8C]">{l}</p>
            <p className="font-display text-[22px] font-bold" style={{ color:col }}>{fmt(v)}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-2xl border border-[#EDE8DC] p-5" style={{ boxShadow:'0 2px 16px rgba(180,150,60,0.1)' }}>
          <h4 className="font-display text-[13px] mb-2.5">Savings Growth</h4>
          <div className="relative h-[200px]"><Line data={lineData} options={LC} /></div>
        </div>
        <div className="bg-white rounded-2xl border border-[#EDE8DC] p-5" style={{ boxShadow:'0 2px 16px rgba(180,150,60,0.1)' }}>
          <h4 className="font-display text-[13px] mb-2.5">Transaction Types</h4>
          <div className="relative h-[200px]"><Doughnut data={pieData} options={C} /></div>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-[#EDE8DC] p-5" style={{ boxShadow:'0 2px 16px rgba(180,150,60,0.1)' }}>
        <h4 className="font-display text-[13px] mb-3">{label} Transactions</h4>
        <div className="overflow-y-auto max-h-[350px] border border-[#EDE8DC] rounded-xl">
          <table className="w-full border-collapse text-[13px]">
            <thead className="sticky top-0 z-10"><tr>
              {['Date','Description','Type','Amount','Actions'].map(h=>(
                <th key={h} className="bg-[#FAF3DC] text-[#9C7A2E] font-semibold text-[11px] tracking-[0.8px] uppercase px-3.5 py-2.5 text-left">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {desc.length===0 ? <tr><td colSpan={5} className="text-center text-[#A89E8C] py-6">No transactions</td></tr>
              : desc.map(r => (
                <tr key={r.id} className="hover:bg-[#FDFAF2]">
                  <td className="px-3.5 py-2.5 border-b border-[#EDE8DC] text-[#6B6355]">{r.date}</td>
                  <td className="px-3.5 py-2.5 border-b border-[#EDE8DC] text-[#6B6355]">{r.description}</td>
                  <td className="px-3.5 py-2.5 border-b border-[#EDE8DC]">
                    <span className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={{ background:r.transaction_type==='deposit'?'#E8F5E9':'#FFEBEE', color:r.transaction_type==='deposit'?'#388E3C':'#E05C5C' }}>{r.transaction_type}</span>
                  </td>
                  <td className={`px-3.5 py-2.5 border-b border-[#EDE8DC] font-semibold ${r.transaction_type==='deposit'?'text-[#3BAF7E]':'text-[#E05C5C]'}`}>
                    {r.transaction_type==='deposit'?'+':'-'} {fmt(r.amount)}
                  </td>
                  <td className="px-3.5 py-2.5 border-b border-[#EDE8DC]">
                    <div className="flex gap-1.5">
                      <EditBtn onClick={() => onEdit(r)} />
                      <BtnDanger onClick={() => onDelete(r.id)} className="py-1 px-2.5 text-[11px]">Del</BtnDanger>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

export default function Savings() {
  const { records, reload } = useContext(RecordsContext)
  const addToast = useContext(ToastContext)
  const [activeBank, setActiveBank] = useState('bsn')
  const [modalOpen,  setModalOpen]  = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [editRec,    setEditRec]    = useState(null)
  const [saving,     setSaving]     = useState(false)
  const [form, setForm] = useState({ bank:'bsn', type:'deposit', desc:'', amount:'', date:today() })
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  async function handleSubmit(e) {
    e.preventDefault(); setSaving(true)
    try {
      await createRecord({ type:'savings_transaction', bank:form.bank, transaction_type:form.type, description:form.desc, amount:parseFloat(form.amount), date:form.date, category:form.type==='deposit'?'Deposit':'Withdrawal' })
      await reload(); setModalOpen(false); addToast('Savings transaction added!','success')
      setForm({ bank:'bsn', type:'deposit', desc:'', amount:'', date:today() })
    } catch(err) { addToast(err.message,'error') }
    setSaving(false)
  }

  async function handleEdit(id, updates) {
    try { await updateRecord(id, updates); await reload(); addToast('Updated!','success') }
    catch(err) { addToast(err.message,'error') }
  }

  async function handleDelete(id) {
    try { await deleteRecord(id); await reload(); addToast('Deleted.','success') }
    catch(err) { addToast(err.message,'error') }
  }

  return (
    <div className="section-enter">
      <div className="flex items-center justify-between mb-5">
        <div><h2 className="font-display text-[22px]">Savings</h2><p className="text-[13px] text-[#A89E8C] mt-0.5">Track your savings growth</p></div>
        <div className="flex gap-2.5">
          <BtnGold onClick={() => setExportOpen(true)} style={{ background:'linear-gradient(135deg,#6B6355,#2C2A25)' }}><FileDown size={14}/> Export PDF</BtnGold>
          <BtnGold onClick={() => setModalOpen(true)}><Plus size={14}/> Add Transaction</BtnGold>
        </div>
      </div>
      <div className="flex gap-2.5 mb-5">
        {['bsn','sc'].map(b=>(
          <button key={b} onClick={() => setActiveBank(b)}
            className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-all border ${activeBank===b?'bg-gradient-to-br from-[#F0D98C] to-[#C9A84C] text-white border-[#C9A84C] font-semibold':'bg-white text-[#6B6355] border-[#EDE8DC] hover:bg-[#FAF3DC]'}`}>
            {b==='bsn'?'BSN':'Standard Chartered'}
          </button>
        ))}
      </div>

      <BankPanel bank={activeBank} records={records} onDelete={handleDelete} onEdit={r => setEditRec(r)} />

      <EditTransactionModal open={!!editRec} onClose={() => setEditRec(null)} record={editRec} onSave={handleEdit} />
      <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} title="Export Savings Statement"
        bankLabel={activeBank==='bsn'?'BSN':'Standard Chartered'}
        onExport={({ year, month }) => exportSavingsPDF({ records, year, month, bank: activeBank })} />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Savings Transaction">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <FormSelect label="Savings Bank" value={form.bank} onChange={e=>set('bank',e.target.value)}><option value="bsn">BSN</option><option value="sc">Standard Chartered</option></FormSelect>
          <FormSelect label="Type" value={form.type} onChange={e=>set('type',e.target.value)}><option value="deposit">Deposit</option><option value="withdrawal">Withdrawal</option></FormSelect>
          <FormInput label="Description" value={form.desc} onChange={e=>set('desc',e.target.value)} placeholder="Description" required />
          <FormInput label="Amount (RM)" type="number" step="0.01" min="0.01" value={form.amount} onChange={e=>set('amount',e.target.value)} placeholder="0.00" required />
          <FormInput label="Date" type="date" value={form.date} onChange={e=>set('date',e.target.value)} required />
          <BtnGold type="submit" disabled={saving} className="justify-center mt-1">{saving?'Saving…':'Add Transaction'}</BtnGold>
        </form>
      </Modal>
    </div>
  )
}
