// Test script to verify API integration
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

async function testAPIEndpoints() {
  console.log('🚀 Testing API endpoints...\n');

  // Test health endpoint
  try {
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get(`${API_BASE_URL}/health`);
    console.log('✅ Health check:', healthResponse.data);
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
  }

  // Test auth endpoints
  try {
    console.log('\n2. Testing auth endpoints...');

    // Test registration
    const testUser = {
      email: `test${Date.now()}@example.com`,
      password: 'Test123!@#',
      name: 'Test User'
    };

    console.log('   - Testing registration...');
    const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, testUser);
    console.log('✅ Registration successful:', {
      user: registerResponse.data.data.user,
      tokenExists: !!registerResponse.data.data.token
    });

    // Test login
    console.log('   - Testing login...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });
    console.log('✅ Login successful:', {
      user: loginResponse.data.data.user,
      tokenExists: !!loginResponse.data.data.token
    });

    const token = loginResponse.data.data.token;

    // Test protected endpoints with token
    console.log('   - Testing protected endpoint...');
    const profileResponse = await axios.get(`${API_BASE_URL}/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Profile fetch successful:', profileResponse.data.data);

    // Test subscription plans
    console.log('   - Testing subscription plans...');
    const plansResponse = await axios.get(`${API_BASE_URL}/auth/subscription/plans`);
    console.log('✅ Subscription plans:', plansResponse.data.data.plans.length + ' plans available');

  } catch (error) {
    console.log('❌ Auth test failed:', error.response?.data || error.message);
  }

  // Test conversion endpoints
  try {
    console.log('\n3. Testing conversion endpoints...');

    // Test getting supported conversions
    console.log('   - Testing supported conversions...');
    const supportedResponse = await axios.get(`${API_BASE_URL}/conversion/supported`);
    console.log('✅ Supported conversions:', Object.keys(supportedResponse.data.data.conversions).join(', '));

  } catch (error) {
    console.log('❌ Conversion test failed:', error.response?.data || error.message);
  }

  console.log('\n🏁 API testing completed!');
}

testAPIEndpoints().catch(console.error);
