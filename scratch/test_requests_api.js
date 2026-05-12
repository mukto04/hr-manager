
// Quick test of the /api/requests endpoint
const http = require('http');

function makeRequest(path, cookie) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET',
      headers: { 'Cookie': cookie || '' }
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`${path} → ${res.statusCode}`);
        try { console.log(JSON.stringify(JSON.parse(data), null, 2).substring(0, 300)); } catch(e) { console.log(data.substring(0, 200)); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  await makeRequest('/api/requests');
  await makeRequest('/api/requests?type=loan&status=PENDING');
  await makeRequest('/api/requests?type=leave&status=PENDING');
  await makeRequest('/api/requests?type=advance&status=PENDING');
}

main().catch(console.error);
