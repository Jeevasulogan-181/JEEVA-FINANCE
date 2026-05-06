import { useContext, useState } from 'react'
import { Banknote, PiggyBank, CreditCard, Wallet, FileDown } from 'lucide-react'
import { Doughnut, Bar } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js'
import { RecordsContext } from '../../pages/Dashboard'
import { exportFullReportPDF } from '../../lib/exportPdf'
import ExportModal from '../ui/ExportModal'
import { fmt, monthlyExpenses } from '../../lib/utils'

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend)

// Includes gxbank transfers as outgoing from income bank
function calcIncome(records, bank) {
  let income = 0, expenses = 0, transfers = 0
  records.filter(r => r.type === 'income_transaction' && r.bank === bank).forEach(r => {
    const a = parseFloat(r.amount || 0)
    if (r.transaction_type === 'income')                              income    += a
    else if (r.transaction_type === 'expense')                        expenses  += a
    else if (r.transaction_type === 'savings' || r.transaction_type === 'gxbank') transfers += a
  })
  return { income, expenses, transfers, balance: income - expenses - transfers }
}

function calcSavings(records, bank) {
  let d = 0, w = 0
  records.filter(r => r.type === 'savings_transaction' && r.bank === bank).forEach(r => {
    const a = parseFloat(r.amount || 0)
    if (r.transaction_type === 'deposit') d += a; else w += a
  })
  return { deposits: d, withdrawals: w, balance: d - w }
}

const chartOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { font: { family: 'Lato', size: 11 }, color: '#6B6355', boxWidth: 12 } } } }
const barOpts   = { ...chartOpts, scales: { x: { ticks: { color: '#A89E8C', font: { size: 10 } }, grid: { color: '#EDE8DC' } }, y: { ticks: { color: '#A89E8C', font: { size: 10 }, callback: v => 'RM' + v.toLocaleString() }, grid: { color: '#EDE8DC' } } } }

