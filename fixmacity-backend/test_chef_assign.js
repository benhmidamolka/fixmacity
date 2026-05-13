require('dotenv').config();
const axios = require('axios');

async function test() {
  try {
    const login = await axios.post('http://localhost:5000/api/auth/login', { email: 'chef.voirie@sousse.tn', password: 'password123' });
    const token = login.data.token;
    
    const { data: agents } = await axios.get('http://localhost:5000/api/chef/agents', { headers: { Authorization: `Bearer ${token}` } });
    const agent = agents.agents[0];
    
    const declLogin = await axios.post('http://localhost:5000/api/auth/login', { email: 'president@sousse.tn', password: 'password123' });
    const ptoken = declLogin.data.token;
    
    const { data: decls } = await axios.get('http://localhost:5000/api/president/declarations', { headers: { Authorization: `Bearer ${ptoken}` } });
    
    const pending = decls.declarations.find(d => d.status === 'assignee_chef' && d.department_id === 'c3c9d2cd-4b55-481b-b577-92ae1ee7d8d1');
    if (!pending) {
      console.log('No pending declarations to assign');
      return;
    }
    console.log('Decl to assign:', pending.id);
    
    const res = await axios.post(`http://localhost:5000/api/chef/declarations/${pending.id}/accept`, { agent_id: agent.id }, { headers: { Authorization: `Bearer ${token}` } });
    console.log('Success:', res.data.declaration.id, 'status:', res.data.declaration.status);
  } catch(e) {
    if (e.response) {
      console.error('Error status:', e.response.status);
      console.error('Error data:', e.response.data);
    } else {
      console.error('Error:', e.message);
    }
  }
}
test();
