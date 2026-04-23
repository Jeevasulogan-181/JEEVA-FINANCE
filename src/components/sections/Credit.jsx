import { useContext, useState } from 'react'
import { Plus, Settings, FileDown } from 'lucide-react'
import { Bar, Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js'
import { RecordsContext, ToastContext } from '../../pages/Dashboard'
import { createRecord, deleteRecord, saveSettings } from '../../lib/db'
import { fmt, monthlyExpenses, categorySums, CAT_COLORS, today } from '../../lib/utils'
import Modal from '../ui/Modal'
import { BtnGold, BtnOutline, BtnDanger } from '../ui/Button'
import { FormInput, FormSelect } from '../ui/FormField'
import ExportModal from '../ui/ExportModal'
import { exportCreditPDF } from '../../lib/exportPdf'

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend)

const chartOpts = { responsive:true, maintainAspectRatio:false, plugins:{ legend:{ labels:{ font:{family:'Lato',size:11}, color:'#6B6355', boxWidth:12 } } } }
const barOpts   = { ...chartOpts, scales:{ x:{ticks:{color:'#A89E8C',font:{size:10}},grid:{color:'#EDE8DC'}}, y:{ticks:{color:'#A89E8C',font:{size:10},callback:v=>'RM'+v.toLocaleString()},grid:{color:'#EDE8DC'}} } }

