// Run missing DB views creation via Node pg
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'fixmacity',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

const sql = `
-- Drop existing views first to handle column changes
DROP VIEW IF EXISTS v_map_declarations CASCADE;
DROP VIEW IF EXISTS v_declarations_citizen CASCADE;
DROP VIEW IF EXISTS departments CASCADE;

-- departments view with fallback for missing chef_id
DO $$ BEGIN
  BEGIN
    EXECUTE 'CREATE OR REPLACE VIEW departments AS
      SELECT id, name_fr AS name, code, chef_id, is_active, created_at, updated_at
      FROM services';
  EXCEPTION WHEN undefined_column THEN
    EXECUTE 'CREATE OR REPLACE VIEW departments AS
      SELECT id, name_fr AS name, code, is_active, created_at, updated_at
      FROM services';
  END;
END $$;

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
SELECT d.id, d.title, d.category,
  d.latitude, d.longitude, d.address, d.delegation_id, d.created_at,
  s.name_fr AS service_name_fr,
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
`;

(async () => {
  try {
    await pool.query(sql);
    console.log('✅ All 3 views created successfully.');
    
    // Verify
    const { rows } = await pool.query("SELECT table_name FROM information_schema.views WHERE table_schema = 'public' ORDER BY table_name");
    console.log('Views in DB:', rows.map(r => r.table_name));
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
})();
