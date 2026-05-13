require('dotenv').config();
const axios = require('axios');

async function test() {
  try {
    const login = await axios.post('http://localhost:5000/api/auth/login', { email: 'chef.voirie@sousse.tn', password: 'password123' });
    const token = login.data.token;
    
    const { data } = await axios.get('http://localhost:5000/api/chef/agents', { headers: { Authorization: `Bearer ${token}` } });
    console.log(JSON.stringify(data, null, 2));
  } catch(e) {
    if (e.response) {
      console.error(e.response.data);
    } else {
      console.error(e.message);
    }
  }
}
test();
