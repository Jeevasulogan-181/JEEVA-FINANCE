import { LogOut, LayoutDashboard, Menu } from 'lucide-react'

export default function TopBar({ user, onLogout, onMenuToggle }) {
  const meta = user?.user_metadata || {}
  const name = meta.full_name || user?.email?.split('@')[0] || 'User'

  return (
    <header className="h-[60px] bg-white border-b border-[#EDE8DC] flex items-center px-4 md:px-6 gap-4 flex-shrink-0 z-30 relative"
            style={{ boxShadow: '0 2px 12px rgba(180,150,60,0.10)' }}>

      {/* Mobile menu button */}
      <button onClick={onMenuToggle}
        className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg text-[#9C7A2E] hover:bg-[#FAF3DC] transition-colors">
        <Menu size={20} />
      </button>

      {/* Logo */}
      <div className="flex items-center gap-2.5 flex-1">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
             style={{ background: 'linear-gradient(135deg,#F0D98C,#C9A84C)' }}>
          <LayoutDashboard size={17} color="white" />
        </div>
        <span className="font-display text-[16px] md:text-[17px] font-bold text-[#2C2A25] hidden sm:block">
          My Finance Dashboard
        </span>
        <span className="font-display text-[15px] font-bold text-[#2C2A25] sm:hidden">
          Finance
        </span>
      </div>

      {/* User info */}
      <div className="flex items-center gap-2 md:gap-3">
        <div className="text-right hidden sm:block">
          <p className="text-[13px] font-semibold text-[#2C2A25]">{name}</p>
          <p className="text-[11px] text-[#A89E8C] hidden md:block">{user?.email}</p>
        </div>
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[13px] font-bold flex-shrink-0"
             style={{ background: 'linear-gradient(135deg,#C9A84C,#9C7A2E)' }}>
          {name.charAt(0).toUpperCase()}
        </div>
        <button onClick={onLogout}
          className="flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 text-xs font-medium text-[#9C7A2E] border border-[#F0D98C] rounded-lg bg-white hover:bg-[#FAF3DC] transition-colors">
          <LogOut size={13} />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  )
}
