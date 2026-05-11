import { useState, createContext } from 'react'
import { useAuth }    from '../hooks/useAuth'
import { useRecords } from '../hooks/useRecords'
import Sidebar       from '../components/layout/Sidebar'
import TopBar        from '../components/layout/TopBar'
import Toast         from '../components/ui/Toast'
import Overview      from '../components/sections/Overview'
import Income        from '../components/sections/Income'
import Savings       from '../components/sections/Savings'
import Credit        from '../components/sections/Credit'
import Calendar      from '../components/sections/Calendar'
import Notes         from '../components/sections/Notes'
import Debt          from '../components/sections/Debt'
import Goals         from '../components/sections/Goals'
import DailyExpenses from '../components/sections/DailyExpenses'
import NextMonthBudget from '../components/sections/NextMonthBudget'

export const ToastContext   = createContext(null)
export const RecordsContext = createContext(null)

export default function Dashboard() {
  const { user, signOut }                                    = useAuth()
  const { records, settings, setSettings, reload, loading }  = useRecords(user)
  const [toasts,      setToasts]      = useState([])
  const [active,      setActive]      = useState('overview')
  const [mobileOpen,  setMobileOpen]  = useState(false)

  function addToast(message, type = 'info') {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }

  if (loading) return (
    <div className="h-screen w-screen flex items-center justify-center bg-[#FAF3DC]">
      <div className="spinner" />
    </div>
  )

  return (
    <ToastContext.Provider value={addToast}>
      <RecordsContext.Provider value={{ records, settings, setSettings, reload }}>
        {/* Desktop layout */}
        <div className="hidden md:flex flex-col h-screen w-screen overflow-hidden">
          <TopBar user={user} onLogout={signOut} onMenuToggle={() => setMobileOpen(o => !o)} />
          <div className="flex flex-1 overflow-hidden">
            <Sidebar active={active} onSelect={setActive} mobileOpen={false} onMobileClose={() => {}} />
            <main className="flex-1 overflow-y-auto p-6 bg-[#FAFAF8]">
              <SectionContent active={active} />
            </main>
          </div>
        </div>

        {/* Mobile layout */}
        <div className="md:hidden flex flex-col min-h-screen w-screen bg-[#FAFAF8]">
          <TopBar user={user} onLogout={signOut} onMenuToggle={() => setMobileOpen(o => !o)} />
          <Sidebar active={active} onSelect={setActive} mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
          <main className="flex-1 p-4 pb-24 overflow-y-auto">
            <SectionContent active={active} />
          </main>
          {/* Bottom tab bar spacer + toast */}
        </div>

        {/* Toasts */}
        <div className="fixed top-16 right-4 md:top-5 md:right-5 z-50 flex flex-col gap-2">
          {toasts.map(t => <Toast key={t.id} message={t.message} type={t.type} />)}
        </div>
      </RecordsContext.Provider>
    </ToastContext.Provider>
  )
}

function SectionContent({ active }) {
  return (
    <>
      {active === 'overview'  && <Overview />}
      {active === 'income'    && <Income />}
      {active === 'savings'   && <Savings />}
      {active === 'credit'    && <Credit />}
      {active === 'daily'     && <DailyExpenses />}
      {active === 'debt'      && <Debt />}
      {active === 'goals'     && <Goals />}
      {active === 'calendar'  && <Calendar />}
      {active === 'notes'     && <Notes />}
      {active === 'nextbudget' && <NextMonthBudget />}
    </>
  )
}
