const axios = require('axios');

async function testAgentCreate() {
  try {
    // 1. Login as Chef
    console.log('Logging in as chef...');
    const loginRes = await axios.post('http://localhost:5005/api/auth/login', {
      email: 'chef.voirie@sousse.tn',
      password: 'password123'
    });
    const token = loginRes.data.token;
    console.log('Got token.');

    // 2. Add an agent with an existing email
    console.log('Testing create agent with existing email...');
    const createRes = await axios.post('http://localhost:5005/api/chef/agents', {
      email: 'agent.aymen@sousse.tn',
      first_name: 'Test',
      last_name: 'Test',
      password: 'password123'
    }, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log('Success?', createRes.status, createRes.data);
  } catch (err) {
    if (err.response) {
      console.log('Failed as expected with:', err.response.status, err.response.data);
    } else {
      console.error(err.message);
    }
  }
}

testAgentCreate();
