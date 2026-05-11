# Email Reminders Setup Guide

Finance Dashboard sends real email reminders using:
- **Supabase Edge Functions** — serverless function that runs daily
- **Resend** — free email API (100 emails/day free tier)

---

## Step 1 — Create a free Resend account

1. Go to **[resend.com](https://resend.com)** → Sign up free
2. Go to **API Keys** → Create API Key → copy it
3. (Optional) Add and verify your own domain for a custom sender address.
   For testing, you can use `onboarding@resend.dev` as the sender.

---

## Step 2 — Install Supabase CLI

```bash
npm install -g supabase
```

---

## Step 3 — Link your project

```bash
# In your finance-app folder:
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

Your project ref is in your Supabase URL: `https://YOUR_PROJECT_REF.supabase.co`

---

## Step 4 — Set environment secrets

```bash
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxxxxxx
supabase secrets set RESEND_FROM="Finance Dashboard <onboarding@resend.dev>"
```

If you have a verified domain:
```bash
supabase secrets set RESEND_FROM="Finance Dashboard <noreply@yourdomain.com>"
```

---

## Step 5 — Deploy the Edge Function

```bash
supabase functions deploy send-reminders
```

---

## Step 6 — Schedule it to run daily at 8am

In **Supabase Dashboard → Edge Functions → send-reminders → Schedule**:

Set cron expression: `0 8 * * *`

This runs every day at 8:00 AM UTC. Adjust the hour to your timezone:
- Malaysia (MYT = UTC+8): use `0 0 * * *` (midnight UTC = 8am MYT)

---

## Step 7 — Test it manually

```bash
supabase functions invoke send-reminders
```

Or call it from the browser:
```
https://YOUR_PROJECT_REF.supabase.functions.supabase.co/send-reminders
```

---

## How it works

### Calendar reminders
- When you add a calendar event with an email address and reminder days (e.g. 7, 4, 2, 1 days before)
- The function runs daily and checks if today matches any reminder day
- If yes → sends a styled reminder email to the address you provided

### Credit card due date reminders
- When you set your UOB credit limit and add a reminder email in **Credit Card → Set Limit**
- The function sends reminders **7 days, 3 days, and 1 day** before the due date
- Email shows your current spending, credit limit, and utilization

---

## Troubleshooting

| Issue | Fix |
|---|---|
| Function not deployed | Run `supabase functions deploy send-reminders` |
| No emails received | Check Resend dashboard → Emails tab for delivery status |
| Wrong sender | Update `RESEND_FROM` secret |
| Emails going to spam | Verify your domain in Resend |
| Function errors | `supabase functions logs send-reminders` |
