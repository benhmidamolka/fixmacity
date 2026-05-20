const { pool } = require('./src/config/db');
async function test() {
  try {
    const res = await pool.query('SELECT * FROM declarations LIMIT 1');
    if (res.rows.length > 0) {
      console.log(Object.keys(res.rows[0]).join(', '));
    }
    process.exit(0);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
test();
