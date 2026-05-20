require('dotenv').config();
const { pool } = require('../src/config/db');

const sql = `
CREATE OR REPLACE FUNCTION compute_priority_score()
RETURNS TRIGGER AS $$
DECLARE
  ai_score       INTEGER := 0;
  vote_bonus     INTEGER := 0;
  loc_bonus      INTEGER := 0;
  total          INTEGER := 0;
  pri            VARCHAR(20);
BEGIN
  -- AI base score (Fixed: removed COALESCE that caused enum cast error)
  ai_score := CASE NEW.ai_priority
    WHEN 'urgent' THEN 10
    WHEN 'normal' THEN 5
    WHEN 'faible' THEN 1
    ELSE 0
  END;

  -- Votes bonus (capped at 5)
  vote_bonus := LEAST(COALESCE(NEW.votes_count, 0), 5);

  -- Sensitive location bonus
  loc_bonus := CASE
    WHEN NEW.is_sensitive = TRUE AND NEW.sensitive_type = 'hospital' THEN 4
    WHEN NEW.is_sensitive = TRUE AND NEW.sensitive_type = 'school'   THEN 3
    WHEN NEW.is_sensitive = TRUE THEN 2
    ELSE 0
  END;

  total := ai_score + vote_bonus + loc_bonus;

  -- Only auto-set if president hasn't locked it
  IF COALESCE(NEW.ai_priority_confirmed, FALSE) = FALSE THEN
    pri := CASE
      WHEN total >= 12 THEN 'urgent'
      WHEN total >= 5  THEN 'normal'
      ELSE 'faible'
    END;
    -- Mirror into DB priority column
    NEW.priority := CASE pri
      WHEN 'urgent' THEN 'haute'
      WHEN 'normal' THEN 'moyenne'
      ELSE 'basse'
    END;
    NEW.priority_score := total;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
`;

pool.query(sql)
  .then(() => console.log('Trigger function updated successfully.'))
  .catch(err => console.error(err))
  .finally(() => process.exit(0));
