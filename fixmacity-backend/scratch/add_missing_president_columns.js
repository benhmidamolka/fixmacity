const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'fixmacity',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '98452169.PApa',
});

async function main() {
  console.log("Checking and adding missing columns to declarations table...");
  
  // 1. Add president_override column
  try {
    await pool.query(`
      ALTER TABLE declarations 
      ADD COLUMN IF NOT EXISTS president_override VARCHAR(50);
    `);
    console.log("Column 'president_override' checked/added successfully.");
  } catch (err) {
    console.error("Error adding 'president_override':", err.message);
  }

  // 2. Add president_override_note column
  try {
    await pool.query(`
      ALTER TABLE declarations 
      ADD COLUMN IF NOT EXISTS president_override_note TEXT;
    `);
    console.log("Column 'president_override_note' checked/added successfully.");
  } catch (err) {
    console.error("Error adding 'president_override_note':", err.message);
  }
}

main().catch(console.error).finally(() => pool.end());
