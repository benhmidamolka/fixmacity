-- ============================================================
-- FIXMACITY — Complete Database Setup (v2 corrected)
-- Run once in the Supabase SQL editor.
-- Fixes: pgcrypto, votes table, status case bug, status_history
--        trigger, priority trigger UPDATE, removed duplicate patch
-- ============================================================
-- EXTENSIONS
-- FIXED: gen_random_uuid() comes from pgcrypto, NOT uuid-ossp
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
-- ============================================================
-- ENUMS
-- ============================================================
DO $$ BEGIN CREATE TYPE user_role AS ENUM ('citizen', 'agent', 'chef', 'president');
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN CREATE TYPE declaration_status AS ENUM (
  'soumise',
  'assignee_chef',
  'assignee_agent',
  'en_cours',
  'refusee_chef',
  'refusee_agent',
  'resolue',
  'cloturee'
);
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN CREATE TYPE declaration_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN CREATE TYPE attachment_type AS ENUM ('photo_avant', 'photo_apres', 'document', 'pdf');
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN CREATE TYPE task_status AS ENUM ('en_attente', 'en_cours', 'terminee', 'annulee');
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN CREATE TYPE lang_code AS ENUM ('fr', 'ar', 'en');
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN CREATE TYPE vote_value AS ENUM ('pour', 'contre');
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;
-- ============================================================
-- CORE TABLES
-- ============================================================
CREATE TABLE IF NOT EXISTS delegations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_fr TEXT NOT NULL,
  name_ar TEXT,
  name_en TEXT,
  description TEXT,
  chef_id UUID,
  icon TEXT,
  code TEXT UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  refresh_token TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'citizen',
  is_active BOOLEAN DEFAULT true,
  lang_pref lang_code DEFAULT 'fr',
  address TEXT,
  birth_date DATE,
  delegation_id UUID REFERENCES delegations(id),
  department_id UUID REFERENCES services(id),
  is_available BOOLEAN DEFAULT true,
  speciality TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
DO $$ BEGIN IF NOT EXISTS (
  SELECT 1
  FROM pg_constraint
  WHERE conname = 'services_chef_id_fkey'
) THEN
ALTER TABLE services
ADD CONSTRAINT services_chef_id_fkey FOREIGN KEY (chef_id) REFERENCES users(id);
END IF;
END $$;
-- Sequence tables
CREATE TABLE IF NOT EXISTS declaration_sequences (
  delegation_code TEXT NOT NULL,
  date_key TEXT NOT NULL,
  last_seq INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (delegation_code, date_key)
);
CREATE TABLE IF NOT EXISTS service_sequences (
  service_code TEXT NOT NULL,
  date_key TEXT NOT NULL,
  last_seq INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (service_code, date_key)
);
CREATE TABLE IF NOT EXISTS ref_sequences (
  prefix TEXT PRIMARY KEY,
  current_value INTEGER NOT NULL DEFAULT 0
);
-- ============================================================
-- DECLARATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS declarations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  citizen_id UUID NOT NULL REFERENCES users(id),
  user_id UUID REFERENCES users(id),
  service_id UUID REFERENCES services(id),
  department_id UUID REFERENCES services(id),
  agent_id UUID REFERENCES users(id),
  assigned_chef_id UUID REFERENCES users(id),
  assigned_agent_id UUID REFERENCES users(id),
  delegation_id UUID REFERENCES delegations(id),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  type_probleme TEXT,
  photo_avant_url TEXT,
  latitude FLOAT8,
  longitude FLOAT8,
  location GEOMETRY(Point, 4326),
  address TEXT,
  status declaration_status NOT NULL DEFAULT 'soumise',
  priority_score FLOAT8 DEFAULT 0,
  votes_count INTEGER DEFAULT 0,
  ref_citoyen TEXT UNIQUE,
  ref_service TEXT UNIQUE,
  ref_sequence INTEGER,
  assigned_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
