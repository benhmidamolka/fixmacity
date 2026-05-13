-- Create missing views and other schema objects for local PostgreSQL
CREATE OR REPLACE VIEW departments AS
SELECT id, name_fr AS name, code, chef_id, is_active, created_at, updated_at
FROM services;

CREATE OR REPLACE VIEW v_declarations_citizen AS
SELECT d.*,
  CASE d.status
    WHEN 'en_cours' THEN 'EN COURS'
    WHEN 'resolue' THEN 'TERMINE'
    WHEN 'cloturee' THEN 'TERMINE'
    ELSE 'EN ATTENTE'
  END AS citizen_status
FROM declarations d
WHERE d.is_deleted = false
  AND d.deleted_at IS NULL;

CREATE OR REPLACE VIEW v_map_declarations AS
SELECT d.id, d.title, d.category, d.type_probleme,
  d.latitude, d.longitude, d.address, d.delegation_id, d.created_at,
  s.name_fr AS service_name_fr, s.name_en AS service_name_en,
  CASE d.status
    WHEN 'en_cours' THEN 'EN COURS'
    WHEN 'resolue' THEN 'TERMINE'
    WHEN 'cloturee' THEN 'TERMINE'
    ELSE 'EN ATTENTE'
  END AS citizen_status,
  CASE d.status
    WHEN 'en_cours' THEN 'blue'
    WHEN 'resolue' THEN 'green'
    WHEN 'cloturee' THEN 'green'
    ELSE 'yellow'
  END AS pin_color
FROM declarations d
  LEFT JOIN services s ON s.id = d.service_id
WHERE d.is_deleted = false
  AND d.deleted_at IS NULL;