export default function Overview() {
  const { records, settings } = useContext(RecordsContext)
  const [exportOpen, setExportOpen] = useState(false)

  const ci = calcIncome(records, 'cimb')
  const pb = calcIncome(records, 'public')
  const bs = calcSavings(records, 'bsn')
  const sc = calcSavings(records, 'sc')
  const ccSpent = records.filter(r => r.type === 'credit_transaction').reduce((s, r) => s + parseFloat(r.amount || 0), 0)

  // GXBank — daily expenses this month
  const now = new Date()
  const month = now.getMonth() + 1
  const year  = now.getFullYear()
  const dailyExpenses = records.filter(r => {
    if (r.type !== 'daily_expense') return false
    const d = new Date(r.date)
    return d.getMonth() + 1 === month && d.getFullYear() === year
  })
  const dailySpent = dailyExpenses.reduce((s, r) => s + parseFloat(r.amount || 0), 0)

  // GXBank budget = sum of all gxbank transfers this month from income
  const gxBudget = records.filter(r => {
    if (r.type !== 'income_transaction' || r.transaction_type !== 'gxbank') return false
    const d = new Date(r.date)
    return d.getMonth() + 1 === month && d.getFullYear() === year
  }).reduce((s, r) => s + parseFloat(r.amount || 0), 0)
  const gxRemaining = Math.max(0, gxBudget - dailySpent)

  const pieData = {
    labels: ['CIMB', 'Public Bank', 'BSN', 'Std. Chartered', 'GXBank'],
    datasets: [{ data: [ci.balance, pb.balance, bs.balance, sc.balance, gxRemaining].map(v => Math.max(v, 0)), backgroundColor: ['#C9A84C','#F0D98C','#66BB6A','#42A5F5','#1565C0'], borderWidth: 0 }],
  }

  const txns  = records.filter(r => r.type === 'income_transaction' || r.type === 'credit_transaction')
  const mo    = monthlyExpenses(txns)
  const barData = {
    labels: mo.map(m => m.label),
    datasets: [{ label: 'Expenses', data: mo.map(m => m.total), backgroundColor: 'rgba(201,168,76,0.8)', borderRadius: 6 }],
  }

  const recent = [...records]
    .filter(r => ['income_transaction','credit_transaction','savings_transaction','daily_expense'].includes(r.type))
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 20)

  const bankLabel = { cimb: 'CIMB', public: 'Public Bank', bsn: 'BSN', sc: 'Std. Chartered', uob: 'UOB', gxbank: 'GXBank' }

  return (
    <div className="section-enter">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-display text-[22px] text-[#2C2A25]">Overview</h2>
          <p className="text-[13px] text-[#A89E8C] mt-0.5">Your complete financial snapshot</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-bold text-[#9C7A2E] bg-[#FAF3DC] border border-[#F0D98C] rounded-full px-3 py-1">Live Summary</span>
          <button onClick={() => setExportOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-[13px] font-semibold transition-all hover:-translate-y-px"
            style={{ background: 'linear-gradient(135deg,#2C2A25,#6B6355)' }}>
            <FileDown size={14} /> Full Report PDF
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        {[
          { label: 'Income Balance',  value: fmt(ci.balance + pb.balance), color: '#2C2A25', sub: 'CIMB + Public Bank', bg: 'linear-gradient(135deg,#C9A84C,#9C7A2E)', Icon: Banknote },
          { label: 'Total Savings',   value: fmt(bs.balance + sc.balance), color: '#388E3C', sub: 'BSN + Standard Chartered', bg: 'linear-gradient(135deg,#66BB6A,#388E3C)', Icon: PiggyBank },
          { label: 'GXBank Remaining',value: fmt(gxRemaining),             color: '#1565C0', sub: `Spent ${fmt(dailySpent)} of ${fmt(gxBudget)}`, bg: 'linear-gradient(135deg,#1565C0,#0D47A1)', Icon: Wallet },
          { label: 'Credit Card Spent',value: fmt(ccSpent),                color: '#E05C5C', sub: `UOB | Limit: ${fmt(settings.limit)}`, bg: 'linear-gradient(135deg,#E05C5C,#B71C1C)', Icon: CreditCard },
        ].map(({ label, value, color, sub, bg, Icon }) => (
          <div key={label} className="bg-white rounded-2xl border border-[#EDE8DC] px-5 py-4" style={{ boxShadow: '0 2px 12px rgba(180,150,60,0.1)' }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: bg }}>
                <Icon size={16} color="white" />
              </div>
              <span className="text-[12px] text-[#A89E8C]">{label}</span>
            </div>
            <p className="font-display text-[22px] font-bold" style={{ color }}>{value}</p>
            <p className="text-[11px] text-[#A89E8C] mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* Bank breakdown */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {/* Income banks */}
        <div className="bg-white rounded-2xl border border-[#EDE8DC] p-5" style={{ boxShadow: '0 2px 16px rgba(180,150,60,0.1)' }}>
          <h4 className="font-display text-[14px] mb-3">Income Banks</h4>
          {[
            { name: 'CIMB',        inc: ci.income, exp: ci.expenses + ci.transfers, bal: ci.balance },
            { name: 'Public Bank', inc: pb.income, exp: pb.expenses + pb.transfers, bal: pb.balance },
          ].map((r, i) => (
            <div key={r.name} className={`flex justify-between items-center py-2.5 ${i === 0 ? 'border-b border-[#EDE8DC]' : ''}`}>
              <div>
                <p className="text-[13px] font-semibold">{r.name}</p>
                <p className="text-[11px] text-[#A89E8C]">In: {fmt(r.inc)} / Out: {fmt(r.exp)}</p>
              </div>
              <p className="text-[15px] font-bold text-[#9C7A2E]">{fmt(r.bal)}</p>
            </div>
          ))}
        </div>

        {/* Savings banks */}
        <div className="bg-white rounded-2xl border border-[#EDE8DC] p-5" style={{ boxShadow: '0 2px 16px rgba(180,150,60,0.1)' }}>
          <h4 className="font-display text-[14px] mb-3">Savings Banks</h4>
          {[
            { name: 'BSN',                inc: bs.deposits, exp: bs.withdrawals, bal: bs.balance },
            { name: 'Standard Chartered', inc: sc.deposits, exp: sc.withdrawals, bal: sc.balance },
          ].map((r, i) => (
            <div key={r.name} className={`flex justify-between items-center py-2.5 ${i === 0 ? 'border-b border-[#EDE8DC]' : ''}`}>
              <div>
                <p className="text-[13px] font-semibold">{r.name}</p>
                <p className="text-[11px] text-[#A89E8C]">In: {fmt(r.inc)} / Out: {fmt(r.exp)}</p>
              </div>
              <p className="text-[15px] font-bold text-[#388E3C]">{fmt(r.bal)}</p>
            </div>
          ))}
        </div>

        {/* GXBank */}
        <div className="rounded-2xl border p-5 overflow-hidden relative" style={{ background: 'linear-gradient(135deg,#0D47A1,#1565C0)', borderColor: '#1976D2', boxShadow: '0 2px 16px rgba(13,71,161,0.3)' }}>
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10" style={{ background: 'radial-gradient(circle,#fff,transparent)', transform: 'translate(30%,-30%)' }} />
          <h4 className="font-display text-[14px] mb-3 text-white relative">GXBank — Daily Expenses</h4>
          <div className="relative">
            <div className="flex justify-between items-center py-2 border-b border-[rgba(255,255,255,0.15)]">
              <p className="text-[12px] text-[rgba(255,255,255,0.6)]">Monthly Budget</p>
              <p className="text-[13px] font-bold text-[#90CAF9]">{fmt(gxBudget)}</p>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-[rgba(255,255,255,0.15)]">
              <p className="text-[12px] text-[rgba(255,255,255,0.6)]">Spent</p>
              <p className="text-[13px] font-bold text-[#EF9A9A]">{fmt(dailySpent)}</p>
            </div>
            <div className="flex justify-between items-center py-2">
              <p className="text-[12px] text-[rgba(255,255,255,0.6)]">Remaining</p>
              <p className="text-[15px] font-bold text-white">{fmt(gxRemaining)}</p>
            </div>
            {gxBudget > 0 && (
              <div className="mt-2">
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.15)' }}>
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.min((dailySpent/gxBudget)*100,100)}%`, background: dailySpent/gxBudget > 0.9 ? '#EF5350' : dailySpent/gxBudget > 0.7 ? '#FFA726' : '#66BB6A' }} />
                </div>
                <p className="text-[10px] text-[rgba(255,255,255,0.4)] mt-1">{((dailySpent/gxBudget)*100).toFixed(1)}% used this month</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="bg-white rounded-2xl border border-[#EDE8DC] p-5" style={{ boxShadow: '0 2px 16px rgba(180,150,60,0.1)' }}>
          <h4 className="font-display text-[14px] mb-3">Balance Distribution</h4>
          <div className="relative h-[200px]"><Doughnut data={pieData} options={chartOpts} /></div>
        </div>
        <div className="bg-white rounded-2xl border border-[#EDE8DC] p-5" style={{ boxShadow: '0 2px 16px rgba(180,150,60,0.1)' }}>
          <h4 className="font-display text-[14px] mb-3">Monthly Expenses</h4>
          <div className="relative h-[200px]"><Bar data={barData} options={barOpts} /></div>
        </div>
      </div>

      {/* Recent transactions */}
      <div className="bg-white rounded-2xl border border-[#EDE8DC] p-5" style={{ boxShadow: '0 2px 16px rgba(180,150,60,0.1)' }}>
        <h4 className="font-display text-[14px] mb-4">Recent Transactions</h4>
        <div className="overflow-y-auto max-h-[350px] border border-[#EDE8DC] rounded-xl">
          <table className="w-full border-collapse text-[13px]">
            <thead className="sticky top-0 z-10"><tr>
              {['Date','Description','Bank','Category','Amount'].map(h => (
                <th key={h} className="bg-[#FAF3DC] text-[#9C7A2E] font-semibold text-[11px] tracking-[0.8px] uppercase px-3.5 py-2.5 text-left">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {recent.length === 0
                ? <tr><td colSpan={5} className="text-center text-[#A89E8C] py-6">No transactions yet</td></tr>
                : recent.map(r => {
                  const isPos = r.transaction_type === 'income' || r.transaction_type === 'deposit'
                  const isNeg = r.transaction_type === 'expense' || r.transaction_type === 'withdrawal' || r.type === 'credit_transaction' || r.type === 'daily_expense'
                  return (
                    <tr key={r.id} className="hover:bg-[#FDFAF2]">
                      <td className="px-3.5 py-2.5 border-b border-[#EDE8DC] text-[#6B6355]">{r.date || ''}</td>
                      <td className="px-3.5 py-2.5 border-b border-[#EDE8DC] text-[#6B6355]">{r.description || ''}</td>
                      <td className="px-3.5 py-2.5 border-b border-[#EDE8DC] text-[#6B6355]">{bankLabel[r.bank] || r.bank || '—'}</td>
                      <td className="px-3.5 py-2.5 border-b border-[#EDE8DC] text-[#6B6355]">{r.category || '-'}</td>
                      <td className={`px-3.5 py-2.5 border-b border-[#EDE8DC] font-semibold ${isPos ? 'text-[#3BAF7E]' : isNeg ? 'text-[#E05C5C]' : 'text-[#9C7A2E]'}`}>
                        {isNeg ? '-' : '+'} {fmt(r.amount)}
                      </td>
                    </tr>
                  )
                })
              }
            </tbody>
          </table>
        </div>
      </div>

      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title="Export Full Financial Report"
        bankLabel="All Accounts — CIMB, Public Bank, BSN, Standard Chartered, GXBank, UOB"
        onExport={({ year, month }) => exportFullReportPDF({ records, settings, year, month })}
      />
    </div>
  )
}