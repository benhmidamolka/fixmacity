require('dotenv').config();
const db = require('./src/config/db');
async function test() {
  try {
    const res = await db.pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'ratings'");
    console.log(res.rows);
  } catch(e) { console.error(e) }
  process.exit(0);
}
test();
