import { supabase } from './supabase'

const TABLE = 'finance_records'

/** Fetch all records for the current logged-in user (RLS handles filtering) */
export async function fetchAll() {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

/** Insert a new record. user_id is automatically set via RLS default. */
export async function createRecord(record) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from(TABLE)
    .insert([{ ...record, user_id: user.id }])
    .select()
    .single()
  if (error) throw error
  return data
}

/** Delete a record by id */
export async function deleteRecord(id) {
  const { error } = await supabase.from(TABLE).delete().eq('id', id)
  if (error) throw error
}

/** Load credit settings for current user */
export async function fetchSettings() {
  const { data } = await supabase
    .from(TABLE)
    .select('*')
    .eq('type', 'credit_settings')
    .maybeSingle()
  if (!data) return { limit: 10000, due_day: 15, email: '' }
  return {
    limit:   parseFloat(data.credit_limit) || 10000,
    due_day: parseInt(data.reminder_days)  || 15,
    email:   data.reminder_email || '',
  }
}

/** Save (upsert) credit settings */
export async function saveSettings(settings) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data: existing } = await supabase
    .from(TABLE).select('id').eq('type', 'credit_settings').maybeSingle()

  if (existing) {
    const { error } = await supabase.from(TABLE).update({
      credit_limit:   settings.limit,
      reminder_days:  String(settings.due_day),
      reminder_email: settings.email,
    }).eq('id', existing.id)
    if (error) throw error
  } else {
    const { error } = await supabase.from(TABLE).insert([{
      user_id:        user.id,
      type:           'credit_settings',
      credit_limit:   settings.limit,
      reminder_days:  String(settings.due_day),
      reminder_email: settings.email,
      description:    'UOB Credit Settings',
      amount:         0,
      date:           new Date().toISOString().split('T')[0],
      bank:           'uob',
      category:       'settings',
    }])
    if (error) throw error
  }
}

/** Update an existing record by id */
export async function updateRecord(id, updates) {
  const { data, error } = await supabase
    .from('finance_records')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

/** Update any record by id */
// export async function updateRecord(id, updates) {
//   const { data, error } = await supabase
//     .from('finance_records')
//     .update(updates)
//     .eq('id', id)
//     .select()
//     .single()
//   if (error) throw error
//   return data
// }
