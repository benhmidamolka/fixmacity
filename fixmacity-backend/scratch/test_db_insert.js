const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'fixmacity',
  user: 'postgres',
  password: '98452169.PApa'
});

async function run() {
  try {
    const res = await pool.query(`INSERT INTO users (email, password_hash, first_name, last_name, delegation_id, role) VALUES ('testxyz2@test.com', 'hash', 'Test', 'Xyz', 'a309fed2-6c50-49ae-b2be-a6e7ccd096df', 'citizen')`);
    console.log("Insert success:", res.rowCount);
  } catch (e) {
    console.error("Insert failed:", e);
  } finally {
    pool.end();
  }
}
run();
