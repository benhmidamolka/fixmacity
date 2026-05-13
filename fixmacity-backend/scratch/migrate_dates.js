const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:98452169.PApa@localhost:5432/fixmacity'
});

async function migrate() {
  try {
    console.log("Adding columns to declarations...");
    await pool.query("ALTER TABLE declarations ADD COLUMN IF NOT EXISTS planned_start TIMESTAMP");
    await pool.query("ALTER TABLE declarations ADD COLUMN IF NOT EXISTS planned_end TIMESTAMP");
    
    console.log("Adding columns to users...");
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20)");
    
    console.log("Migration successful!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    process.exit();
  }
}
migrate();
