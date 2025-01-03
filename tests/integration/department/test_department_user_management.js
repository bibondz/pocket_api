const axios = require('axios');
const { PB_URL } = require('../config');
const testEdgeCases = require('./test_edge_cases');
const cleanupTestData = require('./cleanup');

async function testDepartmentUserManagement() {
    let state = {
        departmentId: null,
        userIds: [],
        tankIds: []
    };
    let authToken = null;

    try {
        // Login as admin
        console.log('\n🔑 Getting admin token...');
        const loginResponse = await axios.post(`${PB_URL}/api/collections/users/auth-with-password`, {
            identity: 'admin@example.com',
            password: 'TestUser@2024'
        });
        authToken = loginResponse.data.token;
        console.log('✅ Got admin token');

        // Create test department
        console.log('\n🏢 Creating test department...');
        const timestamp = new Date().getTime();
        const departmentResponse = await axios.post(
            `${PB_URL}/api/collections/departments/records`,
            { name: `Test Department ${timestamp}` },
            { headers: { 'Authorization': `Bearer ${authToken}` } }
        );
        state.departmentId = departmentResponse.data.id;

        // Create test users
        console.log('\n👥 Creating test users...');
        const users = [];
        for (let i = 1; i <= 3; i++) {
            const userResponse = await axios.post(
                `${PB_URL}/api/collections/users/records`,
                {
                    email: `test${i}_${timestamp}@example.com`,
                    password: 'Test123!@#',
                    passwordConfirm: 'Test123!@#',
                    name: `Test User ${i}`,
                    username: `testuser${i}_${timestamp}`,
                    role: i === 1 ? 'manager' : 'operator'
                },
                { headers: { 'Authorization': `Bearer ${authToken}` } }
            );
            users.push(userResponse.data);
            state.userIds.push(userResponse.data.id);
        }

        // Run edge case tests
        await testEdgeCases(authToken, state);

        console.log('\n✨ All tests completed successfully');

    } catch (error) {
        console.error('\n❌ Test failed:', error.response?.data || error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    } finally {
        if (state.departmentId && authToken) {
            await cleanupTestData(authToken, state);
        }
    }
}

testDepartmentUserManagement(); 