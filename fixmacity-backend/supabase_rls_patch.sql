-- ============================================================
-- FIXMACITY RLS & TRIGGERS PATCH
-- 11 policy fixes across 8 tables + trg_auto_create_tache
-- ============================================================

-- ============================================================
-- 1. TRIGGER: trg_auto_create_tache
-- ============================================================
CREATE OR REPLACE FUNCTION auto_sync_tache() RETURNS TRIGGER AS $$
BEGIN
  -- Inserts into taches automatically when assigned_agent_id transitions from NULL → value
  -- Updates taches on reassignment
  IF NEW.assigned_agent_id IS NOT NULL AND OLD.assigned_agent_id IS DISTINCT FROM NEW.assigned_agent_id THEN
    IF EXISTS (SELECT 1 FROM taches WHERE declaration_id = NEW.id) THEN
      UPDATE taches 
      SET agent_id = NEW.assigned_agent_id, 
          assigned_by_chef = NEW.assigned_chef_id,
          updated_at = now()
      WHERE declaration_id = NEW.id;
    ELSE
      INSERT INTO taches (declaration_id, agent_id, assigned_by_chef, statut_tache)
      VALUES (NEW.id, NEW.assigned_agent_id, NEW.assigned_chef_id, 'en_attente');
    END IF;
  END IF;

  -- Mirrors en_cours → resolue → refusee_agent into taches.statut_tache
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'en_cours' THEN
      UPDATE taches SET statut_tache = 'en_cours', updated_at = now() WHERE declaration_id = NEW.id;
    ELSIF NEW.status = 'resolue' THEN
      UPDATE taches SET statut_tache = 'terminee', date_resolution = now(), updated_at = now() WHERE declaration_id = NEW.id;
    ELSIF NEW.status = 'refusee_agent' THEN
      UPDATE taches SET statut_tache = 'annulee', updated_at = now() WHERE declaration_id = NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_create_tache ON declarations;
CREATE TRIGGER trg_auto_create_tache
AFTER UPDATE ON declarations
FOR EACH ROW
EXECUTE FUNCTION auto_sync_tache();

-- ============================================================
-- 2. ENABLE RLS ON ALL TABLES
-- ============================================================
ALTER TABLE declarations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE taches ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE declaration_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposition_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

-- Helper functions for RLS
CREATE OR REPLACE FUNCTION current_user_role() RETURNS TEXT AS $$
  SELECT role::TEXT FROM users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION current_user_dept() RETURNS UUID AS $$
  SELECT department_id FROM users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- 3. DECLARATIONS (7 policies)
-- ============================================================
DROP POLICY IF EXISTS decl_read ON declarations;
CREATE POLICY decl_read ON declarations FOR SELECT USING (
  is_deleted = false AND (
    citizen_id = auth.uid() OR
    user_id = auth.uid() OR
    agent_id = auth.uid() OR
    (current_user_role() = 'chef' AND department_id = current_user_dept()) OR
    current_user_role() = 'president'
  )
);

DROP POLICY IF EXISTS decl_insert ON declarations;
CREATE POLICY decl_insert ON declarations FOR INSERT WITH CHECK (
  citizen_id = auth.uid() OR user_id = auth.uid()
);

DROP POLICY IF EXISTS decl_update_citizen ON declarations;
CREATE POLICY decl_update_citizen ON declarations FOR UPDATE USING (
  (citizen_id = auth.uid() OR user_id = auth.uid()) AND status = 'soumise'
);

DROP POLICY IF EXISTS decl_update_agent ON declarations;
CREATE POLICY decl_update_agent ON declarations FOR UPDATE USING (
  agent_id = auth.uid() OR assigned_agent_id = auth.uid()
);

DROP POLICY IF EXISTS decl_update_chef ON declarations;
CREATE POLICY decl_update_chef ON declarations FOR UPDATE USING (
  current_user_role() = 'chef' AND department_id = current_user_dept()
);

DROP POLICY IF EXISTS decl_update_president ON declarations;
CREATE POLICY decl_update_president ON declarations FOR UPDATE USING (
  current_user_role() = 'president'
);

DROP POLICY IF EXISTS decl_delete_citizen ON declarations;
CREATE POLICY decl_delete_citizen ON declarations FOR DELETE USING (
  (citizen_id = auth.uid() OR user_id = auth.uid()) AND status = 'soumise'
);

