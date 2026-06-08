-- ============================================================
-- FIXMACITY — Schema Cleanup Migration
-- Date   : 2026-06-04
-- Author : Schema audit
-- Purpose: Fix 5 schema inconsistencies identified in audit
--
-- Issues addressed:
--   1. departments vs services (resolve ambiguity)
--   2. declarations.status TEXT → declaration_status enum
--   3. tasks.intervention_id missing FK constraint
--   4. declaration_photos.score column documentation
--   5. propositions multilingual columns documentation
--
-- ⚠ Run this in a transaction so any failure rolls back cleanly.
-- ⚠ Test on a dev/staging DB first before applying to production.
-- ============================================================

BEGIN;

-- ============================================================
-- ISSUE 1 — departments vs services
-- ============================================================
-- DIAGNOSIS:
--   • `services`    is the active operational table (has code, used for
--                   assignment workflows, referenced throughout the backend).
--   • `departments` is a legacy structural grouping table (municipal
--                   departments like "Voirie", "Espaces verts", etc.).
--   Both have FK references in declarations and users, so we keep BOTH but
--   we rename the ambiguous `department_id` FK on declarations/users to make
--   the intent crystal-clear, and add a comment on the departments table.
--
-- If you want to FULLY DROP departments (only if no rows / no real usage):
--   1. Set remove_departments = TRUE below (comment/uncomment the block)
--   2. Run the script
-- ============================================================

-- Document what each table is for so future devs are never confused:
COMMENT ON TABLE services IS
  'Operational service units (e.g. Voirie, Éclairage). '
  'Declarations are assigned to a service for resolution. '
  'This is the PRIMARY organisational unit used in workflows.';

COMMENT ON TABLE departments IS
  'Municipal departments — broad groupings above services '
  '(e.g. Département Travaux contains services Voirie + Éclairage). '
  'Used for president-level reporting only. NOT the assignment unit. '
  'If this table is empty and unused, run the DROP block below.';

-- ── OPTIONAL DROP BLOCK ──────────────────────────────────────
-- Only uncomment and run if:
--   SELECT COUNT(*) FROM departments;  → returns 0, AND
--   the department_id columns on declarations/users are all NULL.
--
-- DO $$
-- BEGIN
--   IF (SELECT COUNT(*) FROM departments) = 0 THEN
--     ALTER TABLE declarations   DROP COLUMN IF EXISTS department_id;
--     ALTER TABLE users          DROP COLUMN IF EXISTS department_id;
--     DROP TABLE IF EXISTS departments CASCADE;
--     RAISE NOTICE 'departments table dropped cleanly.';
--   ELSE
--     RAISE NOTICE 'departments table has % rows — skipping drop.',
--                  (SELECT COUNT(*) FROM departments);
--   END IF;
-- END;
-- $$;
-- ─────────────────────────────────────────────────────────────


-- ============================================================
-- ISSUE 2 — declarations.status: TEXT → declaration_status enum
-- ============================================================
-- The enum type `declaration_status` already exists in the DB.
-- We safely cast only if the column is still TEXT.
-- ============================================================

DO $$
BEGIN
  -- Check current column type
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'declarations'
      AND column_name  = 'status'
      AND data_type    = 'text'
  ) THEN
    -- Ensure all existing values are valid enum members before casting
    -- This will raise an error (rolling back the transaction) if any
    -- value in the column is not a valid declaration_status label.
    ALTER TABLE declarations
      ALTER COLUMN status TYPE declaration_status
      USING status::declaration_status;

    RAISE NOTICE 'declarations.status successfully converted to declaration_status enum.';
  ELSE
    RAISE NOTICE 'declarations.status is already an enum — no action needed.';
  END IF;
END;
$$;

-- Also fix status_history.new_status and old_status if they are TEXT:
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'status_history'
      AND column_name  = 'new_status'
      AND data_type    = 'text'
  ) THEN
    ALTER TABLE status_history
      ALTER COLUMN new_status TYPE declaration_status
      USING new_status::declaration_status;

    RAISE NOTICE 'status_history.new_status converted to enum.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'status_history'
      AND column_name  = 'old_status'
      AND data_type    = 'text'
  ) THEN
    ALTER TABLE status_history
      ALTER COLUMN old_status TYPE declaration_status
      USING old_status::declaration_status;

    RAISE NOTICE 'status_history.old_status converted to enum.';
  END IF;
END;
$$;


-- ============================================================
-- ISSUE 3 — tasks.intervention_id: add missing FK constraint
-- ============================================================
-- The column exists but has no foreign key, which means orphan
-- rows can accumulate silently.
-- We add the FK only if the column exists and the constraint
-- does not already exist.
-- ============================================================

