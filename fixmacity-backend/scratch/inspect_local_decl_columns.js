const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'fixmacity',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '98452169.PApa',
});

async function main() {
  console.log("Inspecting columns of declarations table in local DB...");
  const res = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'declarations'
    ORDER BY column_name;
  `);
  console.log(res.rows);
}

main().catch(console.error).finally(() => pool.end());
