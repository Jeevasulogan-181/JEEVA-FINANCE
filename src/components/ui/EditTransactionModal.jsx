import { useState, useEffect } from 'react'
import Modal from './Modal'
import { BtnGold } from './Button'
import { FormInput, FormSelect } from './FormField'

const INCOME_CATS  = ['Salary','Business','Food','Transport','Utilities','Entertainment','Healthcare','Shopping','Other']
const SAVINGS_CATS = ['Deposit','Withdrawal','Transfer']
const CREDIT_CATS  = ['Food','Shopping','Transport','Entertainment','Utilities','Healthcare','Travel','Other']
const DAILY_CATS   = ['Food & Drinks','Transport','Groceries','Personal Care','Entertainment','Miscellaneous']

export default function EditTransactionModal({ open, onClose, record, onSave }) {
  const [form,   setForm]   = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (record) setForm({ ...record }) }, [record])

  if (!record) return null

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const isIncome  = record.type === 'income_transaction'
  const isSavings = record.type === 'savings_transaction'
  const isCredit  = record.type === 'credit_transaction'
  const isDaily   = record.type === 'daily_expense'
  const cats = isIncome ? INCOME_CATS : isSavings ? SAVINGS_CATS : isCredit ? CREDIT_CATS : DAILY_CATS

  async function handleSave(e) {
    e.preventDefault(); setSaving(true)
    try {
      await onSave(record.id, {
        description:      form.description,
        amount:           parseFloat(form.amount),
        date:             form.date,
        category:         form.category,
        bank:             form.bank,
        transaction_type: form.transaction_type,
      })
      onClose()
    } catch(err) { console.error(err) }
    setSaving(false)
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit Transaction">
      <form onSubmit={handleSave} className="flex flex-col gap-3.5">
        <FormInput label="Description" value={form.description || ''} onChange={e => set('description', e.target.value)} placeholder="Description" required />
        <FormInput label="Amount (RM)" type="number" step="0.01" min="0.01" value={form.amount || ''} onChange={e => set('amount', e.target.value)} required />
        <FormInput label="Date" type="date" value={form.date || ''} onChange={e => set('date', e.target.value)} required />
        <FormSelect label="Category" value={form.category || ''} onChange={e => set('category', e.target.value)}>
          {cats.map(c => <option key={c} value={c}>{c}</option>)}
        </FormSelect>
        {(isIncome || isSavings) && (
          <FormSelect label="Bank" value={form.bank || ''} onChange={e => set('bank', e.target.value)}>
            {isIncome
              ? <><option value="cimb">CIMB</option><option value="public">Public Bank</option></>
              : <><option value="bsn">BSN</option><option value="sc">Standard Chartered</option></>}
          </FormSelect>
        )}
        {isIncome && (
          <FormSelect label="Type" value={form.transaction_type || ''} onChange={e => set('transaction_type', e.target.value)}>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
            <option value="savings">Transfer to Savings</option>
          </FormSelect>
        )}
        {isSavings && (
          <FormSelect label="Type" value={form.transaction_type || ''} onChange={e => set('transaction_type', e.target.value)}>
            <option value="deposit">Deposit</option>
            <option value="withdrawal">Withdrawal</option>
          </FormSelect>
        )}
        <div className="flex gap-3 mt-1">
          <BtnGold type="submit" disabled={saving} className="flex-1 justify-center">{saving ? 'Saving…' : 'Save Changes'}</BtnGold>
          <button type="button" onClick={onClose}
            className="flex-1 py-2 rounded-lg text-[13px] font-medium text-[#6B6355] border border-[#EDE8DC] hover:bg-[#FAF3DC] transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  )
}
