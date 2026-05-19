'use strict';
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'fixmacity',
  user: 'postgres',
  password: '98452169.PApa',
});

async function main() {
  try {
    console.log('Listing tables:');
    const tablesRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log(tablesRes.rows.map(r => r.table_name));

    console.log('\nColumns of declarations:');
    const colsRes = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'declarations'
    `);
    console.log(colsRes.rows);

    console.log('\nColumns of internal_comments:');
    const commentColsRes = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'internal_comments'
    `);
    console.log(commentColsRes.rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

main();
