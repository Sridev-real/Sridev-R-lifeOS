const http = require('http');
const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/opportunities/discover',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
}, res => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log('Response:', body));
});
req.on('error', console.error);
req.write(JSON.stringify({ userProfile: {} }));
req.end();
