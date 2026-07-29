-- ScoreZero Database Schema
-- Run this ONCE in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/ckwjxaphxscgraiewewa/sql/new

-- ─── Drop & recreate (safe for first run) ────────────────────────────────────
DROP TABLE IF EXISTS recommendations CASCADE;
DROP TABLE IF EXISTS scores CASCADE;
DROP TABLE IF EXISTS uploads CASCADE;

-- ─── uploads ─────────────────────────────────────────────────────────────────
-- Tracks upload processing status only. PDF bytes are NEVER stored.
CREATE TABLE uploads (
  upload_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  file_name VARCHAR NOT NULL,
  file_path VARCHAR NOT NULL DEFAULT 'memory://',
  file_size_bytes INTEGER CHECK (file_size_bytes <= 15728640),
  status VARCHAR DEFAULT 'processing'
    CHECK (status IN ('processing', 'completed', 'failed', 'low_confidence')),
  statement_start_date DATE,
  statement_end_date DATE,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_uploads_user_uploaded
  ON uploads (user_id, uploaded_at DESC);

-- ─── scores ──────────────────────────────────────────────────────────────────
CREATE TABLE scores (
  score_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID REFERENCES uploads(upload_id) ON DELETE CASCADE UNIQUE,
  user_id UUID NOT NULL,
  income_regularity_score NUMERIC(5,2) CHECK (income_regularity_score BETWEEN 0 AND 100),
  savings_ratio_score NUMERIC(5,2) CHECK (savings_ratio_score BETWEEN 0 AND 100),
  spending_discipline_score NUMERIC(5,2) CHECK (spending_discipline_score BETWEEN 0 AND 100),
  bounce_frequency_score NUMERIC(5,2) CHECK (bounce_frequency_score BETWEEN 0 AND 100),
  balance_trend_score NUMERIC(5,2) CHECK (balance_trend_score BETWEEN 0 AND 100),
  score_value INTEGER CHECK (score_value BETWEEN 0 AND 100),
  score_band VARCHAR CHECK (score_band IN ('Poor', 'Fair', 'Good', 'Very Good', 'Excellent')),
  calculated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_scores_user_history
  ON scores (user_id, calculated_at DESC);

-- ─── recommendations ─────────────────────────────────────────────────────────
CREATE TABLE recommendations (
  recommendation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  score_id UUID REFERENCES scores(score_id) ON DELETE CASCADE UNIQUE,
  explanation_text TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]',
  ai_generated BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Row Level Security ───────────────────────────────────────────────────────
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

-- Service role (backend) bypasses RLS automatically.
-- These policies allow frontend direct reads if ever needed:
CREATE POLICY "users_own_uploads" ON uploads
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_own_scores" ON scores
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_own_recommendations" ON recommendations
  FOR ALL USING (
    score_id IN (SELECT score_id FROM scores WHERE user_id = auth.uid())
  );

-- ─── Verify ───────────────────────────────────────────────────────────────────
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('uploads', 'scores', 'recommendations')
ORDER BY table_name;
-- Should return 3 rows: recommendations, scores, uploads
