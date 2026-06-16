const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runQueries() {
  console.log("--- Query 1: SELECT DISTINCT type FROM propositions ---");
  const { data: types, error: err1 } = await supabase.from('propositions').select('type');
  if (err1) {
    console.error("Error running query 1:", err1.message);
  } else {
    const uniqueTypes = [...new Set(types.map(t => t.type))];
    console.log("Unique types:", uniqueTypes);
  }

  console.log("\n--- Query 2: Columns of propositions table ---");
  // Using an API request to get columns isn't straightforward with supabase-js, but we can do a dummy select limit 1 to get keys
  const { data: cols, error: err2 } = await supabase.from('propositions').select('*').limit(1);
  if (err2) {
    console.error("Error running query 2:", err2.message);
  } else {
    if (cols && cols.length > 0) {
      console.log("Columns:", Object.keys(cols[0]));
    } else {
      console.log("No data found to infer columns. Falling back to a Postgres query via RPC if possible, or just reporting no data.");
    }
  }
}

runQueries();
