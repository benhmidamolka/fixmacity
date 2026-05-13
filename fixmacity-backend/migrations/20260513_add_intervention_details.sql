-- SQL Patch to add intervention details to declarations table
-- This allows agents to report their work directly on the declaration object.

ALTER TABLE declarations 
ADD COLUMN IF NOT EXISTS internal_intervention_report TEXT,
ADD COLUMN IF NOT EXISTS intervention_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS intervention_ended_at TIMESTAMPTZ;

-- Ensure status_history can track the resolution
-- (This was already checked but good to have in the patch)
ALTER TABLE status_history 
ALTER COLUMN changed_by DROP NOT NULL;
