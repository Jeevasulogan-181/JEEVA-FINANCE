export default function DataTable({ headers, rows, emptyText = 'No data yet' }) {
  return (
    <div className="overflow-y-auto max-h-[350px] border border-[#EDE8DC] rounded-xl">
      <table className="w-full border-collapse text-[13px]">
        <thead className="sticky top-0 z-10">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="bg-[#FAF3DC] text-[#9C7A2E] font-semibold text-[11px] tracking-[0.8px] uppercase px-3.5 py-2.5 text-left">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="text-center text-[#A89E8C] py-6">{emptyText}</td>
            </tr>
          ) : rows}
        </tbody>
      </table>
    </div>
  )
}

export function Td({ children, className = '' }) {
  return (
    <td className={`px-3.5 py-2.5 border-b border-[#EDE8DC] text-[#6B6355] ${className}`}>
      {children}
    </td>
  )
}

export function AmountCell({ amount, positive }) {
  return (
    <td className={`px-3.5 py-2.5 border-b border-[#EDE8DC] font-semibold ${positive ? 'text-[#3BAF7E]' : 'text-[#E05C5C]'}`}>
      {positive ? '+' : '-'} {amount}
    </td>
  )
}

export function TypeBadge({ type }) {
  const colors = {
    income:     { bg: '#E8F5E9', text: '#388E3C' },
    expense:    { bg: '#FFEBEE', text: '#E05C5C' },
    savings:    { bg: '#FFF3E0', text: '#E08030' },
    deposit:    { bg: '#E8F5E9', text: '#388E3C' },
    withdrawal: { bg: '#FFEBEE', text: '#E05C5C' },
  }
  const c = colors[type] || { bg: '#F5F5F5', text: '#666' }
  return (
    <span className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
          style={{ background: c.bg, color: c.text }}>
      {type}
    </span>
  )
}
