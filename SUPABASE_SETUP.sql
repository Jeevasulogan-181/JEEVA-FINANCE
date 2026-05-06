-- ============================================================
-- Finance Dashboard — Supabase Setup
-- Run this entire file in: Supabase → SQL Editor → Run
-- ============================================================

-- ── 1. profiles table ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  text,
  email      text,
  created_at timestamptz DEFAULT now()
);

-- ── 2. finance_records table ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.finance_records (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type             text NOT NULL,
  bank             text,
  transaction_type text,
  description      text,
  category         text,
  amount           numeric DEFAULT 0,
  date             date,
  savings_target   text,
  event_title      text,
  event_date       date,
  reminder_days    text,
  reminder_email   text,
  note_title       text,
  note_content     text,
  note_color       text,
  credit_limit     numeric,
  created_at       timestamptz DEFAULT now()
);

-- ── 3. Row Level Security ─────────────────────────────────────
ALTER TABLE public.finance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles        ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_records" ON public.finance_records;
DROP POLICY IF EXISTS "own_profile" ON public.profiles;

CREATE POLICY "own_records" ON public.finance_records
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own_profile" ON public.profiles
  FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ── 4. Auto-create profile on sign-up (safe, never blocks auth) ──
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.email, '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW; -- never block a signup
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 5. Create your login user ─────────────────────────────────
-- This creates the user JEEVA with password JEEVA123
-- Email used to log in: jeeva@finance.app
-- You can change the email/password here before running.

SELECT auth.uid() as current_uid; -- just a check

DO $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Create the user in Supabase Auth
  new_user_id := (
    SELECT id FROM auth.users WHERE email = 'jeeva@finance.app' LIMIT 1
  );

  IF new_user_id IS NULL THEN
    -- Insert directly into auth.users
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      role,
      aud,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    )
    VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'jeeva@finance.app',
      crypt('JEEVA123', gen_salt('bf')),  -- bcrypt hashed password
      now(),                              -- email already confirmed
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Jeeva"}',
      false,
      'authenticated',
      'authenticated',
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO new_user_id;

    -- Create the profile row
    INSERT INTO public.profiles (id, full_name, email)
    VALUES (new_user_id, 'Jeeva', 'jeeva@finance.app')
    ON CONFLICT (id) DO NOTHING;

    RAISE NOTICE 'User created! ID: %', new_user_id;
  ELSE
    RAISE NOTICE 'User already exists. ID: %', new_user_id;
  END IF;
END;
$$;

-- ── Done! ─────────────────────────────────────────────────────
-- Login credentials:
--   Email:    jeeva@finance.app
--   Password: JEEVA123
--
-- Now go back to the app and sign in.
