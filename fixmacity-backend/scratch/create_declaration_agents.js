'use strict';
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'fixmacity',
  user: 'postgres',
  password: '98452169.PApa',
});

async function main() {
  try {
    console.log('Creating table declaration_agents...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS declaration_agents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        declaration_id UUID NOT NULL REFERENCES declarations(id) ON DELETE CASCADE,
        agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        CONSTRAINT declaration_agents_uniq UNIQUE(declaration_id, agent_id)
      );
    `);
    console.log('Table created successfully.');

    console.log('Migrating existing agent assignments...');
    const result = await pool.query(`
      INSERT INTO declaration_agents (declaration_id, agent_id, assigned_at)
      SELECT id, agent_id, COALESCE(assigned_at, now())
      FROM declarations
      WHERE agent_id IS NOT NULL
      ON CONFLICT (declaration_id, agent_id) DO NOTHING
      RETURNING id;
    `);
    console.log(`Migrated ${result.rowCount} existing assignments.`);

  } catch (err) {
    console.error('Error migrating DB:', err);
  } finally {
    await pool.end();
  }
}

main();
