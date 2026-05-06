/**
 * Finance Dashboard — One-Click Email Setup
 * Run with:  node deploy.js
 *
 * Does everything automatically:
 *   1. Deploys the send-reminders Edge Function
 *   2. Sets Resend + service role secrets
 *   3. Schedules it daily at 8am Malaysia time
 *   4. Sends a test email to confirm it works
 */

const CONFIG = {
  projectRef:     process.env.SUPABASE_PROJECT_REF || 'cxyqitkjhezqmwiqnqib',
  pat:            process.env.SUPABASE_PAT || '',  // Set in .env — never commit this
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',  // Set in .env — never commit this
  resendApiKey:   process.env.RESEND_API_KEY || '',  // Set in .env — never commit this
  resendFrom:     process.env.RESEND_FROM || 'onboarding@resend.dev',
  reminderEmail:  process.env.DEFAULT_REMINDER_EMAIL || 'jeevasulogan181@gmail.com',
}

const C = { reset:'\x1b[0m', bold:'\x1b[1m', green:'\x1b[32m', yellow:'\x1b[33m', red:'\x1b[31m', cyan:'\x1b[36m', gray:'\x1b[90m' }
const ok   = m => console.log(`${C.green}✔${C.reset}  ${m}`)
const fail = m => console.log(`${C.red}✘${C.reset}  ${m}`)
const info = m => console.log(`${C.cyan}ℹ${C.reset}  ${m}`)
const warn = m => console.log(`${C.yellow}⚠${C.reset}  ${m}`)
const div  = () => console.log(`${C.gray}${'─'.repeat(56)}${C.reset}`)

