-- Ensure increment_vote_count RPC exists and triggers an update that our score trigger can see
CREATE OR REPLACE FUNCTION increment_vote_count(p_declaration_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE declarations
  SET votes_count = COALESCE(votes_count, 0) + 1,
      updated_at = now()
  WHERE id = p_declaration_id;
END;
$$ LANGUAGE plpgsql;
