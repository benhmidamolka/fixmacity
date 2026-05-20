const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wcmytoghuyiscvfnjfzm.supabase.co';
const supabaseKey = 'sb_secret_8SnT-9LH7Mc0m_EdxJq-vg_8iWppfTz';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Checking if v_declaration_priority exists...");
  // Let's get a list of columns by querying with a select that might fail, or query 1 row
  const { data: viewData, error: viewError } = await supabase
    .from('v_declaration_priority')
    .select('*')
    .limit(1);

  if (viewError) {
    console.error("v_declaration_priority error:", viewError);
  } else {
    console.log("v_declaration_priority success! Row count:", viewData.length);
    if (viewData.length > 0) {
      console.log("Keys in v_declaration_priority:", Object.keys(viewData[0]));
      console.log("Row details:", viewData[0]);
    } else {
      console.log("v_declaration_priority is empty, no rows.");
    }
  }

  // Let's check declarations table counts
  const { count, error: declError } = await supabase
    .from('declarations')
    .select('*', { count: 'exact', head: true });
  console.log("Total declarations in database:", count, declError ? declError.message : "");

  // Let's get one declaration to see if we can find its id
  const { data: decls, error: declsError } = await supabase
    .from('declarations')
    .select('id, title')
    .limit(5);
  console.log("Declarations sample:", decls);
}

main().catch(console.error);
