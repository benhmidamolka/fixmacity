-- ============================================================
-- Migration: Add get_proposition_summary function
-- Date   : 2026-06-05
-- Purpose: Provide summary stats for propositions in president dashboard
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION get_proposition_summary(p_proposition_id UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  status TEXT,
  votes_pour INTEGER,
  votes_contre INTEGER,
  total_votes INTEGER,
  pct_pour NUMERIC,
  pct_contre NUMERIC,
  deadline TIMESTAMPTZ,
  end_date TIMESTAMPTZ
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    COALESCE(p.title, p.title_fr),
    p.status,
    p.votes_pour,
    p.votes_contre,
    (p.votes_pour + p.votes_contre) AS total_votes,
    CASE
      WHEN (p.votes_pour + p.votes_contre) = 0 THEN 0
      ELSE ROUND(p.votes_pour::NUMERIC / (p.votes_pour + p.votes_contre) * 100, 1)
    END AS pct_pour,
    CASE
      WHEN (p.votes_pour + p.votes_contre) = 0 THEN 0
      ELSE ROUND(p.votes_contre::NUMERIC / (p.votes_pour + p.votes_contre) * 100, 1)
    END AS pct_contre,
    p.deadline,
    p.end_date
  FROM propositions p
  WHERE p.id = p_proposition_id;
END;
$$;

COMMIT;