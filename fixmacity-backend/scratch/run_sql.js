require('dotenv').config();
const db = require('../src/config/db');

async function run() {
  try {
    // 1. Drop existing table if wrong schema
    await db.pool.query('DROP TABLE IF EXISTS sensitive_locations CASCADE');

    // 2. Create sensitive_locations
    await db.pool.query(`
      CREATE TABLE sensitive_locations (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name        TEXT NOT NULL,
        category    TEXT NOT NULL CHECK (category IN (
                      'mosque', 'school', 'hospital', 'pharmacy',
                      'police', 'fire_station', 'government', 'market', 'other'
                    )),
        latitude    DOUBLE PRECISION NOT NULL,
        longitude   DOUBLE PRECISION NOT NULL,
        location    GEOGRAPHY(POINT, 4326),
        delegation_id UUID REFERENCES delegations(id),
        created_at  TIMESTAMPTZ DEFAULT now()
      )
    `);

    // 3. Trigger and Function
    await db.pool.query(`
      CREATE OR REPLACE FUNCTION sync_sensitive_location()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await db.pool.query(`
      DROP TRIGGER IF EXISTS trg_sync_sensitive_location ON sensitive_locations;
    `);

    await db.pool.query(`
      CREATE TRIGGER trg_sync_sensitive_location
      BEFORE INSERT OR UPDATE ON sensitive_locations
      FOR EACH ROW EXECUTE FUNCTION sync_sensitive_location();
    `);

    await db.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_sensitive_locations_geo ON sensitive_locations USING GIST (location);
    `);

    await db.pool.query(`
      CREATE OR REPLACE FUNCTION get_nearby_sensitive_locations(
        p_lat DOUBLE PRECISION,
        p_lng DOUBLE PRECISION,
        p_radius_m INT DEFAULT 200
      )
      RETURNS TABLE (
        id UUID, name TEXT, category TEXT, distance_m DOUBLE PRECISION
      ) AS $$
        SELECT
          sl.id, sl.name, sl.category,
          ROUND(ST_Distance(
            sl.location,
            ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
          )::numeric, 0)::double precision AS distance_m
        FROM sensitive_locations sl
        WHERE ST_DWithin(
          sl.location,
          ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
          p_radius_m
        )
        ORDER BY ST_Distance(
          sl.location,
          ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
        ) ASC;
      $$ LANGUAGE sql STABLE;
    `);

    // 4. declaration_agents
    await db.pool.query(`
      CREATE TABLE IF NOT EXISTS declaration_agents (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        declaration_id  UUID NOT NULL REFERENCES declarations(id) ON DELETE CASCADE,
        agent_id        UUID NOT NULL REFERENCES users(id),
        is_lead         BOOLEAN DEFAULT false,
        status          TEXT NOT NULL DEFAULT 'assigned'
                          CHECK (status IN ('assigned','accepted','refused')),
        assigned_by     UUID REFERENCES users(id),
        assigned_at     TIMESTAMPTZ DEFAULT now(),
        responded_at    TIMESTAMPTZ,
        refusal_reason  TEXT,
        UNIQUE(declaration_id, agent_id)
      );
    `);

    await db.pool.query(`CREATE INDEX IF NOT EXISTS idx_declaration_agents_decl ON declaration_agents(declaration_id);`);
    await db.pool.query(`CREATE INDEX IF NOT EXISTS idx_declaration_agents_agent ON declaration_agents(agent_id);`);

    // 5. secondary departments
    await db.pool.query(`
      CREATE TABLE IF NOT EXISTS declaration_secondary_departments (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        declaration_id  UUID NOT NULL REFERENCES declarations(id) ON DELETE CASCADE,
        department_id   UUID NOT NULL REFERENCES services(id),
        reason          TEXT,
        added_by        UUID REFERENCES users(id),
        created_at      TIMESTAMPTZ DEFAULT now(),
        UNIQUE(declaration_id, department_id)
      );
    `);

    // 6. duplicate function
    await db.pool.query(`
      CREATE OR REPLACE FUNCTION get_potential_duplicate_declarations(
        p_declaration_id UUID
      )
      RETURNS TABLE (
        id UUID, ref_service TEXT, title TEXT,
        department_id UUID, department_name TEXT, distance_m DOUBLE PRECISION
      ) AS $$
        SELECT
          d2.id, d2.ref_service, d2.title,
          d2.department_id, s.name_fr,
          ROUND(ST_Distance(d1.location, d2.location)::numeric, 0)::double precision
        FROM declarations d1
        JOIN declarations d2 ON d2.id != d1.id
        JOIN services s ON s.id = d2.department_id
        WHERE d1.id = p_declaration_id
          AND ST_DWithin(d1.location, d2.location, 30)
          AND d2.department_id != d1.department_id
          AND d2.is_deleted = false
          AND d2.status NOT IN ('cloturee', 'refusee_chef', 'refusee_agent')
          AND d2.created_at > now() - interval '48 hours'
        ORDER BY ST_Distance(d1.location, d2.location) ASC;
      $$ LANGUAGE sql STABLE;
    `);

    // 7. update declaration_photos constraints
    await db.pool.query(`
      ALTER TABLE declaration_photos
        DROP CONSTRAINT IF EXISTS declaration_photos_photo_type_check;
    `);
    await db.pool.query(`
      ALTER TABLE declaration_photos
        ADD CONSTRAINT declaration_photos_photo_type_check
        CHECK (photo_type IN ('citizen', 'before', 'after', 'proof'));
    `);

    console.log('SQL executed successfully');
    process.exit(0);
  } catch (err) {
    console.error('Error executing SQL:');
    console.error(err);
    process.exit(1);
  }
}
run();
