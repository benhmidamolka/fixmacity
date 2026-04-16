-- ============================================================
-- SQL PATCH FOR NOTIFICATIONS & PROPOSITIONS
-- Run this in your local PostgreSQL terminal or pgAdmin 
-- to safely create the tables without overwriting anything else.
-- ============================================================

-- 1. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  type TEXT,
  reference_id UUID,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index to optimize fetching unread notifications quickly
CREATE INDEX IF NOT EXISTS idx_notifications_unread 
ON notifications(user_id, is_read) WHERE is_read = false;


-- 2. Propositions Table (For Citizens to Vote On)
CREATE TABLE IF NOT EXISTS propositions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  published_at TIMESTAMPTZ DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'archived')),
  votes_pour INTEGER DEFAULT 0,
  votes_contre INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Proposition Votes Table (Tracking Citizen Votes)
CREATE TABLE IF NOT EXISTS proposition_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposition_id UUID NOT NULL REFERENCES propositions(id) ON DELETE CASCADE,
  citizen_id UUID REFERENCES users(id) ON DELETE CASCADE,
  vote vote_value NOT NULL,
  voted_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT proposition_votes_unique UNIQUE (proposition_id, citizen_id)
);

-- 4. Automatically Sync Vote Counts
CREATE OR REPLACE FUNCTION sync_proposition_vote_counts() RETURNS TRIGGER AS $$
DECLARE v_prop_id UUID;
BEGIN 
  v_prop_id := COALESCE(NEW.proposition_id, OLD.proposition_id);
  UPDATE propositions
  SET votes_pour = (
      SELECT COUNT(*)
      FROM proposition_votes
      WHERE proposition_id = v_prop_id
        AND vote = 'pour'
    ),
    votes_contre = (
      SELECT COUNT(*)
      FROM proposition_votes
      WHERE proposition_id = v_prop_id
        AND vote = 'contre'
    ),
    updated_at = now()
  WHERE id = v_prop_id;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_proposition_votes ON proposition_votes;
CREATE TRIGGER trg_sync_proposition_votes
AFTER INSERT OR DELETE OR UPDATE ON proposition_votes 
FOR EACH ROW EXECUTE FUNCTION sync_proposition_vote_counts();

-- 5. Close Expired Propositions (Helper RPC Function)
CREATE OR REPLACE FUNCTION close_expired_propositions() RETURNS VOID AS $$ 
BEGIN
  UPDATE propositions
  SET status = 'closed'
  WHERE status = 'active'
    AND end_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;
