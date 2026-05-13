
const { Pool } = require('pg');
require('dotenv').config({ path: 'c:/Users/Client/OneDrive/Bureau/Fixmacity/fixmacity-backend/.env' });

async function test() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'fixmacity',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  });

  try {
    const resT = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
    console.log('Tables:', resT.rows.map(r => r.table_name));

    const res = await pool.query('SELECT COUNT(*) FROM declarations');
    console.log('Total declarations:', res.rows[0].count);

    const res2 = await pool.query('SELECT COUNT(*) FROM declarations WHERE is_deleted = false AND latitude IS NOT NULL AND longitude IS NOT NULL');
    console.log('Valid map declarations:', res2.rows[0].count);

    const res3 = await pool.query('SELECT status, COUNT(*) FROM declarations GROUP BY status');
    console.log('Statuses:', res3.rows);
    
    const res4 = await pool.query('SELECT * FROM declarations LIMIT 1');
    console.log('First declaration columns:', Object.keys(res4.rows[0] || {}));

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

test();
