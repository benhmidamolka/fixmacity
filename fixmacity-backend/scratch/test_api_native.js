const http = require('http');

const loginData = JSON.stringify({
  email: 'president@sousse.tn',
  password: 'Password123!'
});

const loginOptions = {
  hostname: 'localhost',
  port: 5005,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': loginData.length
  }
};

const req = http.request(loginOptions, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Login Response:', data);
    const result = JSON.parse(data);
    if (result.token) {
      fetchDashboard(result.token);
    }
  });
});

req.on('error', (e) => { console.error('Error:', e.message); });
req.write(loginData);
req.end();

function fetchDashboard(token) {
  const dashOptions = {
    hostname: 'localhost',
    port: 5005,
    path: '/api/president/dashboard',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };

  const dashReq = http.request(dashOptions, (res) => {
    let dashData = '';
    res.on('data', (chunk) => { dashData += chunk; });
    res.on('end', () => {
      console.log('Dashboard Data:', dashData);
    });
  });
  dashReq.on('error', (e) => { console.error('Dash Error:', e.message); });
  dashReq.end();
}
