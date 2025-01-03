const axios = require('axios');
const cleanupTestData = require('./cleanup');
const { PB_URL } = require('../config');
const API_URL = 'http://localhost:5053';

async function testAccessFormat() {
    let state = {
        departments: [],
        users: [],
        accessRecords: []
    };
    let authToken = null;

    try {
        // 1. Login first to get token
        console.log('\n🔑 Getting admin token...');
        const loginResponse = await axios.post(`${PB_URL}/api/collections/users/auth-with-password`, {
            identity: 'admin@example.com',
            password: 'TestUser@2024'
        });
        authToken = loginResponse.data.token;
        console.log('✅ Got admin token');

        // 2. Create test department
        console.log('\n🏢 Creating test department...');
        const timestamp = new Date().getTime();
        const deptResponse = await axios.post(
            `${API_URL}/departments`,
            { 
                name: `TEST_Department_${timestamp}`,
                description: 'Test department for access format',
                location: 'Test Location'
            },
            { headers: { 'Authorization': `Bearer ${authToken}` } }
        );
        const department = deptResponse.data;
        state.departments.push(department.id);
        console.log('✅ Created test department');

        // 3. Create test users (1 manager, 2 operators)
        console.log('\n👥 Creating test users...');
        const users = [];
        const roles = ['manager', 'operator', 'operator'];
        
        for (let i = 0; i < roles.length; i++) {
            const userResponse = await axios.post(
                `${API_URL}/admin/users`,
                {
                    username: `TEST_User_${timestamp}_${i}`,
                    email: `test${timestamp}${i}@example.com`,
                    password: 'TestPass@2024',
                    passwordConfirm: 'TestPass@2024',
                    role: roles[i],
                    name: `Test User ${i}`,
                    verified: true,
                    emailVisibility: true,
                    departments: [],
                    created_tokens: [],
                    managed_tokens: []
                },
                { headers: { 'Authorization': `Bearer ${authToken}` } }
            );
            users.push(userResponse.data);
            state.users.push(userResponse.data.id);
        }
        console.log('✅ Created test users');

        // 4. Add users to department with different roles
        console.log('\n👥 Adding users to department...');
        for (const user of users) {
            const accessResponse = await axios.post(
                `${API_URL}/departments/${department.id}/members`,
                {
                    userId: user.id,
                    role: user.role,
                    tank_permissions: {}
                },
                { headers: { 'Authorization': `Bearer ${authToken}` } }
            );
            state.accessRecords.push(accessResponse.data.id);
        }
        console.log('✅ Added users to department');

        // 5. Check department members
        console.log('\n👥 Checking department members...');
        const membersResponse = await axios.get(
            `${API_URL}/departments/${department.id}/members`,
            { headers: { 'Authorization': `Bearer ${authToken}` } }
        );
        console.log('✅ Department members:', membersResponse.data);

        console.log('\n✨ All tests completed successfully');

    } catch (error) {
        console.error('\n❌ Test failed:', error.response?.data || error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    } finally {
        // Clean up test data
        if (authToken) {
            await cleanupTestData(authToken, state);
        }
    }
}

testAccessFormat(); 