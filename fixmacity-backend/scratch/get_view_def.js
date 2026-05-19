const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'fixmacity',
  user: 'postgres',
  password: '98452169.PApa',
});
async function main() {
  const res = await pool.query(`
    SELECT relname, relkind FROM pg_class WHERE relname LIKE '%priority%';
  `);
  console.log("MATCHING OBJECTS:", res.rows);
  await pool.end();
}
main().catch(console.error);