// ─── Edge Function code ──────────────────────────────────────
const FUNCTION_CODE = `import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
const RESEND_KEY  = Deno.env.get('RESEND_API_KEY') ?? 're_WHJz9ibh_P4AjaH5Atb7AxLuBhJbELHKh'
const RESEND_FROM = Deno.env.get('RESEND_FROM')    ?? 'onboarding@resend.dev'
const DEFAULT_TO  = 'jeevasulogan181@gmail.com'
const supa = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))
async function mail(to,subject,html){const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{'Authorization':\`Bearer \${RESEND_KEY}\`,'Content-Type':'application/json'},body:JSON.stringify({from:RESEND_FROM,to,subject,html})});const d=await r.json();if(!r.ok)throw new Error(JSON.stringify(d));return d}
const calHtml=(title,date,days,notes)=>\`<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#FAFAF8;border-radius:16px;overflow:hidden;border:1px solid #EDE8DC"><div style="background:linear-gradient(135deg,#C9A84C,#9C7A2E);padding:24px 28px"><h1 style="color:white;margin:0;font-size:18px">🔔 Event Reminder</h1><p style="color:rgba(255,255,255,.85);margin:6px 0 0;font-size:13px">Finance Dashboard</p></div><div style="padding:28px"><p style="color:#6B6355;font-size:14px;margin:0 0 16px">Hi Jeeva, you have an upcoming event:</p><div style="background:white;border-radius:12px;padding:20px;border:1px solid #EDE8DC;margin-bottom:20px"><h2 style="color:#2C2A25;margin:0 0 8px;font-size:17px">\${title}</h2><p style="color:#A89E8C;margin:0;font-size:13px">📅 \${new Date(date+'T00:00:00').toLocaleDateString('en-MY',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p>\${notes?\`<p style="color:#6B6355;margin:12px 0 0;font-size:13px;border-top:1px solid #EDE8DC;padding-top:12px">\${notes}</p>\`:''}</div><div style="background:#FAF3DC;border-radius:10px;padding:16px;text-align:center;border:1px solid #F0D98C"><p style="color:#9C7A2E;font-size:16px;font-weight:bold;margin:0">\${days===0?'📌 This event is TODAY!':\`⏰ \${days} day\${days!==1?'s':''} away\`}</p></div></div><div style="padding:14px 28px;background:#F5EED5;border-top:1px solid #EDE8DC;text-align:center"><p style="color:#A89E8C;font-size:11px;margin:0">Finance Dashboard · Your personal finance tracker</p></div></div>\`
const creditHtml=(days,dueDay,spent,limit)=>{const fmt=n=>'RM '+n.toLocaleString('en-MY',{minimumFractionDigits:2,maximumFractionDigits:2});const pct=limit>0?((spent/limit)*100).toFixed(1):'0';const col=days<=1?'#E05C5C':days<=3?'#E08030':'#9C7A2E';return\`<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#FAFAF8;border-radius:16px;overflow:hidden;border:1px solid #EDE8DC"><div style="background:linear-gradient(135deg,#E05C5C,#B71C1C);padding:24px 28px"><h1 style="color:white;margin:0;font-size:18px">💳 Credit Card Due Reminder</h1><p style="color:rgba(255,255,255,.85);margin:6px 0 0;font-size:13px">UOB · Finance Dashboard</p></div><div style="padding:28px"><p style="color:#6B6355;font-size:14px;margin:0 0 16px">Hi Jeeva, your UOB payment is coming up:</p><div style="background:white;border-radius:12px;padding:20px;border:1px solid #EDE8DC;margin-bottom:20px"><table style="width:100%;border-collapse:collapse"><tr><td style="color:#A89E8C;font-size:13px;padding:6px 0">Due Date</td><td style="text-align:right;font-weight:bold;font-size:13px;color:#2C2A25">\${dueDay}th of this month</td></tr><tr><td style="color:#A89E8C;font-size:13px;padding:6px 0;border-top:1px solid #EDE8DC">Amount Spent</td><td style="text-align:right;font-weight:bold;font-size:13px;color:#E05C5C;border-top:1px solid #EDE8DC">\${fmt(spent)}</td></tr><tr><td style="color:#A89E8C;font-size:13px;padding:6px 0;border-top:1px solid #EDE8DC">Credit Limit</td><td style="text-align:right;font-size:13px;color:#2C2A25;border-top:1px solid #EDE8DC">\${fmt(limit)}</td></tr><tr><td style="color:#A89E8C;font-size:13px;padding:6px 0;border-top:1px solid #EDE8DC">Utilisation</td><td style="text-align:right;font-weight:bold;font-size:13px;color:#E05C5C;border-top:1px solid #EDE8DC">\${pct}%</td></tr></table></div><div style="background:#FAF3DC;border-radius:10px;padding:16px;text-align:center;border:1px solid #F0D98C"><p style="color:\${col};font-size:16px;font-weight:bold;margin:0">⏰ \${days} day\${days!==1?'s':''} until payment due</p></div></div><div style="padding:14px 28px;background:#F5EED5;border-top:1px solid #EDE8DC;text-align:center"><p style="color:#A89E8C;font-size:11px;margin:0">Finance Dashboard · Your personal finance tracker</p></div></div>\`}
Deno.serve(async()=>{const today=new Date();let sent=0;const errors=[];try{const{data:events}=await supa.from('finance_records').select('*').eq('type','calendar_event');for(const ev of events??[]){if(!ev.event_date||!ev.reminder_days)continue;const days=Math.ceil((new Date(ev.event_date+'T00:00:00')-today)/864e5);if(!String(ev.reminder_days).split(',').map(Number).includes(days))continue;const to=ev.reminder_email?.trim()||DEFAULT_TO;try{await mail(to,\`🔔 Reminder: "\${ev.event_title}" is \${days===0?'today!':\`in \${days} day\${days!==1?'s':''}\`}\`,calHtml(ev.event_title,ev.event_date,days,ev.note_content||''));sent++}catch(e){errors.push(\`cal[\${ev.event_title}]:\${e.message}\`)}}const{data:cfgs}=await supa.from('finance_records').select('*').eq('type','credit_settings');for(const cfg of cfgs??[]){const dueDay=parseInt(cfg.reminder_days||'15');const daysUntil=Math.ceil((new Date(today.getFullYear(),today.getMonth(),dueDay)-today)/864e5);if(![7,3,1].includes(daysUntil))continue;const{data:recs}=await supa.from('finance_records').select('amount').eq('type','credit_transaction').eq('user_id',cfg.user_id);const spent=(recs??[]).reduce((s,r)=>s+parseFloat(r.amount||0),0);const to=cfg.reminder_email?.trim()||DEFAULT_TO;try{await mail(to,\`💳 UOB Credit Card due in \${daysUntil} day\${daysUntil!==1?'s':''}\`,creditHtml(daysUntil,dueDay,spent,parseFloat(cfg.credit_limit||0)));sent++}catch(e){errors.push(\`credit:\${e.message}\`)}}}catch(e){return new Response(JSON.stringify({success:false,error:e.message}),{headers:{'Content-Type':'application/json'},status:500})}return new Response(JSON.stringify({success:true,sent,errors,checkedAt:today.toISOString()}),{headers:{'Content-Type':'application/json'},status:200})})`.trim()

