-- ============================================================
-- FIXMACITY — corrections_v2.sql
-- Run this in the Supabase SQL Editor (paste → Run).
-- Safe to re-run: uses CREATE OR REPLACE, DROP IF EXISTS,
-- ON CONFLICT DO UPDATE, and ALTER TABLE IF NOT EXISTS.
-- ============================================================


-- ============================================================
-- FIX 1
-- Drop the duplicate ref trigger — it conflicts with the app's
-- own ref generation via increment_ref_sequence RPC.
-- ============================================================
DROP TRIGGER IF EXISTS trg_set_ref_citoyen ON declarations;
DROP FUNCTION IF EXISTS trg_set_ref_citoyen();


-- ============================================================
-- FIX 2
-- Recreate get_nearby_declarations.
--
-- ROOT CAUSE of your error:
--   PostgreSQL treats RETURNS TABLE columns as OUT parameters.
--   Having BOTH an IN parameter called "category" AND a
--   RETURNS TABLE column called "category" in the same function
--   is a name conflict — hence "parameter name used more than once".
--
-- FIX:
--   • Rename the IN parameter to p_category (consistent with the
--     rest of the codebase: p_user_id, p_prefix, etc.)
--   • Keep the output column named "category" (no change for callers)
--   • Fix the status filter: use lowercase enum values
--     'resolue','cloturee' instead of 'RESOLU','CLOTURE'
--   • The JS controller is updated in the companion patch below.
-- ============================================================

-- Remove any previous version of the function (both param-name variants)
DROP FUNCTION IF EXISTS get_nearby_declarations(FLOAT8, FLOAT8, FLOAT8, TEXT);

