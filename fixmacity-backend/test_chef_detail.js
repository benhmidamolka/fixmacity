require('dotenv').config();
const axios = require('axios');

async function test() {
  try {
    const login = await axios.post('http://localhost:5000/api/auth/login', { email: 'chef.voirie@sousse.tn', password: 'password123' });
    const token = login.data.token;
    
    const { data: decls } = await axios.get('http://localhost:5000/api/chef/declarations', { headers: { Authorization: `Bearer ${token}` } });
    
    const decl = decls.declarations.find(d => d.status === 'assignee_agent');
    if (decl) {
      const { data } = await axios.get(`http://localhost:5000/api/chef/declarations/${decl.id}`, { headers: { Authorization: `Bearer ${token}` } });
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log("No assignee_agent declaration found.");
    }
  } catch(e) {
    if (e.response) {
      console.error(e.response.data);
    } else {
      console.error(e.message);
    }
  }
}
test();
