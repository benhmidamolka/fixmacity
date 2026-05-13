const bcrypt = require('bcrypt');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function main() {
  const newPassword = 'Admin1234!';
  const hash = await bcrypt.hash(newPassword, 12);

  // Reset chef password
  const { data: chef, error: chefErr } = await supabase
    .from('users')
    .update({ password_hash: hash })
    .eq('email', 'chef.voirie@sousse.tn')
    .select('email, first_name, last_name, role')
    .single();

  if (chefErr) {
    console.error('Chef error:', chefErr.message);
  } else {
    console.log(`✅ Chef: ${chef.first_name} ${chef.last_name} (${chef.email}) → password: ${newPassword}`);
  }

  // Also reset president
  const { data: pres, error: presErr } = await supabase
    .from('users')
    .update({ password_hash: hash })
    .eq('email', 'president@sousse.tn')
    .select('email, first_name, last_name, role')
    .single();

  if (presErr) {
    console.error('President error:', presErr.message);
  } else {
    console.log(`✅ President: ${pres.first_name} ${pres.last_name} (${pres.email}) → password: ${newPassword}`);
  }

  // Also reset agents
  const { data: agents } = await supabase
    .from('users')
    .update({ password_hash: hash })
    .in('email', ['agent.voirie@sousse.tn', 'agent2.voirie@sousse.tn'])
    .select('email, first_name, last_name, role');

  if (agents) {
    agents.forEach(a => console.log(`✅ Agent: ${a.first_name} ${a.last_name} (${a.email}) → password: ${newPassword}`));
  }
}

main().catch(console.error);
