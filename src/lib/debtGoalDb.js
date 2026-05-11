import { supabase } from './supabase'

// ─── DEBTS ───────────────────────────────────────────────────
export async function fetchDebts() {
  const { data, error } = await supabase
    .from('debts').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createDebt(debt) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('debts').insert([{ ...debt, user_id: user.id }]).select().single()
  if (error) throw error
  return data
}

export async function updateDebt(id, updates) {
  const { data, error } = await supabase
    .from('debts').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteDebt(id) {
  const { error } = await supabase.from('debts').delete().eq('id', id)
  if (error) throw error
}

export async function fetchDebtPayments(debtId = null) {
  let q = supabase.from('debt_payments').select('*').order('date', { ascending: false })
  if (debtId) q = q.eq('debt_id', debtId)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function addDebtPayment(payment) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('debt_payments').insert([{ ...payment, user_id: user.id }]).select().single()
  if (error) throw error
  return data
}

export async function deleteDebtPayment(id) {
  const { error } = await supabase.from('debt_payments').delete().eq('id', id)
  if (error) throw error
}

// ─── GOALS ───────────────────────────────────────────────────
export async function fetchGoals() {
  const { data, error } = await supabase
    .from('goals').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createGoal(goal) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('goals').insert([{ ...goal, user_id: user.id }]).select().single()
  if (error) throw error
  return data
}

export async function updateGoal(id, updates) {
  const { data, error } = await supabase
    .from('goals').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteGoal(id) {
  const { error } = await supabase.from('goals').delete().eq('id', id)
  if (error) throw error
}