-- ============================================================
-- 4. USERS (5 policies)
-- ============================================================
DROP POLICY IF EXISTS users_read_self ON users;
CREATE POLICY users_read_self ON users FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS users_read_chef ON users;
CREATE POLICY users_read_chef ON users FOR SELECT USING (
  current_user_role() = 'chef' AND department_id = current_user_dept()
);

DROP POLICY IF EXISTS users_read_president ON users;
CREATE POLICY users_read_president ON users FOR SELECT USING (
  current_user_role() = 'president'
);

DROP POLICY IF EXISTS users_update_self ON users;
CREATE POLICY users_update_self ON users FOR UPDATE USING (id = auth.uid());

DROP POLICY IF EXISTS users_update_chef ON users;
CREATE POLICY users_update_chef ON users FOR UPDATE USING (
  current_user_role() = 'chef' AND department_id = current_user_dept()
);

-- ============================================================
-- 5. TACHES (4 policies)
-- ============================================================
DROP POLICY IF EXISTS taches_read ON taches;
CREATE POLICY taches_read ON taches FOR SELECT USING (
  agent_id = auth.uid() OR 
  assigned_by_chef = auth.uid() OR
  current_user_role() = 'president'
);

DROP POLICY IF EXISTS taches_insert_chef ON taches;
CREATE POLICY taches_insert_chef ON taches FOR INSERT WITH CHECK (
  current_user_role() = 'chef'
);

DROP POLICY IF EXISTS taches_update_agent ON taches;
CREATE POLICY taches_update_agent ON taches FOR UPDATE USING (
  agent_id = auth.uid()
);

DROP POLICY IF EXISTS taches_update_chef ON taches;
CREATE POLICY taches_update_chef ON taches FOR UPDATE USING (
  assigned_by_chef = auth.uid() OR current_user_role() = 'chef'
);

-- ============================================================
-- 6. INTERNAL COMMENTS (2 policies)
-- ============================================================
DROP POLICY IF EXISTS comments_read ON internal_comments;
CREATE POLICY comments_read ON internal_comments FOR SELECT USING (
  current_user_role() IN ('agent', 'chef', 'president')
);

DROP POLICY IF EXISTS comments_insert ON internal_comments;
CREATE POLICY comments_insert ON internal_comments FOR INSERT WITH CHECK (
  user_id = auth.uid() AND current_user_role() IN ('agent', 'chef', 'president')
);

-- ============================================================
-- 7. DECLARATION PHOTOS (2 policies)
-- ============================================================
DROP POLICY IF EXISTS photos_read ON declaration_photos;
CREATE POLICY photos_read ON declaration_photos FOR SELECT USING (true); -- Public read

DROP POLICY IF EXISTS photos_insert ON declaration_photos;
CREATE POLICY photos_insert ON declaration_photos FOR INSERT WITH CHECK (
  uploaded_by = auth.uid()
);

-- ============================================================
-- 8. STATUS HISTORY (2 policies)
-- ============================================================
DROP POLICY IF EXISTS status_history_read ON status_history;
CREATE POLICY status_history_read ON status_history FOR SELECT USING (true); -- Usually public or participants

DROP POLICY IF EXISTS status_history_insert ON status_history;
CREATE POLICY status_history_insert ON status_history FOR INSERT WITH CHECK (
  changed_by = auth.uid() OR changed_by IS NULL
);

-- ============================================================
-- 9. VOTES / PROPOSITION_VOTES / RATINGS (Dual-column check)
-- ============================================================
-- Votes
DROP POLICY IF EXISTS votes_read ON votes;
CREATE POLICY votes_read ON votes FOR SELECT USING (true);

DROP POLICY IF EXISTS votes_modify ON votes;
CREATE POLICY votes_modify ON votes FOR ALL USING (
  citizen_id = auth.uid() OR user_id = auth.uid()
);

-- Proposition Votes
ALTER TABLE proposition_votes ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);

DROP POLICY IF EXISTS prop_votes_read ON proposition_votes;
CREATE POLICY prop_votes_read ON proposition_votes FOR SELECT USING (true);

DROP POLICY IF EXISTS prop_votes_modify ON proposition_votes;
CREATE POLICY prop_votes_modify ON proposition_votes FOR ALL USING (
  citizen_id = auth.uid() OR user_id = auth.uid()
);

-- Ratings
DROP POLICY IF EXISTS ratings_read ON ratings;
CREATE POLICY ratings_read ON ratings FOR SELECT USING (true);

DROP POLICY IF EXISTS ratings_modify ON ratings;
CREATE POLICY ratings_modify ON ratings FOR ALL USING (
  citizen_id = auth.uid() OR user_id = auth.uid()
);
