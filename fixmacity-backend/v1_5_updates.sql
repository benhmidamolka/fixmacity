-- ============================================================
-- FIXMACITY — v1_5_updates.sql
-- Implements previously deferred v1.5 features for v1.0 final.
-- ============================================================

-- 0. Add priority column if it doesn't exist
ALTER TABLE declarations ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'moyenne';

-- 1. PRIORITY SCORE + SORTING
-- Add priority_score column to declarations (already added but for safety)
ALTER TABLE declarations ADD COLUMN IF NOT EXISTS priority_score FLOAT8 DEFAULT 0;

-- Function to calculate priority score
CREATE OR REPLACE FUNCTION calculate_priority_score(
  p_priority TEXT,
  p_votes_count INTEGER,
  p_created_at TIMESTAMPTZ
) RETURNS FLOAT8 AS $$
DECLARE
  v_base_score FLOAT8;
  v_age_days FLOAT8;
BEGIN
  -- Base score from priority
  v_base_score := CASE p_priority
    WHEN 'haute'   THEN 100
    WHEN 'moyenne' THEN 50
    WHEN 'basse'   THEN 10
    ELSE 50 -- Default to moyenne if null
  END;

  -- Age penalty (decays by 1 point per day)
  -- Use COALESCE(p_created_at, now()) to avoid nulls
  v_age_days := EXTRACT(EPOCH FROM (now() - COALESCE(p_created_at, now()))) / 86400;

  -- Final score: base + votes weight - age decay
  RETURN v_base_score + (COALESCE(p_votes_count, 0) * 5) - v_age_days;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to auto-update priority_score
CREATE OR REPLACE FUNCTION trg_update_priority_score()
RETURNS TRIGGER AS $$
BEGIN
  NEW.priority_score := calculate_priority_score(NEW.priority, NEW.votes_count, NEW.created_at);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to declarations
DROP TRIGGER IF EXISTS trg_declarations_priority_score ON declarations;
CREATE TRIGGER trg_declarations_priority_score
BEFORE INSERT OR UPDATE OF priority, votes_count ON declarations
FOR EACH ROW EXECUTE FUNCTION trg_update_priority_score();

-- Update existing rows
UPDATE declarations SET priority = 'moyenne' WHERE priority IS NULL;
UPDATE declarations SET priority_score = calculate_priority_score(priority, votes_count, created_at);


-- 2. TASKS / TACHES ENTITY
CREATE TABLE IF NOT EXISTS tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  declaration_id UUID REFERENCES declarations(id) ON DELETE CASCADE,
  intervention_id UUID, -- Optional link to intervention if exists
  title         TEXT NOT NULL,
  description   TEXT,
  status        TEXT DEFAULT 'todo', -- todo, doing, done
  assigned_to   UUID REFERENCES users(id),
  due_date      TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- 3. REFRESH TOKENS
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token         TEXT NOT NULL UNIQUE,
  expires_at    TIMESTAMPTZ NOT NULL,
  revoked_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- 4. PHOTO AVANT / PHOTO APRES CLARIFICATION
ALTER TABLE declarations ADD COLUMN IF NOT EXISTS photo_avant TEXT;
ALTER TABLE declarations ADD COLUMN IF NOT EXISTS photo_apres TEXT;

-- 5. RPC FOR VOTES (Ensure it triggers score update)
CREATE OR REPLACE FUNCTION increment_vote_count(p_declaration_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE declarations
  SET votes_count = COALESCE(votes_count, 0) + 1,
      updated_at = now()
  WHERE id = p_declaration_id;
END;
$$ LANGUAGE plpgsql;