export default function Credit() {
  const { records, settings, setSettings, reload } = useContext(RecordsContext)
  const addToast = useContext(ToastContext)
  const [addOpen,  setAddOpen]  = useState(false)
  const [cfgOpen,  setCfgOpen]  = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [saving,   setSaving]   = useState(false)

  const [form, setForm] = useState({ desc:'', category:'Food', amount:'', date:today() })
  const [cfg,  setCfg]  = useState({ limit: settings.limit, due_day: settings.due_day, email: settings.email || 'jeevasulogan181@gmail.com' })
  const set  = (k,v) => setForm(f=>({...f,[k]:v}))
  const setC = (k,v) => setCfg(f=>({...f,[k]:v}))

  const recs   = records.filter(r=>r.type==='credit_transaction')
  const spent  = recs.reduce((s,r)=>s+parseFloat(r.amount||0),0)
  const limit  = settings.limit
  const avail  = limit - spent
  const pct    = limit>0 ? Math.min((spent/limit)*100,100) : 0
  const mo     = monthlyExpenses(recs)
  const cats   = categorySums(recs)
  const ck     = Object.keys(cats)

  const barData = { labels:mo.map(m=>m.label), datasets:[{ label:'Spending', data:mo.map(m=>m.total), backgroundColor:'rgba(224,92,92,0.8)', borderRadius:6 }] }
  const pieData = { labels:ck.length?ck:['No Data'], datasets:[{ data:ck.length?ck.map(k=>cats[k]):[1], backgroundColor:ck.length?ck.map(k=>CAT_COLORS[k]||'#CCC'):['#EEE'], borderWidth:0 }] }

  async function handleAdd(e) {
    e.preventDefault(); setSaving(true)
    try {
      await createRecord({ type:'credit_transaction', bank:'uob', transaction_type:'expense', description:form.desc, category:form.category, amount:parseFloat(form.amount), date:form.date })
      await reload(); setAddOpen(false); addToast('Expense added!','success')
      setForm({ desc:'', category:'Food', amount:'', date:today() })
    } catch(err){ addToast(err.message,'error') }
    setSaving(false)
  }

  async function handleSaveCfg(e) {
    e.preventDefault(); setSaving(true)
    try {
      await saveSettings({ limit:parseFloat(cfg.limit), due_day:parseInt(cfg.due_day), email:cfg.email })
      setSettings({ limit:parseFloat(cfg.limit), due_day:parseInt(cfg.due_day), email:cfg.email })
      setCfgOpen(false); addToast('Settings saved!','success')
    } catch(err){ addToast(err.message,'error') }
    setSaving(false)
  }

  async function handleDelete(id) {
    try { await deleteRecord(id); await reload(); addToast('Deleted.','success') }
    catch(err){ addToast(err.message,'error') }
  }

  return (
    <div className="section-enter">
      <div className="flex items-center justify-between mb-5">
        <div><h2 className="font-display text-[22px]">Credit Card</h2><p className="text-[13px] text-[#A89E8C] mt-0.5">UOB Credit Card Management</p></div>
        <div className="flex gap-2.5">
          <BtnGold onClick={() => setExportOpen(true)} style={{background:'linear-gradient(135deg,#6B6355,#2C2A25)'}}><FileDown size={14}/> Export PDF</BtnGold>
          <BtnOutline onClick={()=>{ setCfg({limit:settings.limit,due_day:settings.due_day,email:settings.email}); setCfgOpen(true) }}><Settings size={13}/> Set Limit</BtnOutline>
          <BtnGold onClick={()=>setAddOpen(true)}><Plus size={14}/> Add Expense</BtnGold>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[['Credit Limit','#2C2A25',fmt(limit)],['Available','#3BAF7E',fmt(avail)],['Total Spent','#E05C5C',fmt(spent)],['Due Day','#2C2A25',`${settings.due_day}th`]].map(([lbl,col,val])=>(
          <div key={lbl} className="bg-white rounded-2xl border border-[#EDE8DC] px-5 py-4" style={{boxShadow:'0 2px 12px rgba(180,150,60,0.1)'}}>
            <p className="text-[12px] text-[#A89E8C]">{lbl}</p>
            <p className="font-display text-[22px] font-bold" style={{color:col}}>{val}</p>
          </div>
        ))}
      </div>

      {/* Utilization bar */}
      <div className="bg-white rounded-2xl border border-[#EDE8DC] p-5 mb-4" style={{boxShadow:'0 2px 16px rgba(180,150,60,0.1)'}}>
        <div className="flex justify-between mb-2">
          <span className="text-[13px] font-semibold">Credit Utilization</span>
          <span className="text-[13px] text-[#6B6355]">{pct.toFixed(1)}% used</span>
        </div>
        <div className="h-2 bg-[#EDE8DC] rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500" style={{ width:`${pct}%`, background: pct>70?'linear-gradient(90deg,#FFAB9A,#E05C5C)':'linear-gradient(90deg,#F0D98C,#C9A84C)' }}/>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-2xl border border-[#EDE8DC] p-5" style={{boxShadow:'0 2px 16px rgba(180,150,60,0.1)'}}><h4 className="font-display text-[13px] mb-2.5">Monthly Spend</h4><div className="relative h-[200px]"><Bar data={barData} options={barOpts}/></div></div>
        <div className="bg-white rounded-2xl border border-[#EDE8DC] p-5" style={{boxShadow:'0 2px 16px rgba(180,150,60,0.1)'}}><h4 className="font-display text-[13px] mb-2.5">By Category</h4><div className="relative h-[200px]"><Doughnut data={pieData} options={chartOpts}/></div></div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#EDE8DC] p-5" style={{boxShadow:'0 2px 16px rgba(180,150,60,0.1)'}}>
        <h4 className="font-display text-[13px] mb-3">UOB Transaction History</h4>
        <div className="overflow-y-auto max-h-[350px] border border-[#EDE8DC] rounded-xl">
          <table className="w-full border-collapse text-[13px]">
            <thead className="sticky top-0 z-10"><tr>{['Date','Description','Category','Amount',''].map(h=><th key={h} className="bg-[#FAF3DC] text-[#9C7A2E] font-semibold text-[11px] tracking-[0.8px] uppercase px-3.5 py-2.5 text-left">{h}</th>)}</tr></thead>
            <tbody>
              {[...recs].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,10).map(r=>(
                <tr key={r.id} className="hover:bg-[#FDFAF2]">
                  <td className="px-3.5 py-2.5 border-b border-[#EDE8DC] text-[#6B6355]">{r.date}</td>
                  <td className="px-3.5 py-2.5 border-b border-[#EDE8DC] text-[#6B6355]">{r.description}</td>
                  <td className="px-3.5 py-2.5 border-b border-[#EDE8DC] text-[#6B6355]">{r.category}</td>
                  <td className="px-3.5 py-2.5 border-b border-[#EDE8DC] font-semibold text-[#E05C5C]">- {fmt(r.amount)}</td>
                  <td className="px-3.5 py-2.5 border-b border-[#EDE8DC]"><BtnDanger onClick={()=>handleDelete(r.id)}>Del</BtnDanger></td>
                </tr>
              ))}
              {recs.length===0&&<tr><td colSpan={5} className="text-center text-[#A89E8C] py-6">No expenses yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export Modal */}
      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title="Export Credit Card Statement"
        bankLabel="UOB Credit Card"
        onExport={({ year, month }) => exportCreditPDF({ records, settings, year, month })}
      />

      {/* Add Expense Modal */}
      <Modal open={addOpen} onClose={()=>setAddOpen(false)} title="Add Credit Card Expense">
        <form onSubmit={handleAdd} className="flex flex-col gap-3.5">
          <FormInput label="Description" value={form.desc} onChange={e=>set('desc',e.target.value)} placeholder="e.g. Dining, Shopping" required/>
          <FormSelect label="Category" value={form.category} onChange={e=>set('category',e.target.value)}>{['Food','Shopping','Transport','Entertainment','Utilities','Healthcare','Travel','Other'].map(c=><option key={c}>{c}</option>)}</FormSelect>
          <FormInput label="Amount (RM)" type="number" step="0.01" min="0.01" value={form.amount} onChange={e=>set('amount',e.target.value)} placeholder="0.00" required/>
          <FormInput label="Date" type="date" value={form.date} onChange={e=>set('date',e.target.value)} required/>
          <BtnGold type="submit" disabled={saving} className="justify-center mt-1">{saving?'Saving…':'Add Expense'}</BtnGold>
        </form>
      </Modal>

      {/* Settings Modal */}
      <Modal open={cfgOpen} onClose={()=>setCfgOpen(false)} title="UOB Credit Settings">
        <form onSubmit={handleSaveCfg} className="flex flex-col gap-3.5">
          <FormInput label="Credit Limit (RM)" type="number" step="0.01" min="0" value={cfg.limit} onChange={e=>setC('limit',e.target.value)} placeholder="10000.00" required/>
          <FormInput label="Due Date (Day of Month)" type="number" min="1" max="31" value={cfg.due_day} onChange={e=>setC('due_day',e.target.value)} placeholder="15" required/>
          <FormInput label="Reminder Email" type="email" value={cfg.email} onChange={e=>setC('email',e.target.value)} placeholder="your@email.com"/>
          <BtnGold type="submit" disabled={saving} className="justify-center mt-1">{saving?'Saving…':'Save Settings'}</BtnGold>
        </form>
      </Modal>
    </div>
  )
}
