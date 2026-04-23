import { useContext, useState } from 'react'
import { Banknote, PiggyBank, CreditCard, FileDown } from 'lucide-react'
import { Doughnut, Bar } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js'
import { RecordsContext } from '../../pages/Dashboard'
import { exportFullReportPDF } from '../../lib/exportPdf'
import ExportModal from '../ui/ExportModal'
import { fmt, monthlyExpenses } from '../../lib/utils'

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend)

function calcIncome(records, bank) {
  let income = 0, expenses = 0, savings = 0
  records.filter(r => r.type === 'income_transaction' && r.bank === bank).forEach(r => {
    const a = parseFloat(r.amount || 0)
    if (r.transaction_type === 'income') income += a
    else if (r.transaction_type === 'expense') expenses += a
    else if (r.transaction_type === 'savings') savings += a
  })
  return { income, expenses, savings, balance: income - expenses - savings }
}
function calcSavings(records, bank) {
  let d = 0, w = 0
  records.filter(r => r.type === 'savings_transaction' && r.bank === bank).forEach(r => {
    const a = parseFloat(r.amount || 0)
    if (r.transaction_type === 'deposit') d += a; else w += a
  })
  return { deposits: d, withdrawals: w, balance: d - w }
}

const chartOpts = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { labels: { font: { family: 'Lato', size: 11 }, color: '#6B6355', boxWidth: 12 } } },
}
const barOpts = {
  ...chartOpts,
  scales: {
    x: { ticks: { color: '#A89E8C', font: { size: 10 } }, grid: { color: '#EDE8DC' } },
    y: { ticks: { color: '#A89E8C', font: { size: 10 }, callback: v => 'RM' + v.toLocaleString() }, grid: { color: '#EDE8DC' } },
  },
}

export default function Overview() {
  const { records, settings } = useContext(RecordsContext)
  const [exportOpen, setExportOpen] = useState(false)

  const ci = calcIncome(records, 'cimb')
  const pb = calcIncome(records, 'public')
  const bs = calcSavings(records, 'bsn')
  const sc = calcSavings(records, 'sc')
  const ccSpent = records.filter(r => r.type === 'credit_transaction').reduce((s, r) => s + parseFloat(r.amount || 0), 0)

  // Daily expenses this month
  const now2 = new Date()
  const monthKey = `${now2.getFullYear()}-${String(now2.getMonth()+1).padStart(2,'0')}`
  const dailyThisMonth = records.filter(r => r.type === 'daily_expense' && r.date?.startsWith(monthKey)).reduce((s,r) => s + parseFloat(r.amount||0), 0)
  const dailyBudget = (() => { const br = records.find(r => r.type === 'daily_budget' && r.date?.startsWith(monthKey)); return br ? parseFloat(br.amount) : 0 })()
  const dailyRemaining = dailyBudget - dailyThisMonth

  const pieData = {
    labels: ['CIMB', 'Public Bank', 'BSN', 'Standard Chartered'],
    datasets: [{ data: [ci.balance, pb.balance, bs.balance, sc.balance].map(v => Math.max(v, 0)), backgroundColor: ['#C9A84C','#F0D98C','#66BB6A','#42A5F5'], borderWidth: 0 }],
  }

  const txns = records.filter(r => r.type === 'income_transaction' || r.type === 'credit_transaction')
  const mo = monthlyExpenses(txns)
  const barData = {
    labels: mo.map(m => m.label),
    datasets: [{ label: 'Expenses', data: mo.map(m => m.total), backgroundColor: 'rgba(201,168,76,0.8)', borderRadius: 6 }],
  }

  const recent = [...records]
    .filter(r => ['income_transaction','credit_transaction','savings_transaction'].includes(r.type))
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 20)

  const bankLabel = { cimb: 'CIMB', public: 'Public Bank', bsn: 'BSN', sc: 'Standard Chartered', uob: 'UOB' }

  return (
    <div className="section-enter">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-display text-[22px] text-[#2C2A25]">Overview</h2>
          <p className="text-[13px] text-[#A89E8C] mt-0.5">Your complete financial snapshot</p>
        </div>
        <span className="text-[11px] font-bold text-[#9C7A2E] bg-[#FAF3DC] border border-[#F0D98C] rounded-full px-3 py-1">
          Live Summary
        </span>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          { label: 'Total Income Balance', value: fmt(ci.balance + pb.balance), color: '#2C2A25', sub: 'CIMB + Public Bank', bg: 'linear-gradient(135deg,#C9A84C,#9C7A2E)', Icon: Banknote },
          { label: 'Total Savings',        value: fmt(bs.balance + sc.balance), color: '#388E3C', sub: 'BSN + Standard Chartered', bg: 'linear-gradient(135deg,#66BB6A,#388E3C)', Icon: PiggyBank },
          { label: 'Credit Card Spent',    value: fmt(ccSpent),                 color: '#E05C5C', sub: `UOB | Limit: ${fmt(settings.limit)}`, bg: 'linear-gradient(135deg,#E05C5C,#B71C1C)', Icon: CreditCard },
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
      <div className="grid grid-cols-2 gap-4 mb-5">
        {[
          { title: 'Income Banks', rows: [
            { name: 'CIMB',        inc: ci.income, exp: ci.expenses, bal: ci.balance },
            { name: 'Public Bank', inc: pb.income, exp: pb.expenses, bal: pb.balance },
          ], balColor: '#9C7A2E' },
          { title: 'Savings Banks', rows: [
            { name: 'BSN',               inc: bs.deposits, exp: bs.withdrawals, bal: bs.balance },
            { name: 'Standard Chartered', inc: sc.deposits, exp: sc.withdrawals, bal: sc.balance },
          ], balColor: '#388E3C' },
        ].map(({ title, rows, balColor }) => (
          <div key={title} className="bg-white rounded-2xl border border-[#EDE8DC] p-5" style={{ boxShadow: '0 2px 16px rgba(180,150,60,0.1)' }}>
            <h4 className="font-display text-[14px] mb-3">{title}</h4>
            {rows.map((r, i) => (
              <div key={r.name} className={`flex justify-between items-center py-2.5 ${i < rows.length - 1 ? 'border-b border-[#EDE8DC]' : ''}`}>
                <div>
                  <p className="text-[13px] font-semibold">{r.name}</p>
                  <p className="text-[11px] text-[#A89E8C]">{fmt(r.inc)} / {fmt(r.exp)}</p>
                </div>
                <p className="text-[15px] font-bold" style={{ color: balColor }}>{fmt(r.bal)}</p>
              </div>
            ))}
          </div>
        ))}
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
            <thead className="sticky top-0 z-10">
              <tr>{['Date','Description','Bank','Category','Amount'].map(h => (
                <th key={h} className="bg-[#FAF3DC] text-[#9C7A2E] font-semibold text-[11px] tracking-[0.8px] uppercase px-3.5 py-2.5 text-left">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {recent.length === 0 ? (
                <tr><td colSpan={5} className="text-center text-[#A89E8C] py-6">No transactions yet</td></tr>
              ) : recent.map(r => {
                const isPos = r.transaction_type === 'income' || r.transaction_type === 'deposit'
                const isNeg = r.transaction_type === 'expense' || r.transaction_type === 'withdrawal' || r.type === 'credit_transaction'
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
              })}
            </tbody>
          </table>
        </div>
      </div>
    <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title="Export Full Financial Report"
        bankLabel="All Accounts — CIMB, Public Bank, BSN, Standard Chartered, UOB"
        onExport={({ year, month }) => exportFullReportPDF({ records, settings, year, month })}
      />
    </div>
  )
}
