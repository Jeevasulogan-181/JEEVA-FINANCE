import { supabase } from './supabase'
import { createRecord, deleteRecord } from './db'

// ─── Daily budgets (monthly GXBank top-ups) ──────────────────
export async function fetchBudgets() {
  const { data, error } = await supabase
    .from('daily_budgets')
    .select('*')
    .order('year', { ascending: false })
  if (error) throw error
  return data || []
}

export async function setBudget({ month, year, budget_amount, from_bank, notes }) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data: existing } = await supabase
    .from('daily_budgets')
    .select('id')
    .eq('user_id', user.id)
    .eq('month', month)
    .eq('year', year)
    .maybeSingle()

  if (existing) {
    const { data, error } = await supabase
      .from('daily_budgets')
      .update({ budget_amount, from_bank, notes })
      .eq('id', existing.id)
      .select()
      .single()
    if (error) throw error
    return data
  } else {
    const { data, error } = await supabase
      .from('daily_budgets')
      .insert([{ user_id: user.id, month, year, budget_amount, from_bank, notes }])
      .select()
      .single()
    if (error) throw error
    return data
  }
}

export async function deleteBudget(id) {
  const { error } = await supabase.from('daily_budgets').delete().eq('id', id)
  if (error) throw error
}

// ─── Daily expenses — stored in finance_records with type='daily_expense' ──
export async function fetchDailyExpenses() {
  const { data, error } = await supabase
    .from('finance_records')
    .select('*')
    .eq('type', 'daily_expense')
    .order('date', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createDailyExpense(expense) {
  return createRecord({ ...expense, type: 'daily_expense', bank: 'gxbank' })
}

export async function deleteDailyExpense(id) {
  return deleteRecord(id)
}
