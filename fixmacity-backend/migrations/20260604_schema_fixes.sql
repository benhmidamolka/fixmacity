-- ============================================================
-- FIXMACITY — Additional Schema Fixes Migration
-- Date   : 2026-06-04
-- Author : Schema audit
-- Purpose: Address remaining schema inconsistencies
--
-- Issues addressed:
--   1. Remove redundant user_id from votes table
--   2. Remove redundant user_id from ratings table
--   3. Fix delegations codes (SV,SJ,SA → SN,SS,SM)
--   4. Add ref_sequences entries for SN,SS,SM,SR
--   5. Make delegation_id mandatory in POST /api/declarations
--   6. Remove duplicate get_nearby_declarations function
-- ============================================================

BEGIN;

-- ============================================================
-- ISSUE 1: votes table – remove redundant user_id
-- ============================================================
ALTER TABLE votes DROP COLUMN IF EXISTS user_id;
ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_one_per_citizen;
ALTER TABLE votes ADD CONSTRAINT votes_one_per_citizen UNIQUE (declaration_id, citizen_id);
ALTER TABLE votes ALTER COLUMN citizen_id SET NOT NULL;

-- ============================================================
-- ISSUE 2: ratings table – remove redundant user_id
-- ============================================================
ALTER TABLE ratings DROP COLUMN IF EXISTS user_id;
ALTER TABLE ratings DROP CONSTRAINT IF EXISTS ratings_one_per_citizen;
ALTER TABLE ratings ADD CONSTRAINT ratings_one_per_citizen UNIQUE (declaration_id, citizen_id);
ALTER TABLE ratings ALTER COLUMN citizen_id SET NOT NULL;

-- ============================================================
-- ISSUE 3: Fix delegations codes (SV→SN, SJ→SS, SA→SM)
-- ============================================================
-- Insert new correct codes (will be ignored if they already exist)
INSERT INTO delegations (name, code) VALUES
  ('Sousse Nord', 'SN'),
  ('Sousse Sud', 'SS'),
  ('Sousse Médina', 'SM')
ON CONFLICT (code) DO NOTHING;

-- Store IDs of delegations that will be removed
CREATE TEMP TABLE delegations_to_remove AS
SELECT id FROM delegations
WHERE code IN ('SV', 'SJ', 'SA')
AND id NOT IN (SELECT DISTINCT delegation_id FROM declarations WHERE delegation_id IS NOT NULL);

-- Delete orphaned delegations (those not referenced by any declaration)
DELETE FROM delegations
WHERE code IN ('SV', 'SJ', 'SA')
AND id NOT IN (SELECT DISTINCT delegation_id FROM declarations WHERE delegation_id IS NOT NULL);

-- ============================================================
-- ISSUE 4: Add ref_sequences entries for SN, SS, SM, SR
-- ============================================================
INSERT INTO ref_sequences (prefix, current_value) VALUES
  ('SN', 0),
  ('SS', 0),
  ('SM', 0),
  ('SR', 0)
ON CONFLICT (prefix) DO NOTHING;

-- ============================================================
-- ISSUE 5: Validate delegation_id in declarations.controller.js
-- ============================================================
-- This is handled in the controller, not the database.
-- The controller now returns 400 if delegation_id is missing.

-- ============================================================
-- ISSUE 6: Remove duplicate get_nearby_declarations function
-- ============================================================
-- Drop the old version (without is_deleted filter or proper PostGIS handling)
DROP FUNCTION IF EXISTS get_nearby_declarations(float8, float8, float8, text);

-- Note: The correct version with is_deleted filter and ST_SetSRID is kept
-- from the original schema.sql

-- ============================================================
-- VERIFICATION QUERIES (run after migration)
-- ============================================================
-- 1. Verify votes table structure:
--    SELECT column_name, is_nullable
--    FROM information_schema.columns
--    WHERE table_name = 'votes'
--    ORDER BY ordinal_position;
--
-- 2. Verify ratings table structure:
--    SELECT column_name, is_nullable
--    FROM information_schema.columns
--    WHERE table_name = 'ratings'
--    ORDER BY ordinal_position;
--
-- 3. Verify delegations codes:
--    SELECT name, code FROM delegations ORDER BY code;
--
-- 4. Verify ref_sequences:
--    SELECT * FROM ref_sequences WHERE prefix IN ('SN', 'SS', 'SM', 'SR');

COMMIT;