import { useEffect } from 'react'
import { X } from 'lucide-react'

export default function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    // Prevent body scroll when modal open on mobile
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
         style={{ background: 'rgba(40,35,20,0.5)' }}
         onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>

      {/* Mobile: slides up from bottom. Desktop: centered */}
      <div className="bg-white w-full md:w-[480px] md:max-w-[95vw] rounded-t-3xl md:rounded-2xl
                      max-h-[92vh] md:max-h-[85vh] overflow-y-auto
                      md:shadow-[0_20px_60px_rgba(0,0,0,0.15)]"
           style={{ animation: 'modalSlideUp 0.3s ease' }}>

        {/* Mobile handle bar */}
        <div className="md:hidden w-10 h-1 bg-[#EDE8DC] rounded-full mx-auto mt-3 mb-1" />

        <div className="px-5 md:px-7 pt-4 md:pt-7 pb-6 md:pb-7">
          <div className="flex justify-between items-center mb-5">
            <h3 className="font-display text-[16px] md:text-[17px] font-semibold text-[#2C2A25]">{title}</h3>
            <button onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full text-[#A89E8C] hover:bg-[#FAFAF8] hover:text-[#6B6355] transition-colors">
              <X size={18} />
            </button>
          </div>
          {children}
        </div>
      </div>

      <style>{`
        @keyframes modalSlideUp {
          from { transform: translateY(40px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  )
}
