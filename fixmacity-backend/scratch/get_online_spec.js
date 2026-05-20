const axios = require('axios');

const url = 'https://wcmytoghuyiscvfnjfzm.supabase.co/rest/v1/';
const serviceKey = 'sb_secret_8SnT-9LH7Mc0m_EdxJq-vg_8iWppfTz';

async function main() {
  console.log("Fetching OpenAPI spec with service key...");
  const response = await axios.get(url, {
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`
    }
  });

  const definitions = response.data.definitions;
  if (definitions) {
    console.log("Keys available in definitions:", Object.keys(definitions));
    if (definitions.v_declaration_priority) {
      console.log("v_declaration_priority spec:", JSON.stringify(definitions.v_declaration_priority, null, 2));
    } else {
      console.log("v_declaration_priority definition not found in definitions.");
    }
  } else {
    console.log("No definitions found in spec.");
  }
}

main().catch(console.error);
