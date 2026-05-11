export default function StatCard({ label, value, valueColor, sub, icon }) {
  return (
    <div className="bg-white rounded-2xl border border-[#EDE8DC] px-5 py-4"
         style={{ boxShadow: '0 2px 12px rgba(180,150,60,0.10)' }}>
      {icon && (
        <div className="flex items-center gap-2 mb-2">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
               style={{ background: icon.bg }}>
            <icon.Component size={16} color="white" />
          </div>
          <span className="text-[12px] text-[#A89E8C]">{label}</span>
        </div>
      )}
      {!icon && <p className="text-[12px] text-[#A89E8C] mb-1">{label}</p>}
      <p className="font-display text-[22px] font-bold" style={{ color: valueColor || '#2C2A25' }}>
        {value}
      </p>
      {sub && <p className="text-[11px] text-[#A89E8C] mt-1">{sub}</p>}
    </div>
  )
}
