import { useContext, useState } from 'react'
import { Plus, StickyNote } from 'lucide-react'
import { RecordsContext, ToastContext } from '../../pages/Dashboard'
import { createRecord, deleteRecord } from '../../lib/db'
import { today } from '../../lib/utils'
import Modal from '../ui/Modal'
import { BtnGold, BtnDanger } from '../ui/Button'
import { FormInput, FormTextarea } from '../ui/FormField'

const COLORS = ['#FFF9E6','#E8F5E9','#E3F2FD','#FCE4EC','#F3E5F5']

export default function Notes() {
  const { records, reload } = useContext(RecordsContext)
  const addToast = useContext(ToastContext)
  const [addOpen,  setAddOpen]  = useState(false)
  const [viewNote, setViewNote] = useState(null)
  const [saving,   setSaving]   = useState(false)
  const [confirm,  setConfirm]  = useState(false)
  const [color,    setColor]    = useState(COLORS[0])
  const [form,     setForm]     = useState({ title:'', content:'' })
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  const notes = records.filter(r=>r.type==='note').sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0))

  async function handleAdd(e) {
    e.preventDefault(); setSaving(true)
    try {
      await createRecord({ type:'note', note_title:form.title, note_content:form.content, note_color:color, description:form.title, amount:0, date:today(), bank:'', category:'note' })
      await reload(); setAddOpen(false); addToast('Note saved!','success')
      setForm({ title:'', content:'' }); setColor(COLORS[0])
    } catch(err){ addToast(err.message,'error') }
    setSaving(false)
  }

  async function handleDelete() {
    try { await deleteRecord(viewNote.id); await reload(); setViewNote(null); setConfirm(false); addToast('Note deleted.','success') }
    catch(err){ addToast(err.message,'error') }
  }

  return (
    <div className="section-enter">
      <div className="flex items-center justify-between mb-5">
        <div><h2 className="font-display text-[22px]">Notes</h2><p className="text-[13px] text-[#A89E8C] mt-0.5">Keep your financial notes organized</p></div>
        <BtnGold onClick={()=>setAddOpen(true)}><Plus size={14}/> New Note</BtnGold>
      </div>

      {notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-[#A89E8C]">
          <StickyNote size={48} className="mb-3 opacity-40"/>
          <p className="text-[14px]">No notes yet. Create your first note!</p>
        </div>
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))' }}>
          {notes.map(n=>(
            <div key={n.id} onClick={()=>{ setViewNote(n); setConfirm(false) }}
              className="rounded-2xl p-4.5 cursor-pointer transition-all hover:-translate-y-0.5 border border-transparent hover:border-[rgba(0,0,0,0.08)]"
              style={{ background:n.note_color||'#FFF9E6', padding:'18px', boxShadow:'0 2px 8px rgba(0,0,0,0.05)' }}>
              <h4 className="font-display text-[14px] font-bold text-[#2C2A25] mb-2 truncate">{n.note_title||'Untitled'}</h4>
              <p className="text-[13px] text-[#6B6355] leading-relaxed line-clamp-4">{n.note_content||''}</p>
              <p className="text-[11px] text-[#A89E8C] mt-2.5">{n.date||''}</p>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      <Modal open={addOpen} onClose={()=>setAddOpen(false)} title="New Note">
        <form onSubmit={handleAdd} className="flex flex-col gap-3.5">
          <FormInput label="Title" value={form.title} onChange={e=>set('title',e.target.value)} placeholder="Note title" required/>
          <FormTextarea label="Content" value={form.content} onChange={e=>set('content',e.target.value)} placeholder="Write your note here..." rows={5} required/>
          <div>
            <p className="text-[12px] font-semibold text-[#6B6355] mb-2">Color</p>
            <div className="flex gap-2.5">
              {COLORS.map(c=>(
                <div key={c} onClick={()=>setColor(c)} className="w-7 h-7 rounded-lg cursor-pointer transition-all"
                  style={{ background:c, border:`2px solid ${color===c?'#C9A84C':'transparent'}`, transform:color===c?'scale(1.2)':'scale(1)' }}/>
              ))}
            </div>
          </div>
          <BtnGold type="submit" disabled={saving} className="justify-center mt-1">{saving?'Saving…':'Save Note'}</BtnGold>
        </form>
      </Modal>

      {/* View Modal */}
      {viewNote && (
        <Modal open={!!viewNote} onClose={()=>{ setViewNote(null); setConfirm(false) }} title={viewNote.note_title||'Note'}>
          <p className="text-[14px] text-[#6B6355] whitespace-pre-wrap leading-7">{viewNote.note_content||''}</p>
          <div className="mt-5 flex justify-end">
            {!confirm ? (
              <BtnDanger onClick={()=>setConfirm(true)}>Delete Note</BtnDanger>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-[13px] text-[#6B6355]">Delete this note?</span>
                <BtnGold onClick={handleDelete} className="py-1.5 px-3 text-xs">Yes, Delete</BtnGold>
                <button onClick={()=>setConfirm(false)} className="text-[13px] text-[#9C7A2E] hover:underline">Cancel</button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
