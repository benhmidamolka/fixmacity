require('dotenv').config();
const { pool } = require('../src/config/db');
pool.query("SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name = 'declarations'")
  .then(r => console.table(r.rows))
  .finally(() => process.exit(0));