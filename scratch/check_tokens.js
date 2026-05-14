const fs = require('fs');
const path = require('path');
const { createClient: createSupabaseClient } = require('@supabase/supabase-js');

// Read .env
const envPath = path.join(__dirname, '..', 'fixmacity-backend', '.env');
const env = fs.readFileSync(envPath, 'utf8');
const supabaseUrl = env.match(/SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_KEY=(.*)/)[1].trim();

const supabase = createSupabaseClient(supabaseUrl, supabaseKey);

async function check() {
  try {
    const { data, error } = await supabase.from('password_reset_tokens').select('*');
    if (error) {
      console.error('DB Error:', error);
    } else {
      console.log('Tokens in DB:', JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error('Execution Error:', err);
  }
}

check();
