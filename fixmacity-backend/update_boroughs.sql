-- ============================================================
-- FIXMACITY — Update Boroughs to Four-Borough Sousse Model
-- ============================================================

-- 1. Update existing delegations to new model names/codes (Preserving IDs for FK integrity)
INSERT INTO delegations (id, name, code)
VALUES 
  ('a309fed2-6c50-49ae-b2be-a6e7ccd096df', 'Sousse Nord', 'SN'),
  ('0ede6556-2f67-4a0d-a7cb-d0cdca4504a5', 'Sousse Sud', 'SS'),
  ('a1ca5994-b186-4970-91f6-c44925cfc4b4', 'Sousse Médina', 'SM'),
  ('b2da6994-c286-4970-91f6-c44925cfc4b5', 'Sousse Riadh', 'SR')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  code = EXCLUDED.code;

-- 2. Cleanup any other delegations that might exist and aren't part of the model
DELETE FROM delegations 
WHERE id NOT IN (
  'a309fed2-6c50-49ae-b2be-a6e7ccd096df',
  '0ede6556-2f67-4a0d-a7cb-d0cdca4504a5',
  'a1ca5994-b186-4970-91f6-c44925cfc4b4',
  'b2da6994-c286-4970-91f6-c44925cfc4b5'
);
