import { useEffect } from 'react'
import { X, BarChart2, Banknote, PiggyBank, CreditCard, Calendar, StickyNote, TrendingDown, Target, Wallet, CalendarCheck } from 'lucide-react'

const NAV = [
  { section: 'Main', items: [
    { id: 'overview',  label: 'Overview',       icon: BarChart2    },
  ]},
  { section: 'Banking', items: [
    { id: 'income',    label: 'Income',         icon: Banknote     },
    { id: 'savings',   label: 'Savings',        icon: PiggyBank    },
    { id: 'credit',    label: 'Credit Card',    icon: CreditCard   },
    { id: 'daily',     label: 'Daily Expenses', icon: Wallet       },
  ]},
  { section: 'Planning', items: [
    { id: 'debt',        label: 'Debt Tracker',        icon: TrendingDown  },
    { id: 'goals',       label: 'Goals',               icon: Target        },
    { id: 'nextbudget',  label: 'Next Month Budget',   icon: CalendarCheck },
  ]},
  { section: 'Tools', items: [
    { id: 'calendar',  label: 'Calendar',       icon: Calendar     },
    { id: 'notes',     label: 'Notes',          icon: StickyNote   },
  ]},
]

// ── Desktop Sidebar ───────────────────────────────────────────
function DesktopSidebar({ active, onSelect }) {
  return (
    <aside className="hidden md:flex w-[220px] bg-white border-r border-[#EDE8DC] flex-col flex-shrink-0 py-4 overflow-y-auto">
      {NAV.map(({ section, items }) => (
        <div key={section}>
          <p className="text-[10px] font-bold tracking-[1.5px] text-[#A89E8C] px-5 pt-4 pb-1.5 uppercase">{section}</p>
          {items.map(({ id, label, icon: Icon }) => {
            const isActive = active === id
            return (
              <button key={id} onClick={() => onSelect(id)}
                className={`w-full flex items-center gap-2.5 px-5 py-2.5 text-[13.5px] font-medium transition-all border-l-[3px] ${
                  isActive ? 'bg-[#FAF3DC] text-[#9C7A2E] border-[#C9A84C] font-semibold' : 'text-[#6B6355] border-transparent hover:bg-[#FAF3DC] hover:text-[#9C7A2E]'
                }`}>
                <Icon size={17} />{label}
              </button>
            )
          })}
        </div>
      ))}
    </aside>
  )
}

// ── Mobile Drawer Sidebar ─────────────────────────────────────
function MobileDrawer({ active, onSelect, open, onClose }) {
  // Close on outside click / escape
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={onClose} />
      {/* Drawer */}
      <div className="fixed top-0 left-0 bottom-0 w-[280px] bg-white z-50 flex flex-col shadow-2xl md:hidden"
           style={{ animation: 'slideInLeft 0.28s ease' }}>
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#EDE8DC]"
             style={{ background: 'linear-gradient(135deg,#FAF3DC,#F5EED5)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg,#F0D98C,#C9A84C)' }}>
              <BarChart2 size={15} color="white" />
            </div>
            <span className="font-display text-[15px] font-bold text-[#2C2A25]">Finance</span>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-[#A89E8C] hover:bg-[#EDE8DC] transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Nav items */}
        <div className="flex-1 overflow-y-auto py-3">
          {NAV.map(({ section, items }) => (
            <div key={section}>
              <p className="text-[10px] font-bold tracking-[1.5px] text-[#A89E8C] px-5 pt-4 pb-2 uppercase">{section}</p>
              {items.map(({ id, label, icon: Icon }) => {
                const isActive = active === id
                return (
                  <button key={id} onClick={() => { onSelect(id); onClose() }}
                    className={`w-full flex items-center gap-3 px-5 py-3 text-[14px] font-medium transition-all ${
                      isActive
                        ? 'bg-[#FAF3DC] text-[#9C7A2E] font-semibold border-l-4 border-[#C9A84C]'
                        : 'text-[#6B6355] hover:bg-[#FAFAF8]'
                    }`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isActive ? '' : 'bg-[#FAFAF8]'}`}
                         style={isActive ? { background: 'linear-gradient(135deg,#F0D98C,#C9A84C)' } : {}}>
                      <Icon size={16} color={isActive ? 'white' : '#6B6355'} />
                    </div>
                    {label}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes slideInLeft {
          from { transform: translateX(-100%); }
          to   { transform: translateX(0); }
        }
      `}</style>
    </>
  )
}

// ── Mobile Bottom Tab Bar ─────────────────────────────────────
// Shows 5 most important sections as tabs
const BOTTOM_TABS = [
  { id: 'overview', label: 'Home',    icon: BarChart2   },
  { id: 'income',   label: 'Income',  icon: Banknote    },
  { id: 'daily',    label: 'Daily',   icon: Wallet      },
  { id: 'credit',   label: 'Credit',  icon: CreditCard  },
  { id: 'goals',    label: 'Goals',   icon: Target      },
]

function BottomTabBar({ active, onSelect }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#EDE8DC] flex md:hidden z-30 safe-area-bottom"
         style={{ boxShadow: '0 -4px 20px rgba(180,150,60,0.12)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {BOTTOM_TABS.map(({ id, label, icon: Icon }) => {
        const isActive = active === id
        return (
          <button key={id} onClick={() => onSelect(id)}
            className="flex-1 flex flex-col items-center justify-center py-2.5 transition-all tap-scale">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-0.5 transition-all ${
              isActive ? 'scale-110' : ''
            }`}
              style={isActive ? { background: 'linear-gradient(135deg,#F0D98C,#C9A84C)', boxShadow: '0 4px 12px rgba(201,168,76,0.4)' } : {}}>
              <Icon size={18} color={isActive ? 'white' : '#A89E8C'} />
            </div>
            <span className={`text-[10px] font-semibold transition-colors ${isActive ? 'text-[#9C7A2E]' : 'text-[#A89E8C]'}`}>
              {label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}

// ── Main export ───────────────────────────────────────────────
export default function Sidebar({ active, onSelect, mobileOpen, onMobileClose }) {
  return (
    <>
      <DesktopSidebar active={active} onSelect={onSelect} />
      <MobileDrawer active={active} onSelect={onSelect} open={mobileOpen} onClose={onMobileClose} />
      <BottomTabBar active={active} onSelect={onSelect} />
    </>
  )
}
