import { LogOut, LayoutDashboard } from 'lucide-react'

export default function TopBar({ user, onLogout }) {
  const meta = user?.user_metadata || {}
  const name = meta.full_name || user?.email?.split('@')[0] || 'User'

  return (
    <header className="h-[60px] bg-white border-b border-[#EDE8DC] flex items-center px-6 gap-4 flex-shrink-0"
            style={{ boxShadow: '0 2px 12px rgba(180,150,60,0.10)' }}>
      <div className="flex items-center gap-3 flex-1">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center"
             style={{ background: 'linear-gradient(135deg,#F0D98C,#C9A84C)' }}>
          <LayoutDashboard size={17} color="white" />
        </div>
        <span className="font-display text-[17px] font-bold text-[#2C2A25]">
          My Finance Dashboard
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-[13px] font-semibold text-[#2C2A25]">{name}</p>
          <p className="text-[11px] text-[#A89E8C]">{user?.email}</p>
        </div>
        <button onClick={onLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#9C7A2E] border border-[#F0D98C] rounded-lg bg-white hover:bg-[#FAF3DC] transition-colors">
          <LogOut size={13} />
          Logout
        </button>
      </div>
    </header>
  )
}
