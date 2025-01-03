const axios = require('axios');
const { API_URL } = require('../../config');

// Test data
const TEST_CREDENTIALS = {
    email: 'admin@example.com',
    password: 'TestUser@2024'
};

async function testEndpoints() {
    let authToken = null;

    try {
        console.log('\n=== Testing Basic Endpoints ===\n');

        // 1. Health Check
        console.log('Testing Health Check...');
        const health = await axios.get(`${API_URL}/healthex`);
        console.log('✓ Health Check:', health.data);

        // 2. System Status
        console.log('\nTesting System Status...');
        const status = await axios.get(`${API_URL}/statusex`);
        console.log('✓ System Status:', status.data);

        // 3. Authentication
        console.log('\nTesting Authentication...');
        const auth = await axios.post(`${API_URL}/users/login`, TEST_CREDENTIALS);
        authToken = auth.data.token;
        console.log('✓ Authentication successful');

        // 4. List Departments
        console.log('\nTesting Department List...');
        const departments = await axios.get(`${API_URL}/departments`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        console.log('✓ Departments:', departments.data.length, 'found');

        // 5. List Tanks
        console.log('\nTesting Tank List...');
        const tanks = await axios.get(`${API_URL}/tanks`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        console.log('✓ Tanks:', tanks.data.length, 'found');

        console.log('\n=== All Endpoint Tests Passed ===\n');

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

// Run tests
testEndpoints(); 