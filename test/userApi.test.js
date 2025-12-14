// test/userApi.test.js
const axios = require('axios');
const assert = require('assert');

const BASE_URL = 'http://localhost:3004/api/user';

async function testRegister() {
  const payload = {
    full_name: 'Test User',
    email: `testuser_${Date.now()}@example.com`,
    password: 'TestPass123!',
    phone: '1234567890',
    city_id: 1
  };
  try {
    const res = await axios.post(`${BASE_URL}/register`, payload);
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.success, true);
    console.log('Register test passed:', res.data.user.email);
    return payload;
  } catch (err) {
    console.error('Register test failed:', err.response ? err.response.data : err.message);
    process.exit(1);
  }
}

async function testLogin(email, password) {
  try {
    const res = await axios.post(`${BASE_URL}/login`, { email, password });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    console.log('Login test passed:', res.data.token);
    return res.data.token;
  } catch (err) {
    console.error('Login test failed:', err.response ? err.response.data : err.message);
    process.exit(1);
  }
}

async function testGetProfile(token) {
  try {
    const res = await axios.get(`${BASE_URL}/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    console.log('Get profile test passed:', res.data.user.email);
  } catch (err) {
    console.error('Get profile test failed:', err.response ? err.response.data : err.message);
    process.exit(1);
  }
}

(async () => {
  const regPayload = await testRegister();
  const token = await testLogin(regPayload.email, regPayload.password);
  await testGetProfile(token);
})();
