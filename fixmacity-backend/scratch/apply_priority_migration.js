const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'fixmacity',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '98452169.PApa',
});

async function main() {
  console.log("Applying priority migration to local DB...");

  // Add columns to declarations table if they don't exist
  await pool.query(`
    ALTER TABLE declarations 
    ADD COLUMN IF NOT EXISTS priority_label VARCHAR(50),
    ADD COLUMN IF NOT EXISTS priority_method VARCHAR(50),
    ADD COLUMN IF NOT EXISTS priority_meta JSONB;
  `);

  console.log("Migration applied successfully!");
}

main().catch(console.error).finally(() => pool.end());
