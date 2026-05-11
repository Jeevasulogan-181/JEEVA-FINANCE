export default function Toast({ message, type = 'info' }) {
  const styles = {
    success: { bg: '#E8F5E9', border: '#C8E6C9', text: '#2E7D32', icon: '✓' },
    error:   { bg: '#FFEBEE', border: '#FFCDD2', text: '#C62828', icon: '✕' },
    info:    { bg: '#FAF3DC', border: '#F0D98C', text: '#9C7A2E', icon: 'ℹ' },
  }
  const s = styles[type] || styles.info

  return (
    <div className="toast-enter flex items-center gap-2.5 px-4 py-3 rounded-xl text-[13px] font-medium max-w-[300px] md:max-w-[320px]"
         style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.text, boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }}>
      <span className="font-bold text-[15px]">{s.icon}</span>
      {message}
    </div>
  )
}
