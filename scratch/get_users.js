const { Pool } = require('pg');
require('dotenv').config({ path: '../fixmacity-backend/.env' });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'fixmacity',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '98452169.PApa',
});

async function main() {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT id, email, first_name, last_name, role FROM users');
    console.log('Users in Database:');
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error('Error querying users:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