-- ============================================================
-- SUPPORTING TABLES
-- ============================================================
CREATE TABLE IF NOT EXISTS taches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  declaration_id UUID NOT NULL REFERENCES declarations(id),
  agent_id UUID REFERENCES users(id),
  assigned_by_chef UUID REFERENCES users(id),
  date_assignation TIMESTAMPTZ DEFAULT now(),
  date_resolution TIMESTAMPTZ,
  rapport_interne TEXT,
  photo_apres_url TEXT,
  statut_tache task_status NOT NULL DEFAULT 'en_attente',
  motif_refus TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS declaration_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  declaration_id UUID NOT NULL REFERENCES declarations(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  public_id TEXT,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  photo_type TEXT DEFAULT 'before' CHECK (photo_type IN ('before', 'after', 'closure')),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS internal_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  declaration_id UUID NOT NULL REFERENCES declarations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
-- NULLABLE changed_by: required for CRON auto-close which passes null
CREATE TABLE IF NOT EXISTS status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  declaration_id UUID NOT NULL REFERENCES declarations(id),
  old_status declaration_status,
  new_status declaration_status NOT NULL,
  changed_by UUID REFERENCES users(id),
  raison TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  declaration_id UUID NOT NULL REFERENCES declarations(id),
  uploaded_by UUID NOT NULL REFERENCES users(id),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size_kb INTEGER,
  type attachment_type NOT NULL DEFAULT 'photo_avant',
  created_at TIMESTAMPTZ DEFAULT now()
);
-- FIXED: each row stores ONE vote VALUE per citizen — NOT a vote_count counter.
-- The old design had vote_count INTEGER DEFAULT 0 which was logically wrong.
CREATE TABLE IF NOT EXISTS votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  declaration_id UUID NOT NULL REFERENCES declarations(id),
  citizen_id UUID REFERENCES users(id),
  user_id UUID REFERENCES users(id),
  vote vote_value NOT NULL DEFAULT 'pour',
  voted_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT votes_one_per_citizen UNIQUE (declaration_id, citizen_id)
);
-- Column is `score` (canonical per PRD), `rating` alias kept for compat
CREATE TABLE IF NOT EXISTS ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  declaration_id UUID NOT NULL REFERENCES declarations(id),
  citizen_id UUID REFERENCES users(id),
  user_id UUID REFERENCES users(id),
  score SMALLINT CHECK (
    score >= 1
    AND score <= 5
  ),
  rating SMALLINT CHECK (
    rating >= 1
    AND rating <= 5
  ),
  comment TEXT,
  rated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT ratings_one_per_user_declaration UNIQUE (declaration_id, user_id)
);
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  body TEXT,
  type TEXT,
  reference_id UUID,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS chatbot_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  messages JSONB DEFAULT '[]'::jsonb,
  lang lang_code DEFAULT 'fr',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS token_blacklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
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
CREATE TABLE IF NOT EXISTS proposition_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposition_id UUID NOT NULL REFERENCES propositions(id),
  citizen_id UUID REFERENCES users(id),
  vote vote_value NOT NULL,
  voted_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT proposition_votes_unique UNIQUE (proposition_id, citizen_id)
);
-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_declarations_status ON declarations(status);
CREATE INDEX IF NOT EXISTS idx_declarations_citizen ON declarations(citizen_id);
CREATE INDEX IF NOT EXISTS idx_declarations_delegation ON declarations(delegation_id);
CREATE INDEX IF NOT EXISTS idx_declarations_priority ON declarations(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_declarations_created ON declarations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_declarations_ref_c ON declarations(ref_citoyen);
CREATE INDEX IF NOT EXISTS idx_declarations_ref_s ON declarations(ref_service);
CREATE INDEX IF NOT EXISTS idx_declarations_location ON declarations USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_declarations_soft_del ON declarations(is_deleted)
WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_status_history_decl ON status_history(declaration_id);
CREATE INDEX IF NOT EXISTS idx_votes_declaration ON votes(declaration_id);
CREATE INDEX IF NOT EXISTS idx_ratings_citizen ON ratings(citizen_id);
CREATE INDEX IF NOT EXISTS idx_propositions_status ON propositions(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read)
WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_token_blacklist ON token_blacklist(token);
CREATE INDEX IF NOT EXISTS idx_token_bl_expires ON token_blacklist(expires_at);
-- ============================================================
-- FUNCTIONS
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION generate_ref_citoyen(p_delegation_code TEXT, p_date TIMESTAMPTZ) RETURNS TEXT AS $$
DECLARE v_date_key TEXT;
v_seq INTEGER;
BEGIN v_date_key := TO_CHAR(p_date, 'DD-MM-YY');
INSERT INTO declaration_sequences(delegation_code, date_key, last_seq)
VALUES (p_delegation_code, v_date_key, 1) ON CONFLICT (delegation_code, date_key) DO
UPDATE
SET last_seq = declaration_sequences.last_seq + 1
RETURNING last_seq INTO v_seq;
RETURN p_delegation_code || '-' || v_date_key || '-' || LPAD(v_seq::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION generate_ref_service(p_service_code TEXT, p_date TIMESTAMPTZ) RETURNS TEXT AS $$
DECLARE v_date_key TEXT;
v_seq INTEGER;
BEGIN v_date_key := TO_CHAR(p_date, 'DD-MM-YY');
INSERT INTO service_sequences(service_code, date_key, last_seq)
VALUES (p_service_code, v_date_key, 1) ON CONFLICT (service_code, date_key) DO
UPDATE
SET last_seq = service_sequences.last_seq + 1
RETURNING last_seq INTO v_seq;
RETURN p_service_code || '-' || v_date_key || '-' || LPAD(v_seq::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION increment_ref_sequence(p_prefix TEXT) RETURNS INTEGER AS $$
DECLARE v_new_val INTEGER;
BEGIN
UPDATE ref_sequences
SET current_value = current_value + 1
WHERE prefix = p_prefix
RETURNING current_value INTO v_new_val;
IF NOT FOUND THEN
INSERT INTO ref_sequences(prefix, current_value)
VALUES (p_prefix, 1)
RETURNING current_value INTO v_new_val;
END IF;
RETURN v_new_val;
END;
$$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION increment_vote_count(p_declaration_id UUID) RETURNS VOID AS $$ BEGIN
UPDATE declarations
SET votes_count = votes_count + 1,
  updated_at = now()
WHERE id = p_declaration_id;
END;
$$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION trg_set_ref_citoyen() RETURNS TRIGGER AS $$
DECLARE v_del_code TEXT;
BEGIN
SELECT code INTO v_del_code
FROM delegations
WHERE id = NEW.delegation_id;
IF v_del_code IS NULL THEN v_del_code := 'XX';
END IF;
NEW.ref_citoyen := generate_ref_citoyen(v_del_code, NEW.created_at);
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION sync_declaration_location() RETURNS TRIGGER AS $$ BEGIN IF NEW.latitude IS NOT NULL
  AND NEW.longitude IS NOT NULL THEN NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
END IF;
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION guard_declaration_edit() RETURNS TRIGGER AS $$ BEGIN IF OLD.status != 'soumise'
  AND (
    OLD.title IS DISTINCT
    FROM NEW.title
      OR OLD.description IS DISTINCT
    FROM NEW.description
      OR OLD.service_id IS DISTINCT
    FROM NEW.service_id
      OR OLD.type_probleme IS DISTINCT
    FROM NEW.type_probleme
  ) THEN RAISE EXCEPTION 'EDIT_LOCKED: Declaration can only be edited when status is soumise. Current: %',
  OLD.status;
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION check_proof_photo_before_resolve() RETURNS TRIGGER AS $$ BEGIN IF NEW.statut_tache = 'terminee'
  AND (
    NEW.photo_apres_url IS NULL
    OR NEW.photo_apres_url = ''
  ) THEN RAISE EXCEPTION 'PROOF_PHOTO_REQUIRED: Upload proof photo before marking as completed.';
END IF;
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- FIXED: trigger now covers INSERT OR DELETE OR UPDATE (was missing UPDATE)
CREATE OR REPLACE FUNCTION update_priority_score() RETURNS TRIGGER AS $$
DECLARE v_declaration_id UUID;
BEGIN v_declaration_id := COALESCE(NEW.declaration_id, OLD.declaration_id);
UPDATE declarations
SET votes_count = (
    SELECT COUNT(*)
    FROM votes
    WHERE declaration_id = v_declaration_id
  ),
  priority_score = (
    (
      SELECT COUNT(*)
      FROM votes
      WHERE declaration_id = v_declaration_id
    ) * 3.0 + GREATEST(
      0,
      EXTRACT(
        EPOCH
        FROM (now() - created_at)
      ) / 86400.0
    ) * 0.5
  ),
  updated_at = now()
WHERE id = v_declaration_id;
RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION sync_proposition_vote_counts() RETURNS TRIGGER AS $$
DECLARE v_prop_id UUID;
BEGIN v_prop_id := COALESCE(NEW.proposition_id, OLD.proposition_id);
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
-- ADDED: DB-level safety net for status_history
-- Fires AFTER every declaration status change, records null for changed_by.
-- The backend also calls logStatusChange() with the real user UUID separately.
CREATE OR REPLACE FUNCTION log_status_change() RETURNS TRIGGER AS $$ BEGIN IF OLD.status IS DISTINCT
FROM NEW.status THEN
INSERT INTO status_history(
    declaration_id,
    old_status,
    new_status,
    changed_by
  )
VALUES (NEW.id, OLD.status, NEW.status, NULL);
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- ============================================================
-- TRIGGERS
-- ============================================================
DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at BEFORE
UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_services_updated_at ON services;
CREATE TRIGGER trg_services_updated_at BEFORE
UPDATE ON services FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_propositions_updated_at ON propositions;
CREATE TRIGGER trg_propositions_updated_at BEFORE
UPDATE ON propositions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_chatbot_updated_at ON chatbot_sessions;
CREATE TRIGGER trg_chatbot_updated_at BEFORE
UPDATE ON chatbot_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_sync_location ON declarations;
CREATE TRIGGER trg_sync_location BEFORE
INSERT
  OR
UPDATE ON declarations FOR EACH ROW EXECUTE FUNCTION sync_declaration_location();
DROP TRIGGER IF EXISTS trg_guard_declaration_edit ON declarations;
CREATE TRIGGER trg_guard_declaration_edit BEFORE
UPDATE ON declarations FOR EACH ROW EXECUTE FUNCTION guard_declaration_edit();
DROP TRIGGER IF EXISTS trg_check_proof_photo ON taches;
CREATE TRIGGER trg_check_proof_photo BEFORE
UPDATE ON taches FOR EACH ROW EXECUTE FUNCTION check_proof_photo_before_resolve();
-- FIXED: was AFTER INSERT OR DELETE only — must include UPDATE
DROP TRIGGER IF EXISTS trg_update_priority ON votes;
CREATE TRIGGER trg_update_priority
AFTER
INSERT
  OR DELETE
  OR
UPDATE ON votes FOR EACH ROW EXECUTE FUNCTION update_priority_score();
DROP TRIGGER IF EXISTS trg_sync_proposition_votes ON proposition_votes;
CREATE TRIGGER trg_sync_proposition_votes
AFTER
INSERT
  OR DELETE ON proposition_votes FOR EACH ROW EXECUTE FUNCTION sync_proposition_vote_counts();
-- ADDED: auto-record status history on every status change
DROP TRIGGER IF EXISTS trg_log_status_change ON declarations;
CREATE TRIGGER trg_log_status_change
AFTER
UPDATE ON declarations FOR EACH ROW EXECUTE FUNCTION log_status_change();
-- ============================================================
-- VIEWS
-- ============================================================
CREATE OR REPLACE VIEW departments AS
SELECT id,
  name_fr AS name,
  code,
  chef_id,
  is_active,
  created_at,
  updated_at
FROM services;
CREATE OR REPLACE VIEW v_declarations_citizen AS
SELECT d.*,
  CASE
    d.status
    WHEN 'en_cours' THEN 'EN COURS'
    WHEN 'resolue' THEN 'TERMINE'
    WHEN 'cloturee' THEN 'TERMINE'
    ELSE 'EN ATTENTE'
  END AS citizen_status
FROM declarations d
WHERE d.is_deleted = false
  AND d.deleted_at IS NULL;
CREATE OR REPLACE VIEW v_map_declarations AS
SELECT d.id,
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
  CASE
    d.status
    WHEN 'en_cours' THEN 'EN COURS'
    WHEN 'resolue' THEN 'TERMINE'
    WHEN 'cloturee' THEN 'TERMINE'
    ELSE 'EN ATTENTE'
  END AS citizen_status,
  CASE
    d.status
    WHEN 'en_cours' THEN 'blue'
    WHEN 'resolue' THEN 'green'
    WHEN 'cloturee' THEN 'green'
    ELSE 'yellow'
  END AS pin_color
FROM declarations d
  LEFT JOIN services s ON s.id = d.service_id
WHERE d.is_deleted = false
  AND d.deleted_at IS NULL;
-- ============================================================
-- RPC — PROXIMITY SEARCH
-- CRITICAL: parameter names are lat/lng/radius/category (NO p_ prefix)
-- FIXED: was NOT IN ('RESOLU','CLOTURE') — must match lowercase enum values
-- ============================================================
CREATE OR REPLACE FUNCTION get_nearby_declarations(
    lat FLOAT8,
    lng FLOAT8,
    radius FLOAT8,
    category TEXT
  ) RETURNS TABLE (
    id UUID,
    title TEXT,
    ref_citoyen TEXT,
    category TEXT,
    status declaration_status,
    latitude FLOAT8,
    longitude FLOAT8,
    address TEXT,
    votes_count INTEGER,
    created_at TIMESTAMPTZ
  ) AS $$ BEGIN RETURN QUERY
SELECT d.id,
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
WHERE d.is_deleted = false
  AND d.deleted_at IS NULL
  AND d.category = $4
  AND d.status NOT IN ('resolue', 'cloturee') -- FIXED: was uppercase
  AND d.location IS NOT NULL
  AND ST_DWithin(
    d.location::geography,
    ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
    $3
  )
ORDER BY d.votes_count DESC,
  d.created_at DESC
LIMIT 10;
END;
$$ LANGUAGE plpgsql;
-- Unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID) RETURNS INTEGER AS $$
SELECT COUNT(*)::INTEGER
FROM notifications
WHERE user_id = p_user_id
  AND is_read = false;
$$ LANGUAGE SQL;
-- Close expired propositions
CREATE OR REPLACE FUNCTION close_expired_propositions() RETURNS VOID AS $$ BEGIN
UPDATE propositions
SET status = 'closed'
WHERE status = 'active'
  AND end_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;
-- ============================================================
-- SEED DATA
-- ============================================================
INSERT INTO delegations (name, code)
VALUES ('Sousse Ville', 'SV'),
  ('Sousse Jawhara', 'SJ'),
  ('Sousse Sidi Abdelhamid', 'SA') ON CONFLICT (code) DO NOTHING;
INSERT INTO services (name_fr, name_ar, name_en, code)
VALUES (
    'Voirie & Routes',
    'الطرق والأرصفة',
    'Roads & Pavements',
    'VR'
  ),
  (
    'Eclairage public',
    'الإنارة العمومية',
    'Street Lighting',
    'EP'
  ),
  (
    'Proprete & Dechets',
    'النظافة والنفايات',
    'Waste & Cleanliness',
    'PD'
  ),
  (
    'Espaces verts',
    'المساحات الخضراء',
    'Green Spaces',
    'EV'
  ),
  (
    'Reseaux & Drainage',
    'الشبكات',
    'Networks & Drainage',
    'EA'
  ),
  (
    'Signalisation routiere',
    'الإشارات المرورية',
    'Traffic Signaling',
    'ST'
  ),
  (
    'Administratif',
    'الشؤون الإدارية',
    'Administrative',
    'BP'
  ),
  (
    'Suggestions',
    'الاقتراحات',
    'Suggestions',
    'SG'
  ) ON CONFLICT (code) DO NOTHING;
-- President account (password: Password123!)
INSERT INTO users (
    email,
    password_hash,
    first_name,
    last_name,
    role,
    is_active
  )
VALUES (
    'president@sousse.tn',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TZFSTlBvLbJu4MWjGQB8q2HfSb.6',
    'President',
    'Municipal',
    'president',
    true
  ) ON CONFLICT (email) DO NOTHING;
-- ============================================================
-- VERIFY — should show ~18 tables
-- ============================================================
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
  AND table_name NOT IN ('spatial_ref_sys')
ORDER BY table_name;
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE TYPE user_role AS ENUM ('citizen', 'agent', 'chef', 'president');
CREATE TYPE declaration_status AS ENUM (
  'soumise',
  'assignee_chef',
  'assignee_agent',
  'en_cours',
  'refusee_chef',
  'refusee_agent',
  'resolue',
  'cloturee'
);
CREATE TYPE vote_value AS ENUM ('pour', 'contre');
CREATE TYPE lang_code AS ENUM ('fr', 'ar', 'en');
CREATE OR REPLACE VIEW v_declarations_citizen AS
SELECT *,
  CASE
    WHEN status IN (
      'soumise',
      'assignee_chef',
      'assignee_agent',
      'refusee_chef',
      'refusee_agent'
    ) THEN 'EN ATTENTE'
    WHEN status = 'en_cours' THEN 'EN COURS'
    ELSE 'TERMINE'
  END AS citizen_status
FROM declarations
WHERE deleted_at IS NULL;
CREATE OR REPLACE VIEW v_map_declarations AS
SELECT id,
  title,
  category,
  latitude,
  longitude,
  citizen_status,
  CASE
    citizen_status
    WHEN 'EN ATTENTE' THEN 'orange'
    WHEN 'EN COURS' THEN 'blue'
    ELSE 'green'
  END AS pin_color
FROM v_declarations_citizen
WHERE citizen_status != 'TERMINE';
-- excludes cloturee
CREATE OR REPLACE VIEW departments AS
SELECT id,
  name_fr AS name,
  code,
  is_active
FROM services;
INSERT INTO users (
    id,
    email,
    password_hash,
    first_name,
    last_name,
    role,
    is_active
  )
VALUES (
    gen_random_uuid(),
    'president@sousse.tn',
    '$2b$12$<bcrypt hash of Password123!>',
    'Président',
    'Municipal',
    'president',
    true
  );
ALTER TABLE declarations
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE declarations
ADD COLUMN IF NOT EXISTS citizen_id UUID REFERENCES users(id);
ALTER TABLE declarations
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);
ALTER TABLE status_history
ALTER COLUMN changed_by DROP NOT NULL;
ALTER TABLE votes
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);
ALTER TABLE services
ADD COLUMN IF NOT EXISTS name_ar TEXT;
ALTER TABLE services
ADD COLUMN IF NOT EXISTS name_en TEXT;
ALTER TABLE services
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
-- If ratings.rating exists and score does not:
-- ALTER TABLE ratings RENAME COLUMN rating TO score;
-- Delete auto-generated seed rows and re-insert with the correct fixed UUIDs
DELETE FROM delegations
WHERE code IN ('SV', 'SJ', 'SA');
INSERT INTO delegations (id, name, code)
VALUES (
    'a309fed2-6c50-49ae-b2be-a6e7ccd096df',
    'Sousse Ville',
    'SV'
  ),
  (
    '0ede6556-2f67-4a0d-a7cb-d0cdca4504a5',
    'Sousse Jawhara',
    'SJ'
  ),
  (
    'a1ca5994-b186-4970-91f6-c44925cfc4b4',
    'Sousse Sidi Abdelhamid',
    'SA'
  );
