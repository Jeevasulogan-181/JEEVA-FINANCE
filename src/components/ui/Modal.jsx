import { useEffect } from 'react'
import { X } from 'lucide-react'

export default function Modal({ open, onClose, title, children }) {
  // Close on Escape key
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
         style={{ background: 'rgba(40,35,20,0.45)' }}
         onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl p-7 w-[480px] max-w-[95vw] max-h-[85vh] overflow-y-auto"
           style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
        <div className="flex justify-between items-center mb-5">
          <h3 className="font-display text-[17px] font-semibold text-[#2C2A25]">{title}</h3>
          <button onClick={onClose} className="text-[#A89E8C] hover:text-[#6B6355] transition-colors">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
