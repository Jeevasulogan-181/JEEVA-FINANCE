import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isConfigured =
  url && key &&
  url !== 'your_supabase_project_url' &&
  key !== 'your_supabase_anon_key'

export const supabase = createClient(
  url  || 'https://cxyqitkjhezqmwiqnqib.supabase.co',
  key  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4eXFpdGtqaGV6cW13aXFucWliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3MjM2ODksImV4cCI6MjA4OTI5OTY4OX0._igBugY6ibSXhEztPIgigPTY4K6Pp4s35Kw_Nw-JUf4'
)
