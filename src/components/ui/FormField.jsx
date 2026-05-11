export function FormInput({ label, id, ...props }) {
  return (
    <div>
      {label && <label htmlFor={id} className="block text-[12px] font-semibold text-[#6B6355] mb-1">{label}</label>}
      <input id={id} {...props}
        className="w-full px-3 py-2.5 border-[1.5px] border-[#EDE8DC] rounded-[9px] text-[13.5px] outline-none
          bg-[#FAFAF8] text-[#2C2A25] focus:border-[#C9A84C] focus:bg-white transition-colors" />
    </div>
  )
}

export function FormSelect({ label, id, children, ...props }) {
  return (
    <div>
      {label && <label htmlFor={id} className="block text-[12px] font-semibold text-[#6B6355] mb-1">{label}</label>}
      <select id={id} {...props}
        className="w-full px-3 py-2.5 border-[1.5px] border-[#EDE8DC] rounded-[9px] text-[13.5px] outline-none
          bg-[#FAFAF8] text-[#2C2A25] focus:border-[#C9A84C] focus:bg-white transition-colors cursor-pointer appearance-none"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23C9A84C' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                 backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: '36px' }}>
        {children}
      </select>
    </div>
  )
}

export function FormTextarea({ label, id, ...props }) {
  return (
    <div>
      {label && <label htmlFor={id} className="block text-[12px] font-semibold text-[#6B6355] mb-1">{label}</label>}
      <textarea id={id} {...props}
        className="w-full px-3 py-2.5 border-[1.5px] border-[#EDE8DC] rounded-[9px] text-[13.5px] outline-none
          bg-[#FAFAF8] text-[#2C2A25] focus:border-[#C9A84C] focus:bg-white transition-colors resize-none" />
    </div>
  )
}
