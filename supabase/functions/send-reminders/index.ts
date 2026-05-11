/**
 * Finance Dashboard — Email Reminder Edge Function
 * Pre-configured for: jeevasulogan181@gmail.com
 *
 * Runs daily via Supabase cron scheduler.
 * Sends reminders for calendar events + UOB credit card due dates.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ── These are set as Supabase Edge Function secrets ──────────
const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!
const SUPABASE_KEY     = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY   = Deno.env.get('RESEND_API_KEY') || 're_WHJz9ibh_P4AjaH5Atb7AxLuBhJbELHKh'
const RESEND_FROM      = Deno.env.get('RESEND_FROM')    || 'Finance Dashboard <onboarding@resend.dev>'
const DEFAULT_EMAIL    = 'jeevasulogan181@gmail.com'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── Send email via Resend ────────────────────────────────────
async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: RESEND_FROM, to, subject, html }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`Resend error: ${JSON.stringify(data)}`)
  return data
}

// ── Email Templates ──────────────────────────────────────────
function calendarEmail(title: string, date: string, daysAway: number, notes: string) {
  const dateFormatted = new Date(date + 'T00:00:00').toLocaleDateString('en-MY', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })
  return `
<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#FAFAF8;border-radius:16px;overflow:hidden;border:1px solid #EDE8DC;">
  <div style="background:linear-gradient(135deg,#C9A84C,#9C7A2E);padding:24px 28px;">
    <h1 style="color:white;margin:0;font-size:18px;">🔔 Event Reminder</h1>
    <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:13px;">Finance Dashboard</p>
  </div>
  <div style="padding:28px;">
    <p style="color:#6B6355;font-size:14px;margin:0 0 16px;">Hi Jeeva, you have an upcoming event:</p>
    <div style="background:white;border-radius:12px;padding:20px;border:1px solid #EDE8DC;margin-bottom:20px;">
      <h2 style="color:#2C2A25;margin:0 0 8px;font-size:17px;">${title}</h2>
      <p style="color:#A89E8C;margin:0;font-size:13px;">📅 ${dateFormatted}</p>
      ${notes ? `<p style="color:#6B6355;margin:12px 0 0;font-size:13px;border-top:1px solid #EDE8DC;padding-top:12px;">${notes}</p>` : ''}
    </div>
    <div style="background:#FAF3DC;border-radius:10px;padding:16px;text-align:center;border:1px solid #F0D98C;">
      <p style="color:#9C7A2E;font-size:16px;font-weight:bold;margin:0;">
        ${daysAway === 0 ? '📌 This event is TODAY!' : `⏰ ${daysAway} day${daysAway !== 1 ? 's' : ''} away`}
      </p>
    </div>
  </div>
  <div style="padding:14px 28px;background:#F5EED5;border-top:1px solid #EDE8DC;text-align:center;">
    <p style="color:#A89E8C;font-size:11px;margin:0;">Finance Dashboard · Your personal finance tracker</p>
  </div>
</div>`
}

function creditDueEmail(daysUntil: number, dueDay: number, spent: number, limit: number) {
  const fmt = (n: number) => 'RM ' + n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const utilised = limit > 0 ? ((spent / limit) * 100).toFixed(1) : '0'
  const urgencyColor = daysUntil <= 1 ? '#E05C5C' : daysUntil <= 3 ? '#E08030' : '#9C7A2E'
  return `
<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#FAFAF8;border-radius:16px;overflow:hidden;border:1px solid #EDE8DC;">
  <div style="background:linear-gradient(135deg,#E05C5C,#B71C1C);padding:24px 28px;">
    <h1 style="color:white;margin:0;font-size:18px;">💳 Credit Card Due Date Reminder</h1>
    <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:13px;">UOB Credit Card · Finance Dashboard</p>
  </div>
  <div style="padding:28px;">
    <p style="color:#6B6355;font-size:14px;margin:0 0 16px;">Hi Jeeva, your UOB credit card payment is coming up:</p>
    <div style="background:white;border-radius:12px;padding:20px;border:1px solid #EDE8DC;margin-bottom:20px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="color:#A89E8C;font-size:13px;padding:6px 0;">Due Date</td><td style="text-align:right;font-weight:bold;font-size:13px;color:#2C2A25;">${dueDay}th of this month</td></tr>
        <tr><td style="color:#A89E8C;font-size:13px;padding:6px 0;border-top:1px solid #EDE8DC;">Amount Spent</td><td style="text-align:right;font-weight:bold;font-size:13px;color:#E05C5C;border-top:1px solid #EDE8DC;">${fmt(spent)}</td></tr>
        <tr><td style="color:#A89E8C;font-size:13px;padding:6px 0;border-top:1px solid #EDE8DC;">Credit Limit</td><td style="text-align:right;font-size:13px;color:#2C2A25;border-top:1px solid #EDE8DC;">${fmt(limit)}</td></tr>
        <tr><td style="color:#A89E8C;font-size:13px;padding:6px 0;border-top:1px solid #EDE8DC;">Utilisation</td><td style="text-align:right;font-weight:bold;font-size:13px;color:#E05C5C;border-top:1px solid #EDE8DC;">${utilised}%</td></tr>
      </table>
    </div>
    <div style="background:#FAF3DC;border-radius:10px;padding:16px;text-align:center;border:1px solid #F0D98C;">
      <p style="color:${urgencyColor};font-size:16px;font-weight:bold;margin:0;">
        ⏰ ${daysUntil} day${daysUntil !== 1 ? 's' : ''} until payment due
      </p>
    </div>
  </div>
  <div style="padding:14px 28px;background:#F5EED5;border-top:1px solid #EDE8DC;text-align:center;">
    <p style="color:#A89E8C;font-size:11px;margin:0;">Finance Dashboard · Your personal finance tracker</p>
  </div>
</div>`
}

// ── Main handler ─────────────────────────────────────────────
Deno.serve(async (_req) => {
  const today    = new Date()
  let   sent     = 0
  const errors: string[] = []

  try {
    // ── 1. Calendar event reminders ─────────────────────────
    const { data: events } = await supabase
      .from('finance_records')
      .select('*')
      .eq('type', 'calendar_event')

    for (const ev of (events || [])) {
      if (!ev.event_date || !ev.reminder_days) continue
      const daysAway = Math.ceil(
        (new Date(ev.event_date + 'T00:00:00').getTime() - today.getTime()) / 864e5
      )
      const remDays = String(ev.reminder_days).split(',').map(Number)
      if (!remDays.includes(daysAway)) continue

      // Use event's reminder_email or fall back to default
      const toEmail = (ev.reminder_email && ev.reminder_email.trim()) ? ev.reminder_email : DEFAULT_EMAIL
      try {
        await sendEmail(
          toEmail,
          `🔔 Reminder: "${ev.event_title}" is ${daysAway === 0 ? 'today!' : `in ${daysAway} day${daysAway !== 1 ? 's' : ''}`}`,
          calendarEmail(ev.event_title, ev.event_date, daysAway, ev.note_content || '')
        )
        sent++
        console.log(`✔ Calendar reminder sent for "${ev.event_title}" → ${toEmail}`)
      } catch (e: any) {
        errors.push(`calendar[${ev.event_title}]: ${e.message}`)
      }
    }

    // ── 2. Credit card due date reminders ───────────────────
    const { data: creditConfigs } = await supabase
      .from('finance_records')
      .select('*')
      .eq('type', 'credit_settings')

    for (const cfg of (creditConfigs || [])) {
      const dueDay    = parseInt(cfg.reminder_days || '15')
      const dueDate   = new Date(today.getFullYear(), today.getMonth(), dueDay)
      const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / 864e5)

      if (![7, 3, 1].includes(daysUntil)) continue

      const { data: recs } = await supabase
        .from('finance_records')
        .select('amount')
        .eq('type', 'credit_transaction')
        .eq('user_id', cfg.user_id)

      const spent = (recs || []).reduce((s: number, r: any) => s + parseFloat(r.amount || 0), 0)
      const limit = parseFloat(cfg.credit_limit || '0')
      const toEmail = (cfg.reminder_email && cfg.reminder_email.trim()) ? cfg.reminder_email : DEFAULT_EMAIL

      try {
        await sendEmail(
          toEmail,
          `💳 UOB Credit Card due in ${daysUntil} day${daysUntil !== 1 ? 's' : ''} — ${
            'RM ' + spent.toLocaleString('en-MY', { minimumFractionDigits: 2 })
          } outstanding`,
          creditDueEmail(daysUntil, dueDay, spent, limit)
        )
        sent++
        console.log(`✔ Credit due reminder sent → ${toEmail}`)
      } catch (e: any) {
        errors.push(`credit[${toEmail}]: ${e.message}`)
      }
    }

  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      headers: { 'Content-Type': 'application/json' }, status: 500,
    })
  }

  return new Response(JSON.stringify({
    success: true,
    sent,
    errors,
    checkedAt: today.toISOString(),
  }), { headers: { 'Content-Type': 'application/json' }, status: 200 })
})