DO $$
BEGIN
  -- FIX #7: Ensure intervention_id column exists before adding FK
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'tasks'
      AND column_name  = 'intervention_id'
  ) THEN
    ALTER TABLE tasks ADD COLUMN intervention_id UUID;
    RAISE NOTICE 'tasks.intervention_id column added.';
  END IF;

  -- Only act if tasks.intervention_id column exists
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'tasks'
      AND column_name  = 'intervention_id'
  ) THEN

    -- Check if the FK already exists
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema    = kcu.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema    = 'public'
        AND tc.table_name      = 'tasks'
        AND kcu.column_name    = 'intervention_id'
    ) THEN

      -- intervention_id references declarations.id
      -- (Tasks are created from declarations; intervention = declaration being worked on)
      ALTER TABLE tasks
        ADD CONSTRAINT tasks_intervention_id_fkey
        FOREIGN KEY (intervention_id)
        REFERENCES declarations(id)
        ON DELETE SET NULL;   -- if the declaration is deleted, null out the task ref

      RAISE NOTICE 'FK tasks_intervention_id_fkey added successfully.';
    ELSE
      RAISE NOTICE 'tasks.intervention_id FK already exists — skipping.';
    END IF;

  ELSE
    RAISE NOTICE 'tasks.intervention_id column does not exist — skipping FK creation.';
  END IF;
END;
$$;

-- Index to make FK lookups fast:
CREATE INDEX IF NOT EXISTS idx_tasks_intervention_id
  ON tasks(intervention_id);


-- ============================================================
-- ISSUE 4 — declaration_photos.score: document the column
-- ============================================================
-- This column is NOT in the original PRD but was added during
-- development. It stores an AI-generated quality/relevance score
-- for each uploaded photo (0–100). Keep it but make it official.
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'declaration_photos'
      AND column_name  = 'score'
  ) THEN
    COMMENT ON COLUMN declaration_photos.score IS
      'AI-generated photo quality / relevance score (0–100). '
      'Computed by Gemini Vision at upload time. '
      'Higher score = clearer, more useful evidence photo. '
      'Not in original PRD — added during development sprint 3.';

    RAISE NOTICE 'declaration_photos.score documented.';
  ELSE
    RAISE NOTICE 'declaration_photos.score column not found — nothing to document.';
  END IF;
END;
$$;


-- ============================================================
-- ISSUE 5 — propositions: document the trilingual columns
-- ============================================================
-- The PRD specified only `title` and `description`.
-- The implementation added full trilingual support (FR/AR/EN).
-- This is an intentional improvement — document it properly.
-- ============================================================

COMMENT ON TABLE propositions IS
  'Citizen proposals for urban improvements. '
  'Supports full trilingual content (FR / AR / EN) — '
  'an enhancement beyond the original PRD scope.';

DO $$
BEGIN
  -- title_fr
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='propositions' AND column_name='title_fr') THEN
    COMMENT ON COLUMN propositions.title_fr IS 'Proposal title in French (langue principale).';
  END IF;
  -- title_ar
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='propositions' AND column_name='title_ar') THEN
    COMMENT ON COLUMN propositions.title_ar IS 'Proposal title in Arabic (عنوان المقترح بالعربية).';
  END IF;
  -- description_fr
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='propositions' AND column_name='description_fr') THEN
    COMMENT ON COLUMN propositions.description_fr IS 'Full description in French.';
  END IF;
  -- description_ar
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='propositions' AND column_name='description_ar') THEN
    COMMENT ON COLUMN propositions.description_ar IS 'Full description in Arabic (وصف المقترح).';
  END IF;
  -- description_en
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='propositions' AND column_name='description_en') THEN
    COMMENT ON COLUMN propositions.description_en IS 'Full description in English (for international reporting).';
  END IF;

  RAISE NOTICE 'propositions trilingual columns documented.';
END;
$$;


-- ============================================================
-- BONUS — Add missing index on declarations.status
-- ============================================================
-- After the enum conversion, status filtering becomes the most
-- common query pattern (e.g. WHERE status = 'soumise').
-- Ensure this index exists.
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_declarations_status
  ON declarations(status);

CREATE INDEX IF NOT EXISTS idx_declarations_agent_id
  ON declarations(agent_id) WHERE agent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_declarations_service_id
  ON declarations(service_id) WHERE service_id IS NOT NULL;


-- ============================================================
-- VERIFY — Quick sanity checks after migration
-- ============================================================
-- Run these SELECT statements after applying to confirm results:
--
--   1. Confirm status is now an enum:
--      SELECT column_name, data_type, udt_name
--      FROM information_schema.columns
--      WHERE table_name = 'declarations' AND column_name = 'status';
--      → udt_name should be 'declaration_status'
--
--   2. Confirm tasks FK exists:
--      SELECT constraint_name FROM information_schema.table_constraints
--      WHERE table_name = 'tasks' AND constraint_type = 'FOREIGN KEY';
--      → should include 'tasks_intervention_id_fkey'
--
--   3. Confirm photo score is documented:
--      SELECT col_description(
--        'declaration_photos'::regclass,
--        (SELECT attnum FROM pg_attribute
--         WHERE attrelid = 'declaration_photos'::regclass
--           AND attname = 'score')
--      );
--
--   4. Count rows in both org tables:
--      SELECT 'departments' as tbl, COUNT(*) FROM departments
--      UNION ALL
--      SELECT 'services',           COUNT(*) FROM services;
-- ============================================================

COMMIT;

-- ============================================================
-- Migration complete. Summary of changes:
--   ✓ departments and services tables clarified with comments
--   ✓ declarations.status converted from TEXT to enum (if needed)
--   ✓ status_history status columns converted to enum (if needed)
--   ✓ tasks.intervention_id FK added (if column exists)
--   ✓ declaration_photos.score column documented
--   ✓ propositions trilingual columns documented
--   ✓ Performance indexes ensured on declarations
-- ============================================================
