import { useState } from 'react'
import { FileDown } from 'lucide-react'
import Modal from './Modal'
import { BtnGold } from './Button'

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

/**
 * ExportModal
 * Props:
 *   open       — boolean
 *   onClose    — fn
 *   onExport   — fn({ year, month }) where month is 0-indexed or null for full year
 *   title      — string  e.g. "Export Income Statement"
 *   bankLabel  — string  e.g. "CIMB"
 */
export default function ExportModal({ open, onClose, onExport, title, bankLabel }) {
  const now          = new Date()
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())   // 0-indexed
  const [mode,  setMode]  = useState('month')           // 'month' | 'year'

  // Build year options: current year back 5 years
  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i)

  function handleExport() {
    onExport({ year, month: mode === 'month' ? month : null })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="flex flex-col gap-5">

        {/* Bank label */}
        {bankLabel && (
          <div className="bg-[#FAF3DC] rounded-xl px-4 py-2.5 border border-[#F0D98C]">
            <p className="text-xs text-[#6B6355]">Account</p>
            <p className="text-sm font-bold text-[#9C7A2E]">{bankLabel}</p>
          </div>
        )}

        {/* Mode toggle */}
        <div>
          <p className="text-xs font-semibold text-[#6B6355] mb-2">Export period</p>
          <div className="flex bg-[#FAFAF8] rounded-xl p-1 gap-1 border border-[#EDE8DC]">
            {['month', 'year'].map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all capitalize ${
                  mode === m
                    ? 'bg-white text-[#9C7A2E] shadow-sm'
                    : 'text-[#A89E8C] hover:text-[#6B6355]'
                }`}>
                {m === 'month' ? 'Specific Month' : 'Full Year'}
              </button>
            ))}
          </div>
        </div>

        {/* Year picker */}
        <div>
          <label className="block text-xs font-semibold text-[#6B6355] mb-1.5">Year</label>
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="w-full px-3 py-2.5 border-[1.5px] border-[#EDE8DC] rounded-xl text-sm outline-none bg-[#FAFAF8] focus:border-[#C9A84C] transition-colors"
            style={{ appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23C9A84C' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: '36px' }}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {/* Month picker */}
        {mode === 'month' && (
          <div>
            <label className="block text-xs font-semibold text-[#6B6355] mb-1.5">Month</label>
            <div className="grid grid-cols-3 gap-2">
              {MONTHS.map((m, i) => (
                <button key={m} onClick={() => setMonth(i)}
                  className={`py-2 rounded-xl text-xs font-medium transition-all border ${
                    month === i
                      ? 'border-[#C9A84C] text-white font-semibold'
                      : 'border-[#EDE8DC] text-[#6B6355] bg-[#FAFAF8] hover:border-[#C9A84C] hover:text-[#9C7A2E]'
                  }`}
                  style={month === i ? { background: 'linear-gradient(135deg,#C9A84C,#9C7A2E)' } : {}}>
                  {m.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Preview label */}
        <div className="bg-[#F0F0F0] rounded-xl px-4 py-2.5 text-center">
          <p className="text-xs text-[#6B6355]">Will export:</p>
          <p className="text-sm font-bold text-[#2C2A25] mt-0.5">
            {mode === 'month' ? `${MONTHS[month]} ${year}` : `Full Year ${year}`}
          </p>
        </div>

        <BtnGold onClick={handleExport} className="justify-center">
          <FileDown size={15} />
          Download PDF Statement
        </BtnGold>
      </div>
    </Modal>
  )
}