DELETE FROM services
WHERE code IN ('VR', 'EP', 'PD', 'EV', 'EA', 'ST', 'BP', 'SG');
INSERT INTO services (id, name_fr, name_ar, name_en, code, is_active)
VALUES (
    'c3c9d2cd-4b55-481b-b577-92ae1ee7d8d1',
    'Voirie & Routes',
    'الطرق والأرصفة',
    'Roads & Pavements',
    'VR',
    true
  ),
  (
    'af6c8348-0e2b-40fe-b4aa-54629d483559',
    'Éclairage public',
    'الإنارة العمومية',
    'Street Lighting',
    'EP',
    true
  ),
  (
    '5ab878b9-2d37-455e-b8cf-7fe91dd5e088',
    'Propreté & Déchets',
    'النظافة والنفايات',
    'Waste & Cleanliness',
    'PD',
    true
  ),
  (
    'f6c86d36-3e26-442f-9e3f-2b745083109f',
    'Espaces verts',
    'المساحات الخضراء',
    'Green Spaces',
    'EV',
    true
  ),
  (
    '48256387-922e-4af8-854a-f09738f15fdc',
    'Réseaux & Drainage',
    'الشبكات',
    'Networks & Drainage',
    'EA',
    true
  ),
  (
    'bd7043c9-b2c7-4ca1-b3e9-777a3bdc2dbd',
    'Signalisation routière',
    'الإشارات المرورية',
    'Traffic Signaling',
    'ST',
    true
  ),
  (
    '090910f9-c9f6-4e84-b7ed-46789d4e4eaf',
    'Administratif',
    'الشؤون الإدارية',
    'Administrative',
    'BP',
    true
  ),
  (
    '3cf62603-5e0e-4978-86dc-ef3b00985b25',
    'Suggestions',
    'الاقتراحات',
    'Suggestions',
    'SG',
    true
  );
DELETE FROM users
WHERE email = 'president@sousse.tn';
-- Fix votes: constraint must match the column JS uses (user_id)
ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_one_per_citizen;
ALTER TABLE votes
ADD CONSTRAINT votes_one_per_user UNIQUE (declaration_id, user_id);
-- Fix ratings: constraint must match the column JS inserts (citizen_id)
ALTER TABLE ratings DROP CONSTRAINT IF EXISTS ratings_one_per_user_declaration;
ALTER TABLE ratings
ADD CONSTRAINT ratings_one_per_citizen UNIQUE (declaration_id, citizen_id);
INSERT INTO users (
    id,
    email,
    password_hash,
    first_name,
    last_name,
    role,
    is_active
  )
VALUES (
    gen_random_uuid(),
    'president@sousse.tn',
    '$2b$12$uCN4/iIqHgzm9T772IQF.ug67vaQcgxpGIqS315GT3c6vxAYhHRz6',
    'Président',
    'Municipal',
    'president',
    true
  );