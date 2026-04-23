-- ============================================================
-- Finance Dashboard — New Tables: Debts + Goals
-- Run this in: Supabase → SQL Editor → Run
-- ============================================================

-- ── Debts table ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.debts (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            text NOT NULL,          -- e.g. "Gold Loan", "Compassia"
  debt_type       text NOT NULL,          -- credit_card | gold | compassia | personal | car | home | other
  total_amount    numeric NOT NULL,        -- original loan amount
  remaining       numeric NOT NULL,        -- current outstanding balance
  monthly_payment numeric NOT NULL,        -- fixed monthly payment
  interest_rate   numeric DEFAULT 0,       -- annual interest rate %
  due_day         int DEFAULT 1,           -- day of month payment is due
  start_date      date,
  end_date        date,                    -- expected payoff date
  notes           text,
  color           text DEFAULT '#C9A84C',
  created_at      timestamptz DEFAULT now()
);

-- ── Debt payments table ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.debt_payments (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  debt_id    uuid NOT NULL REFERENCES public.debts(id) ON DELETE CASCADE,
  amount     numeric NOT NULL,
  date       date NOT NULL,
  notes      text,
  created_at timestamptz DEFAULT now()
);

-- ── Goals table ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.goals (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text NOT NULL,            -- e.g. "Buy a Car", "Vacation to Japan"
  goal_type     text NOT NULL,            -- savings | monthly_target | debt_free | net_worth
  target_amount numeric NOT NULL,
  current_amount numeric DEFAULT 0,
  monthly_target numeric DEFAULT 0,       -- for monthly_target type
  target_date   date,
  icon          text DEFAULT '🎯',
  color         text DEFAULT '#C9A84C',
  notes         text,
  created_at    timestamptz DEFAULT now()
);

-- ── RLS ───────────────────────────────────────────────────────
ALTER TABLE public.debts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debt_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals         ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_debts"         ON public.debts;
DROP POLICY IF EXISTS "own_debt_payments" ON public.debt_payments;
DROP POLICY IF EXISTS "own_goals"         ON public.goals;

CREATE POLICY "own_debts"         ON public.debts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_debt_payments" ON public.debt_payments
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_goals"         ON public.goals
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Done!
