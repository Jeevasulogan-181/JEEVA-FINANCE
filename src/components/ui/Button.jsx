export function BtnGold({ children, onClick, disabled, type = 'button', className = '' }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-[13px] font-semibold transition-all
        disabled:opacity-60 disabled:cursor-not-allowed hover:-translate-y-px ${className}`}
      style={{ background: 'linear-gradient(135deg,#C9A84C,#9C7A2E)',
               boxShadow: disabled ? 'none' : undefined }}>
      {children}
    </button>
  )
}

export function BtnOutline({ children, onClick, disabled, type = 'button', className = '' }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[#9C7A2E] text-[13px] font-medium
        bg-white border border-[#F0D98C] hover:bg-[#FAF3DC] transition-colors disabled:opacity-60 ${className}`}>
      {children}
    </button>
  )
}

export function BtnDanger({ children, onClick, type = 'button', className = '' }) {
  return (
    <button type={type} onClick={onClick}
      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[#E05C5C] text-xs
        bg-white border border-[#FFCDD2] hover:bg-[#FFF0F0] transition-colors ${className}`}>
      {children}
    </button>
  )
}
