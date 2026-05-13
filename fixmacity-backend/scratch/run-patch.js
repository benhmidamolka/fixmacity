require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'fixmacity',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

async function runPatch() {
  try {
    const patchPath = path.join(__dirname, '..', 'update_boroughs.sql');
    const sql = fs.readFileSync(patchPath, 'utf8');
    
    console.log('🚀 Running borough update patch...');
    await pool.query(sql);
    console.log('✅ Boroughs updated to the four-borough Sousse model.');
    
    const { rows } = await pool.query('SELECT name, code FROM delegations');
    console.log('Current delegations:', rows);
  } catch (err) {
    console.error('❌ Error applying patch:', err.message);
  } finally {
    await pool.end();
  }
}

runPatch();
