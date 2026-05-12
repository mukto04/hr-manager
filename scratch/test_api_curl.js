// This script tries to call the local API as if it were the browser
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/settings/attendance',
  method: 'GET',
  headers: {
    // I need the cookie here, but I don't have it.
    // However, I can try to see if it returns a 500 or a 302 (redirect).
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
  res.setEncoding('utf8');
  res.on('data', (chunk) => {
    console.log(`BODY: ${chunk}`);
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.end();
