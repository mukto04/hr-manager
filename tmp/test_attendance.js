const fetch = require('node-fetch');

async function testAttendance() {
  const baseUrl = 'http://localhost:3000';
  
  try {
    console.log("Testing GET /api/attendance...");
    const res = await fetch(`${baseUrl}/api/attendance`);
    const data = await res.json();
    console.log("GET Response:", JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Fetch error:", error.message);
  }
}

testAttendance();
