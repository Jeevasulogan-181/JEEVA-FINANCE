-- ============================================================
-- NEXT MONTH BUDGET TABLE
-- Run this in your Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS next_month_budget (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  label       TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'other',
  amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_paid     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE next_month_budget ENABLE ROW LEVEL SECURITY;

-- Users can only see their own budget items
CREATE POLICY "Users can manage their own next_month_budget"
  ON next_month_budget
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_next_month_budget_user_id ON next_month_budget(user_id);
