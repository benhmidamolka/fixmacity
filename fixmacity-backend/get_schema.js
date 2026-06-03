const { pool } = require('./src/config/db');

async function getSchema() {
  try {
    const res = await pool.query(`
      SELECT 
          tc.table_schema, 
          tc.table_name, 
          kcu.column_name, 
          ccu.table_schema AS foreign_table_schema,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name 
      FROM 
          information_schema.table_constraints AS tc 
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema='public';
    `);
    console.log(JSON.stringify(res.rows, null, 2));

    const cols = await pool.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public'
    `);
    const schema = {};
    cols.rows.forEach(r => {
      if (!schema[r.table_name]) schema[r.table_name] = [];
      schema[r.table_name].push(r.column_name);
    });
    console.log(JSON.stringify(schema, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

getSchema();
