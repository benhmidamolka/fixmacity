-- Migration: Remove redundant user_id column from votes table
-- Keep only citizen_id (FK to users.id)
-- Add UNIQUE constraint on (declaration_id, citizen_id)

-- Drop the old unique constraint on user_id
ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_one_per_user;

-- Drop the user_id column (data will be lost – acceptable because duplicate
-- votes are already prevented by the unique constraint)
ALTER TABLE votes DROP COLUMN IF EXISTS user_id;

-- Ensure the unique constraint uses citizen_id instead
ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_one_per_citizen;
ALTER TABLE votes ADD CONSTRAINT votes_one_per_citizen UNIQUE (declaration_id, citizen_id);

-- Make citizen_id NOT NULL (required for vote attribution)
ALTER TABLE votes ALTER COLUMN citizen_id SET NOT NULL;