const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wcmytoghuyiscvfnjfzm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjbXl0b2dodXlpc2N2Zm5qZnptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MTYzODAsImV4cCI6MjA5MDM5MjM4MH0.VVN46AfgfRxJUld_qqh5QKpXIv9XzxeLiIyLtU4xbg8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Fetching from v_declaration_priority...");
  const { data, error } = await supabase
    .from('v_declaration_priority')
    .select('*')
    .limit(5);

  if (error) {
    console.error("Error fetching:", error);
  } else {
    console.log("Success! Data count:", data.length);
    console.log("Sample:", data);
  }
}

main().catch(console.error);
