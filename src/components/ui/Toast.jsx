export default function Toast({ message, type = 'info' }) {
  const borderColor = {
    success:  '#3BAF7E',
    error:    '#E05C5C',
    reminder: '#F0A030',
    info:     '#C9A84C',
  }[type] || '#C9A84C'

  const icons = {
    success:  '✅ Success',
    error:    '⚠️ Error',
    reminder: '🔔 Reminder',
    info:     'ℹ️ Info',
  }

  return (
    <div className="toast-enter bg-white rounded-xl px-4 py-3 min-w-[260px] text-[13px] text-[#2C2A25]"
         style={{ borderLeft: `4px solid ${borderColor}`, boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }}>
      <p className="font-semibold mb-0.5">{icons[type] || 'ℹ️ Info'}</p>
      <p>{message}</p>
    </div>
  )
}
