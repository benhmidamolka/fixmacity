require('dotenv').config();
const axios = require('axios');

const BASE = 'http://localhost:5005/api';

async function run() {
  console.log('=== FixMaCity Chef Assignment E2E Test ===\n');

  // 1. Login as Chef
  console.log('1. Logging in as chef.voirie...');
  const loginRes = await axios.post(`${BASE}/auth/login`, { email: 'chef.voirie@sousse.tn', password: 'Admin1234!' });
  const token = loginRes.data.token;
  const chef = loginRes.data.user;
  console.log(`   ✅ Logged in: ${chef.first_name} (${chef.role}, dept: ${chef.department_id})\n`);

  const headers = { Authorization: `Bearer ${token}` };

  // 2. Get declarations assigned to this chef
  console.log('2. Fetching chef declarations...');
  const declsRes = await axios.get(`${BASE}/chef/declarations`, { headers });
  const decls = declsRes.data.declarations;
  console.log(`   Total: ${decls.length} declarations`);
  const pending = decls.filter(d => d.status === 'assignee_chef');
  console.log(`   Pending (assignee_chef): ${pending.length}`);
  if (pending.length > 0) {
    console.log(`   First pending: ${pending[0].id} - ${pending[0].title || 'No title'}\n`);
  }

  // 3. Get agents list
  console.log('3. Fetching agents...');
  const agentsRes = await axios.get(`${BASE}/chef/agents`, { headers });
  const agents = agentsRes.data.agents || agentsRes.data;
  console.log(`   Found: ${Array.isArray(agents) ? agents.length : JSON.stringify(agents)} agents`);
  if (Array.isArray(agents) && agents.length > 0) {
    console.log(`   First agent: ${agents[0].first_name} ${agents[0].last_name} (${agents[0].id})\n`);
  }

  // 4. Try assigning if possible
  if (pending.length > 0 && Array.isArray(agents) && agents.length > 0) {
    const declId = pending[0].id;
    const agentId = agents[0].id;
    console.log(`4. Assigning declaration ${declId} to agent ${agents[0].first_name}...`);
    try {
      const assignRes = await axios.post(`${BASE}/chef/declarations/${declId}/accept`, { agent_id: agentId }, { headers });
      console.log(`   ✅ Assignment result: ${JSON.stringify(assignRes.data)}`);
    } catch (e) {
      console.error(`   ❌ Assignment failed: ${JSON.stringify(e.response?.data || e.message)}`);
    }
  } else {
    console.log('4. Skipping assignment (no pending decls or no agents)');
  }

  console.log('\n=== Done ===');
}

run().catch(e => {
  console.error('Fatal:', e.response?.data || e.message);
});