CREATE OR REPLACE FUNCTION get_nearby_declarations(
  lat        FLOAT8,
  lng        FLOAT8,
  radius     FLOAT8,      -- metres; default 200 used at the call-site
  p_category TEXT         -- renamed from "category" to avoid RETURNS TABLE conflict
)
RETURNS TABLE (
  id          UUID,
  title       TEXT,
  ref_citoyen TEXT,
  category    TEXT,       -- output column; no conflict because input is p_category
  status      declaration_status,
  latitude    FLOAT8,
  longitude   FLOAT8,
  address     TEXT,
  votes_count INTEGER,
  created_at  TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.title,
    d.ref_citoyen,
    d.category,
    d.status,
    d.latitude,
    d.longitude,
    d.address,
    d.votes_count,
    d.created_at
  FROM declarations d
  WHERE
    d.is_deleted  = false
    AND d.deleted_at  IS NULL
    AND d.category    = p_category          -- uses renamed IN parameter
    AND d.status NOT IN ('resolue', 'cloturee')   -- FIX: correct lowercase enum values
    AND d.location    IS NOT NULL
    AND ST_DWithin(
          d.location::geography,
          ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
          radius
        )
  ORDER BY d.votes_count DESC, d.created_at DESC
  LIMIT 10;
END;
$$;


-- ============================================================
-- FIX 3
-- Re-seed delegations and services with the pinned UUIDs that
-- the Postman test sequence and UUID Reference section expect.
-- ============================================================

INSERT INTO delegations (id, name, code) VALUES
  ('a309fed2-6c50-49ae-b2be-a6e7ccd096df', 'Sousse Ville',            'SV'),
  ('0ede6556-2f67-4a0d-a7cb-d0cdca4504a5', 'Sousse Jawhara',          'SJ'),
  ('a1ca5994-b186-4970-91f6-c44925cfc4b4', 'Sousse Sidi Abdelhamid',  'SA')
ON CONFLICT (code) DO UPDATE
  SET id   = EXCLUDED.id,
      name = EXCLUDED.name;

INSERT INTO services (id, name_fr, name_ar, name_en, code, is_active) VALUES
  ('c3c9d2cd-4b55-481b-b577-92ae1ee7d8d1', 'Voirie & Routes',         'الطرق والأرصفة',      'Roads & Pavements',   'VR', true),
  ('af6c8348-0e2b-40fe-b4aa-54629d483559', 'Éclairage public',        'الإنارة العمومية',    'Street Lighting',     'EP', true),
  ('5ab878b9-2d37-455e-b8cf-7fe91dd5e088', 'Propreté & Déchets',      'النظافة والنفايات',   'Waste & Cleanliness', 'PD', true),
  ('f6c86d36-3e26-442f-9e3f-2b745083109f', 'Espaces verts',           'المساحات الخضراء',    'Green Spaces',        'EV', true),
  ('48256387-922e-4af8-854a-f09738f15fdc', 'Réseaux & Drainage',      'الشبكات',             'Networks & Drainage', 'EA', true),
  ('bd7043c9-b2c7-4ca1-b3e9-777a3bdc2dbd', 'Signalisation routière',  'الإشارات المرورية',   'Traffic Signaling',   'ST', true),
  ('090910f9-c9f6-4e84-b7ed-46789d4e4eaf', 'Administratif',           'الشؤون الإدارية',     'Administrative',      'BP', true),
  ('3cf62603-5e0e-4978-86dc-ef3b00985b25', 'Suggestions',             'الاقتراحات',          'Suggestions',         'SG', true)
ON CONFLICT (code) DO UPDATE
  SET id        = EXCLUDED.id,
      name_fr   = EXCLUDED.name_fr,
      name_ar   = EXCLUDED.name_ar,
      name_en   = EXCLUDED.name_en,
      is_active = EXCLUDED.is_active;

-- Make sure ref_sequences has entries for every code
INSERT INTO ref_sequences (prefix, current_value) VALUES
  ('SV', 0), ('SJ', 0), ('SA', 0),
  ('VR', 0), ('EP', 0), ('PD', 0),
  ('EV', 0), ('EA', 0), ('ST', 0),
  ('BP', 0), ('SG', 0)
ON CONFLICT (prefix) DO NOTHING;


-- ============================================================
-- FIX 4
-- Add UNIQUE constraint on votes(declaration_id, user_id) so the
-- app-level alias column is also uniqueness-enforced (not only
-- the citizen_id column that the original schema constrained).
-- ============================================================
ALTER TABLE votes
  DROP CONSTRAINT IF EXISTS votes_one_per_user;

ALTER TABLE votes
  ADD CONSTRAINT votes_one_per_user
  UNIQUE (declaration_id, user_id);


-- ============================================================
-- FIX 5
-- guard_declaration_edit now also checks department_id (the
-- column the app actually writes) alongside service_id.
-- ============================================================
CREATE OR REPLACE FUNCTION guard_declaration_edit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status != 'soumise' AND (
       OLD.title         IS DISTINCT FROM NEW.title
    OR OLD.description   IS DISTINCT FROM NEW.description
    OR OLD.service_id    IS DISTINCT FROM NEW.service_id
    OR OLD.department_id IS DISTINCT FROM NEW.department_id
    OR OLD.type_probleme IS DISTINCT FROM NEW.type_probleme
  ) THEN
    RAISE EXCEPTION
      'EDIT_LOCKED: Declaration can only be edited when status is soumise. Current: %',
      OLD.status;
  END IF;
  RETURN NEW;
END;
$$;


-- ============================================================
-- FIX 6
-- v_map_declarations now coalesces service_id / department_id
-- so the service name appears regardless of which column the
-- app wrote to.
-- ============================================================
CREATE OR REPLACE VIEW v_map_declarations AS
SELECT
  d.id,
  d.title,
  d.category,
  d.type_probleme,
  d.latitude,
  d.longitude,
  d.address,
  d.delegation_id,
  d.created_at,
  s.name_fr AS service_name_fr,
  s.name_en AS service_name_en,
  CASE d.status
    WHEN 'en_cours' THEN 'EN COURS'
    WHEN 'resolue'  THEN 'TERMINE'
    WHEN 'cloturee' THEN 'TERMINE'
    ELSE 'EN ATTENTE'
  END AS citizen_status,
  CASE d.status
    WHEN 'en_cours' THEN 'blue'
    WHEN 'resolue'  THEN 'green'
    WHEN 'cloturee' THEN 'green'
    ELSE 'yellow'
  END AS pin_color
FROM declarations d
LEFT JOIN services s ON s.id = COALESCE(d.service_id, d.department_id)
WHERE d.is_deleted = false
  AND d.deleted_at IS NULL;


-- ============================================================
-- FIX 7
-- Create close_expired_propositions() — closes any active
-- proposition whose end_date (or deadline) has passed.
-- Returns the number of rows closed so the CRON log is useful.
-- ============================================================
CREATE OR REPLACE FUNCTION close_expired_propositions()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE propositions
  SET    status     = 'closed',
         updated_at = now()
  WHERE  status = 'active'
    AND  COALESCE(end_date, deadline) < now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;


-- ============================================================
-- FIX 8
-- Create get_proposition_summary(p_proposition_id) — returns
-- vote totals and percentages for one proposition.
-- ============================================================
CREATE OR REPLACE FUNCTION get_proposition_summary(p_proposition_id UUID)
RETURNS TABLE (
  proposition_id UUID,
  title          TEXT,
  status         TEXT,
  votes_pour     INTEGER,
  votes_contre   INTEGER,
  total_votes    INTEGER,
  pct_pour       NUMERIC,
  pct_contre     NUMERIC,
  end_date       TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.title,
    p.status,
    p.votes_pour,
    p.votes_contre,
    (p.votes_pour + p.votes_contre)                                        AS total_votes,
    CASE WHEN (p.votes_pour + p.votes_contre) = 0 THEN 0
         ELSE ROUND(p.votes_pour::NUMERIC
                    / (p.votes_pour + p.votes_contre) * 100, 1)
    END                                                                    AS pct_pour,
    CASE WHEN (p.votes_pour + p.votes_contre) = 0 THEN 0
         ELSE ROUND(p.votes_contre::NUMERIC
                    / (p.votes_pour + p.votes_contre) * 100, 1)
    END                                                                    AS pct_contre,
    COALESCE(p.end_date, p.deadline)                                       AS end_date
  FROM propositions p
  WHERE p.id = p_proposition_id;
END;
$$;


-- ============================================================
-- FIX 9
-- Create v_propositions_active — active propositions enriched
-- with pre-computed vote totals and percentages.
-- ============================================================
CREATE OR REPLACE VIEW v_propositions_active AS
SELECT
  p.id,
  p.title,
  p.title_fr,
  p.title_ar,
  p.title_en,
  p.description,
  p.description_fr,
  p.description_ar,
  p.description_en,
  p.status,
  p.start_date,
  COALESCE(p.end_date, p.deadline)                              AS end_date,
  p.published_at,
  p.created_by,
  p.votes_pour,
  p.votes_contre,
  (p.votes_pour + p.votes_contre)                              AS total_votes,
  CASE WHEN (p.votes_pour + p.votes_contre) = 0 THEN 0
       ELSE ROUND(p.votes_pour::NUMERIC
                  / (p.votes_pour + p.votes_contre) * 100, 1)
  END                                                          AS pct_pour,
  CASE WHEN (p.votes_pour + p.votes_contre) = 0 THEN 0
       ELSE ROUND(p.votes_contre::NUMERIC
                  / (p.votes_pour + p.votes_contre) * 100, 1)
  END                                                          AS pct_contre,
  p.created_at,
  p.updated_at
FROM propositions p
WHERE p.status = 'active'
  AND COALESCE(p.end_date, p.deadline) > now();


-- ============================================================
-- Make sure status_history.changed_by is nullable
-- (the auto-close CRON passes NULL as changedBy)
-- ============================================================
ALTER TABLE status_history
  ALTER COLUMN changed_by DROP NOT NULL;


-- ============================================================
-- VERIFY — run these after to confirm everything exists
-- ============================================================

-- Should list all 6 functions
SELECT proname AS function_name, pg_get_function_arguments(oid) AS args
FROM   pg_proc
WHERE  proname IN (
  'get_nearby_declarations',
  'close_expired_propositions',
  'get_proposition_summary',
  'increment_ref_sequence',
  'increment_vote_count',
  'get_unread_notification_count'
)
ORDER BY proname;

-- Should list 4 views
SELECT viewname
FROM   pg_views
WHERE  schemaname = 'public'
  AND  viewname IN (
    'v_declarations_citizen',
    'v_map_declarations',
    'v_propositions_active',
    'departments'
  )
ORDER BY viewname;

-- Should list 3 constraints
SELECT conname, contype
FROM   pg_constraint
WHERE  conname IN (
  'votes_one_per_citizen',
  'votes_one_per_user',
  'proposition_votes_unique'
);

-- Should show delegations with pinned UUIDs
SELECT id, name, code FROM delegations ORDER BY code;

