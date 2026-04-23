import { useContext, useState } from 'react'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { RecordsContext, ToastContext } from '../../pages/Dashboard'
import { createRecord, deleteRecord } from '../../lib/db'
import { getMonthLabel, today } from '../../lib/utils'
import Modal from '../ui/Modal'
import { BtnGold, BtnDanger } from '../ui/Button'
import { FormInput, FormTextarea } from '../ui/FormField'

export default function Calendar() {
  const { records, reload } = useContext(RecordsContext)
  const addToast = useContext(ToastContext)
  const [calDate,   setCalDate]   = useState(new Date())
  const [modalOpen, setModalOpen] = useState(false)
  const [selected,  setSelected]  = useState(null) // { dateStr, events }
  const [saving,    setSaving]    = useState(false)
  const [reminders, setReminders] = useState({ 7: false, 4: false, 2: false, 1: false })
  const [form, setForm] = useState({ title:'', date:today(), email:'jeevasulogan181@gmail.com', notes:'' })
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  const events = records.filter(r => r.type === 'calendar_event')
  const y = calDate.getFullYear(), mo = calDate.getMonth()
  const firstDay = new Date(y, mo, 1).getDay()
  const daysInMonth = new Date(y, mo+1, 0).getDate()
  const todayDate = new Date()

  function navMonth(dir) { setCalDate(new Date(y, mo + dir, 1)) }

  function selectDay(dateStr) {
    const dayEvents = events.filter(e => e.event_date && e.event_date.startsWith(dateStr))
    setSelected({ dateStr, events: dayEvents })
  }

  async function handleAdd(e) {
    e.preventDefault(); setSaving(true)
    const reminderDays = Object.entries(reminders).filter(([,v])=>v).map(([k])=>k).join(',')
    try {
      await createRecord({ type:'calendar_event', event_title:form.title, event_date:form.date, reminder_email:form.email, reminder_days:reminderDays, note_content:form.notes, description:form.title, amount:0, date:form.date, bank:'', category:'event' })
      await reload(); setModalOpen(false); addToast('Event added!','success')
      setForm({ title:'', date:today(), email:'jeevasulogan181@gmail.com', notes:'' }); setReminders({ 7:false, 4:false, 2:false, 1:false })
    } catch(err){ addToast(err.message,'error') }
    setSaving(false)
  }

  async function handleDelete(id) {
    try { await deleteRecord(id); await reload(); addToast('Event removed.','success'); setSelected(null) }
    catch(err){ addToast(err.message,'error') }
  }

  // Upcoming reminders (next 30 days)
  const upcoming = events.filter(e => {
    if (!e.event_date) return false
    const diff = Math.ceil((new Date(e.event_date+'T00:00:00') - todayDate) / 864e5)
    return diff >= 0 && diff <= 30
  }).sort((a,b) => new Date(a.event_date) - new Date(b.event_date))

  return (
    <div className="section-enter">
      <div className="flex items-center justify-between mb-5">
        <div><h2 className="font-display text-[22px]">Calendar &amp; Reminders</h2><p className="text-[13px] text-[#A89E8C] mt-0.5">Schedule events and get reminded</p></div>
        <BtnGold onClick={()=>setModalOpen(true)}><Plus size={14}/> Add Event</BtnGold>
      </div>

      <div className="grid gap-5" style={{ gridTemplateColumns:'1fr 340px' }}>
        {/* Calendar Grid */}
        <div className="bg-white rounded-2xl border border-[#EDE8DC] p-5" style={{boxShadow:'0 2px 16px rgba(180,150,60,0.1)'}}>
          <div className="flex items-center justify-between mb-4">
            <button onClick={()=>navMonth(-1)} className="p-1.5 border border-[#F0D98C] rounded-lg hover:bg-[#FAF3DC] transition-colors"><ChevronLeft size={14} color="#9C7A2E"/></button>
            <h3 className="font-display text-[16px]">{getMonthLabel(calDate)}</h3>
            <button onClick={()=>navMonth(1)} className="p-1.5 border border-[#F0D98C] rounded-lg hover:bg-[#FAF3DC] transition-colors"><ChevronRight size={14} color="#9C7A2E"/></button>
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>(
              <div key={d} className="text-center text-[11px] font-bold text-[#A89E8C] py-1.5 uppercase tracking-wide">{d}</div>
            ))}
            {Array.from({length:firstDay}).map((_,i)=><div key={`e${i}`}/>)}
            {Array.from({length:daysInMonth},(_,i)=>i+1).map(d=>{
              const ds = `${y}-${String(mo+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
              const de = events.filter(e=>e.event_date&&e.event_date.startsWith(ds))
              const isToday = d===todayDate.getDate()&&mo===todayDate.getMonth()&&y===todayDate.getFullYear()
              const hasR = events.some(e=>{if(!e.event_date)return false;const diff=Math.ceil((new Date(e.event_date)-new Date(y,mo,d))/864e5);return diff>=0&&diff<=7&&!isToday})
              let cls = 'aspect-square flex flex-col items-center justify-center rounded-lg cursor-pointer text-[13px] transition-all relative '
              if (isToday)        cls += 'text-white font-bold'
              else if (hasR)      cls += 'bg-[#FFF3E0] text-[#E08030] font-semibold'
              else                cls += 'text-[#6B6355] hover:bg-[#FAF3DC]'
              return (
                <div key={d} className={cls}
                  style={isToday?{background:'linear-gradient(135deg,#F0D98C,#C9A84C)'}:{}}
                  onClick={()=>selectDay(ds)}>
                  {d}
                  {de.length>0&&<span className="absolute bottom-1 w-1.5 h-1.5 rounded-full" style={{background:isToday?'white':'#C9A84C'}}/>}
                </div>
              )
            })}
          </div>
        </div>

        {/* Right panel */}
        <div className="flex flex-col gap-4">
          {/* Upcoming */}
          <div className="bg-white rounded-2xl border border-[#EDE8DC] p-5" style={{boxShadow:'0 2px 16px rgba(180,150,60,0.1)'}}>
            <h4 className="font-display text-[13px] mb-3">Upcoming Reminders</h4>
            <div className="flex flex-col gap-2">
              {upcoming.length===0&&<p className="text-[13px] text-[#A89E8C]">No upcoming events in 30 days.</p>}
              {upcoming.slice(0,8).map(e=>{
                const diff=Math.ceil((new Date(e.event_date+'T00:00:00')-todayDate)/864e5)
                const urg=diff<=2?'#E05C5C':diff<=7?'#E08030':'#9C7A2E'
                const bg=diff<=2?'#FFF0F0':diff<=7?'#FFF3E0':'#FAF3DC'
                return (
                  <div key={e.id} className="flex items-center gap-2.5 p-2 rounded-lg" style={{background:bg}}>
                    <div className="min-w-[36px] text-center"><p className="text-[16px] font-bold" style={{color:urg}}>{diff}</p><p className="text-[10px] text-[#A89E8C]">day{diff!==1?'s':''}</p></div>
                    <div><p className="text-[13px] font-semibold truncate">{e.event_title||''}</p><p className="text-[11px] text-[#A89E8C]">{e.event_date}</p></div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Selected day */}
          {selected && (
            <div className="bg-white rounded-2xl border border-[#EDE8DC] p-5" style={{boxShadow:'0 2px 16px rgba(180,150,60,0.1)'}}>
              <h4 className="font-display text-[13px] mb-3">
                {new Date(selected.dateStr+'T00:00:00').toLocaleDateString('en-MY',{weekday:'long',day:'numeric',month:'long'})}
              </h4>
              {selected.events.length===0 ? <p className="text-[13px] text-[#A89E8C]">No events on this day.</p> :
                selected.events.map(e=>(
                  <div key={e.id} className="p-2.5 bg-[#FAF3DC] rounded-lg mb-2">
                    <p className="text-[13px] font-semibold">{e.event_title}</p>
                    {e.reminder_days&&<p className="text-[12px] text-[#A89E8C] mt-0.5">Remind: {e.reminder_days} days before</p>}
                    {e.note_content&&<p className="text-[12px] text-[#6B6355] mt-1">{e.note_content}</p>}
                    <BtnDanger className="mt-2" onClick={()=>handleDelete(e.id)}>Remove</BtnDanger>
                  </div>
                ))
              }
            </div>
          )}
        </div>
      </div>

      <Modal open={modalOpen} onClose={()=>setModalOpen(false)} title="Add Calendar Event">
        <form onSubmit={handleAdd} className="flex flex-col gap-3.5">
          <FormInput label="Event Title" value={form.title} onChange={e=>set('title',e.target.value)} placeholder="Event name" required/>
          <FormInput label="Event Date" type="date" value={form.date} onChange={e=>set('date',e.target.value)} required/>
          <FormInput label="Reminder Email" type="email" value={form.email} onChange={e=>set('email',e.target.value)} placeholder="your@email.com (for email reminders)"/>
          <FormTextarea label="Notes (optional)" value={form.notes} onChange={e=>set('notes',e.target.value)} placeholder="Additional notes..." rows={2}/>
          <div>
            <p className="text-[12px] font-semibold text-[#6B6355] mb-2">Remind me before</p>
            <div className="flex flex-wrap gap-3">
              {[{d:7,label:'7 days'},{d:4,label:'4 days'},{d:2,label:'2 days'},{d:1,label:'1 day'}].map(({d,label})=>(
                <label key={d} className="flex items-center gap-1.5 text-[13px] cursor-pointer">
                  <input type="checkbox" checked={reminders[d]} onChange={e=>setReminders(r=>({...r,[d]:e.target.checked}))} style={{accentColor:'#C9A84C'}}/> {label}
                </label>
              ))}
            </div>
          </div>
          <BtnGold type="submit" disabled={saving} className="justify-center mt-1">{saving?'Saving…':'Add Event'}</BtnGold>
        </form>
      </Modal>
    </div>
  )
}
