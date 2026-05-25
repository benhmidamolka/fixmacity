require('dotenv').config();
const db = require('../src/config/db');

async function run() {
  try {
    const { data, error } = await db.rpc('get_status_values');
    if (error) {
      // If the helper RPC doesn't exist, execute direct query
      const { data: enumData, error: enumError } = await db.rpc('exec_sql', {
        sql_query: "SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'declaration_status'"
      });
      if (enumError) {
        // Let's try direct select from pg_enum if we can or check if we have another way
        console.error('RPC Error:', enumError);
        
        // Let's try another approach: query a view or try to query the schema
        const { data: pgData, error: pgError } = await db.from('pg_enum').select('*'); // might not be exposed
        console.error('Direct enum table query:', pgError ? pgError.message : pgData);
      } else {
        console.log('Enum values:', enumData);
      }
    } else {
      console.log('Enum values (RPC):', data);
    }
  } catch (err) {
    console.error('Catch error:', err);
  }
}

run();
