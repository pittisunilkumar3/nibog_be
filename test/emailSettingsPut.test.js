// test/emailSettingsPut.test.js
const axios = require('axios');
const assert = require('assert');

const BASE_URL = 'http://localhost:3004/api/email-settings';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJzdXBlcmFkbWluQGdtYWlsLmNvbSIsImVtcGxveWVlX2lkIjoiRU1QMDAxIiwiaXNfc3VwZXJhZG1pbiI6MSwiaWF0IjoxNzY1NzE0OTQ2LCJleHAiOjE3NjU4MDEzNDZ9.YfhPQQdkhPIRc1RIzbH1I1wdvmED6DOfqHj2BhHCJDs';

async function testPutEmailSettings() {
  const payload = {
    smtp_host: 'smtp.example.commm',
    smtp_port: 587,
    smtp_username: 'user@example.com',
    smtp_password: 'password123',
    sender_name: 'Test Sender',
    sender_email: 'sender@example.com'
  };

  try {
    const res = await axios.put(BASE_URL, payload, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    console.log('PUT /api/emailSettings test passed:', res.data);
  } catch (err) {
    console.error('PUT /api/emailSettings test failed:', err.response ? err.response.data : err.message);
    process.exit(1);
  }
}

testPutEmailSettings();
