import { BarChart2, Banknote, PiggyBank, CreditCard, Calendar, StickyNote, TrendingDown, Target, Wallet } from 'lucide-react'

const NAV = [
  { section: 'Main', items: [
    { id: 'overview',       label: 'Overview',         icon: BarChart2    },
  ]},
  { section: 'Banking', items: [
    { id: 'income',         label: 'Income',           icon: Banknote     },
    { id: 'savings',        label: 'Savings',          icon: PiggyBank    },
    { id: 'credit',         label: 'Credit Card',      icon: CreditCard   },
    { id: 'daily',          label: 'Daily Expenses',   icon: Wallet       },
  ]},
  { section: 'Planning', items: [
    { id: 'debt',           label: 'Debt Tracker',     icon: TrendingDown },
    { id: 'goals',          label: 'Goals',            icon: Target       },
  ]},
  { section: 'Tools', items: [
    { id: 'calendar',       label: 'Calendar',         icon: Calendar     },
    { id: 'notes',          label: 'Notes',            icon: StickyNote   },
  ]},
]

export default function Sidebar({ active, onSelect }) {
  return (
    <aside className="w-[220px] bg-white border-r border-[#EDE8DC] flex flex-col flex-shrink-0 py-4 overflow-y-auto">
      {NAV.map(({ section, items }) => (
        <div key={section}>
          <p className="text-[10px] font-bold tracking-[1.5px] text-[#A89E8C] px-5 pt-4 pb-1.5 uppercase">{section}</p>
          {items.map(({ id, label, icon: Icon }) => {
            const isActive = active === id
            return (
              <button key={id} onClick={() => onSelect(id)}
                className={`w-full flex items-center gap-2.5 px-5 py-2.5 text-[13.5px] font-medium transition-all border-l-[3px] ${isActive
                  ? 'bg-[#FAF3DC] text-[#9C7A2E] border-[#C9A84C] font-semibold'
                  : 'text-[#6B6355] border-transparent hover:bg-[#FAF3DC] hover:text-[#9C7A2E]'}`}>
                <Icon size={17} />{label}
              </button>
            )
          })}
        </div>
      ))}
    </aside>
  )
}