// ─── API call helper ─────────────────────────────────────────
async function api(path, method = 'GET', body = null) {
  const res = await fetch(`https://api.supabase.com${path}`, {
    method,
    headers: { 'Authorization': `Bearer ${CONFIG.pat}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let data; try { data = JSON.parse(text) } catch { data = text }
  return { ok: res.ok, status: res.status, data }
}

// ─── Main ────────────────────────────────────────────────────
async function main() {
  div()
  console.log(`\n${C.bold}${C.cyan}  Finance Dashboard — Email Reminder Setup${C.reset}\n`)
  div()
  console.log()

  // 1. Verify PAT
  info('Verifying connection to Supabase…')
  const proj = await api(`/v1/projects/${CONFIG.projectRef}`)
  if (proj.ok) {
    ok(`Connected: ${proj.data.name || CONFIG.projectRef}`)
  } else {
    fail(`Connection failed (${proj.status}): ${JSON.stringify(proj.data).slice(0, 100)}`)
    process.exit(1)
  }

  // 2. Set secrets
  console.log()
  info('Setting secrets…')
  const sec = await api(`/v1/projects/${CONFIG.projectRef}/secrets`, 'POST', [
    { name: 'RESEND_API_KEY',           value: CONFIG.resendApiKey },
    { name: 'RESEND_FROM',              value: CONFIG.resendFrom },
    { name: 'SUPABASE_SERVICE_ROLE_KEY', value: CONFIG.serviceRoleKey },
  ])
  if (sec.ok || sec.status === 200 || sec.status === 201) {
    ok('Secrets saved: RESEND_API_KEY, RESEND_FROM, SUPABASE_SERVICE_ROLE_KEY')
  } else {
    warn(`Secrets (${sec.status}): ${JSON.stringify(sec.data).slice(0, 100)}`)
  }

  // 3. Deploy function
  console.log()
  info('Deploying Edge Function send-reminders…')
  let deployed = false

  const put = await api(`/v1/projects/${CONFIG.projectRef}/functions/send-reminders`, 'PUT',
    { slug: 'send-reminders', name: 'send-reminders', body: FUNCTION_CODE, verify_jwt: false })

  if (put.ok || put.status === 200 || put.status === 201) {
    ok('Edge Function updated!'); deployed = true
  } else {
    const post = await api(`/v1/projects/${CONFIG.projectRef}/functions`, 'POST',
      { slug: 'send-reminders', name: 'send-reminders', body: FUNCTION_CODE, verify_jwt: false })
    if (post.ok || post.status === 200 || post.status === 201) {
      ok('Edge Function deployed!'); deployed = true
    } else {
      fail(`Deploy failed (${post.status}): ${JSON.stringify(post.data).slice(0, 150)}`)
    }
  }

  // 4. Schedule cron
  if (deployed) {
    console.log()
    info('Scheduling daily cron (8am MYT = midnight UTC)…')
    const sched = await api(`/v1/projects/${CONFIG.projectRef}/functions/send-reminders`, 'PATCH',
      { schedule: '0 0 * * *' })
    if (sched.ok) {
      ok('Schedule set: 0 0 * * * (daily 8am Malaysia time)')
    } else {
      warn('Auto-schedule failed. Set it manually:')
      warn(`→ https://supabase.com/dashboard/project/${CONFIG.projectRef}/functions`)
      warn('  Click send-reminders → Schedule tab → cron: 0 0 * * *')
    }
  }

  // 5. Send test email
  console.log()
  info('Sending test email via Resend…')
  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${CONFIG.resendApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: CONFIG.resendFrom,
      to: CONFIG.reminderEmail,
      subject: '✅ Finance Dashboard — Email Reminders Active!',
      html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#FAFAF8;border-radius:16px;overflow:hidden;border:1px solid #EDE8DC">
  <div style="background:linear-gradient(135deg,#C9A84C,#9C7A2E);padding:24px 28px">
    <h1 style="color:white;margin:0;font-size:20px">✅ Email Reminders Active!</h1>
    <p style="color:rgba(255,255,255,.85);margin:6px 0 0;font-size:13px">Finance Dashboard</p>
  </div>
  <div style="padding:28px">
    <p style="color:#2C2A25;font-size:15px;margin:0 0 12px">Hi Jeeva! 👋</p>
    <p style="color:#6B6355;font-size:14px;margin:0 0 20px">Your email reminders are now fully set up and working!</p>
    <div style="background:#FAF3DC;border-radius:12px;padding:20px;border:1px solid #F0D98C;margin-bottom:20px">
      <p style="color:#9C7A2E;font-size:13px;font-weight:bold;margin:0 0 12px">You will now receive:</p>
      <p style="color:#6B6355;font-size:13px;margin:0 0 10px">📅 <strong>Calendar reminders</strong> — email before events you add in the Calendar section</p>
      <p style="color:#6B6355;font-size:13px;margin:0">💳 <strong>UOB Credit Card reminders</strong> — email 7, 3 and 1 day before payment due date</p>
    </div>
    <div style="background:#E8F5E9;border-radius:10px;padding:14px;text-align:center;border:1px solid #C8E6C9">
      <p style="color:#388E3C;font-size:14px;font-weight:bold;margin:0">All emails → ${CONFIG.reminderEmail}</p>
    </div>
  </div>
  <div style="padding:14px 28px;background:#F5EED5;border-top:1px solid #EDE8DC;text-align:center">
    <p style="color:#A89E8C;font-size:11px;margin:0">Finance Dashboard · Your personal finance tracker</p>
  </div>
</div>`,
    }),
  })
  const emailData = await emailRes.json()
  if (emailRes.ok && emailData.id) {
    ok(`Test email sent! Check your Gmail: ${CONFIG.reminderEmail}`)
    ok(`Email ID: ${emailData.id}`)
  } else {
    fail(`Test email failed: ${JSON.stringify(emailData)}`)
    if (JSON.stringify(emailData).includes('domain') || JSON.stringify(emailData).includes('sender')) {
      warn('The sender "onboarding@resend.dev" only works if you signed up')
      warn(`to Resend with: ${CONFIG.reminderEmail}`)
      warn('Go to resend.com → check which email you used to sign up')
      warn('Then update resendFrom in this file to match, or verify your domain')
    }
  }

  // Summary
  console.log()
  div()
  console.log(`\n${C.bold}${C.green}  Done!${C.reset}\n`)
  div()
  console.log()
  console.log(`  ${C.bold}App login:${C.reset}  jeeva@finance.app  /  JEEVA123`)
  console.log(`  ${C.bold}Reminders → ${C.cyan}${CONFIG.reminderEmail}${C.reset}`)
  if (deployed) {
    console.log()
    console.log(`  ${C.bold}Test reminders manually:${C.reset}`)
    console.log(`  ${C.cyan}https://${CONFIG.projectRef}.supabase.co/functions/v1/send-reminders${C.reset}`)
  }
  console.log()
}

main().catch(e => { fail(`Fatal: ${e.message}`); process.exit(1) })