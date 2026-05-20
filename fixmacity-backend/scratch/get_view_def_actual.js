const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'fixmacity',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '98452169.PApa',
});

async function main() {
  console.log("Fetching view definition of v_declaration_priority...");
  const res = await pool.query(`
    SELECT pg_get_viewdef('v_declaration_priority'::regclass, true) AS view_definition;
  `);
  console.log(res.rows[0].view_definition);
}

main().catch(console.error).finally(() => pool.end());
