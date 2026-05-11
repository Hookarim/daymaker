-- =====================================================
-- Daymaker — Supabase Schema
-- =====================================================
-- Führe das einmalig in Supabase SQL Editor aus:
-- supabase.com → Project → SQL Editor → New Query → paste this → Run

-- Drop existing (only for fresh start)
-- DROP TABLE IF EXISTS user_data CASCADE;

-- Key-value store per user
CREATE TABLE IF NOT EXISTS user_data (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, key)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_data_user ON user_data(user_id);

-- Row Level Security: each user only sees their own data
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own" ON user_data;
CREATE POLICY "select_own" ON user_data
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own" ON user_data;
CREATE POLICY "insert_own" ON user_data
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own" ON user_data;
CREATE POLICY "update_own" ON user_data
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own" ON user_data;
CREATE POLICY "delete_own" ON user_data
  FOR DELETE USING (auth.uid() = user_id);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_data_updated_at ON user_data;
CREATE TRIGGER user_data_updated_at
  BEFORE UPDATE ON user_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- DONE. Check: SELECT * FROM user_data;
-- =====================================================
