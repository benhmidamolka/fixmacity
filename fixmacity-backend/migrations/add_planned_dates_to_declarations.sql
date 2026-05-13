-- Migration to add planned dates to declarations
ALTER TABLE declarations 
ADD COLUMN IF NOT EXISTS planned_start TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS planned_end TIMESTAMPTZ;
