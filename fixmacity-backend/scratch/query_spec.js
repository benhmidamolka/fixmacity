const axios = require('axios');

const url = 'https://wcmytoghuyiscvfnjfzm.supabase.co/rest/v1/';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjbXl0b2dodXlpc2N2Zm5qZnptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MTYzODAsImV4cCI6MjA5MDM5MjM4MH0.VVN46AfgfRxJUld_qqh5QKpXIv9XzxeLiIyLtU4xbg8';

async function main() {
  console.log("Fetching OpenAPI spec...");
  const response = await axios.get(url, {
    headers: {
      'apikey': anonKey,
      'Authorization': `Bearer ${anonKey}`
    }
  });

  const definitions = response.data.definitions;
  if (definitions && definitions.v_declaration_priority) {
    console.log("v_declaration_priority columns:", definitions.v_declaration_priority);
  } else {
    console.log("v_declaration_priority definition not found in spec.");
    console.log("Keys available:", Object.keys(definitions || {}));
  }
}

main().catch(console.error);
