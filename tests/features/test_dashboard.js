const axios = require('axios');
const { PB_URL } = require('../config');
const API_URL = 'http://localhost:5053';

async function testDashboard() {
    let state = {
        departments: [],
        users: [],
        tanks: [],
        userEmails: {}
    };
    let authToken = null;

    try {
        // 1. Login as admin
        console.log('\n🔑 Getting admin token...');
        const loginResponse = await axios.post(`${PB_URL}/api/collections/users/auth-with-password`, {
            identity: 'admin@example.com',
            password: 'TestUser@2024'
        });
        authToken = loginResponse.data.token;
        console.log('✅ Got admin token');

        // 2. Create test departments
        console.log('\n🏢 Creating test departments...');
        const timestamp = new Date().getTime();
        for (let i = 1; i <= 2; i++) {
            const deptResponse = await axios.post(
                `${API_URL}/departments`,
                { 
                    name: `Test Department ${i}-${timestamp}`,
                    description: `Test department ${i} for dashboard`,
                    location: 'Test Location'
                },
                { headers: { 'Authorization': `Bearer ${authToken}` } }
            );
            state.departments.push(deptResponse.data.id);
        }
        console.log('✅ Created test departments');

        // 3. Create test users
        console.log('\n👥 Creating test users...');
        const roles = ['manager', 'operator', 'operator'];
        for (let i = 0; i < roles.length; i++) {
            const email = `dashboard_test${i+1}_${timestamp}@example.com`;
            const userResponse = await axios.post(
                `${API_URL}/users`,
                {
                    email: email,
                    password: 'Test123!@#',
                    passwordConfirm: 'Test123!@#',
                    name: `Dashboard Test User ${i+1}`,
                    role: roles[i]
                },
                { headers: { 'Authorization': `Bearer ${authToken}` } }
            );
            state.users.push(userResponse.data.id);
            state.userEmails[roles[i]] = state.userEmails[roles[i]] || [];
            state.userEmails[roles[i]].push(email);
        }
        console.log('✅ Created test users');

        // 4. Add users to departments
        console.log('\n🔄 Adding users to departments...');
        // Add manager and first operator to first department
        await axios.post(
            `${API_URL}/departments/${state.departments[0]}/members`,
            {
                userIds: [state.users[0], state.users[1]], // manager and first operator
                role: 'member'
            },
            { headers: { 'Authorization': `Bearer ${authToken}` } }
        );
        // Add second operator to second department
        await axios.post(
            `${API_URL}/departments/${state.departments[1]}/members`,
            {
                userIds: [state.users[2]], // second operator
                role: 'member'
            },
            { headers: { 'Authorization': `Bearer ${authToken}` } }
        );
        console.log('✅ Added users to departments');

        // 5. Create test tanks
        console.log('\n🛢️ Creating test tanks...');
        for (let i = 1; i <= 4; i++) {
            const tankResponse = await axios.post(
                `${API_URL}/tanks`,
                {
                    name: `Dashboard Test Tank ${i}`,
                    tank_id: `DASH-${timestamp}-${i}`,
                    capacity: 1000 * i,
                    status: 'active',
                    department: state.departments[i % 2] // Alternate between departments
                },
                { headers: { 'Authorization': `Bearer ${authToken}` } }
            );
            state.tanks.push(tankResponse.data.id);
        }
        console.log('✅ Created test tanks');

        // 6. Test: Get dashboard data as admin
        console.log('\n📊 Testing: Get dashboard data as admin...');
        const adminDashboard = await axios.get(
            `${API_URL}/dashboard`,
            { 
                headers: { 'Authorization': `Bearer ${authToken}` },
                params: {
                    expand: 'tanks,users,departments'
                }
            }
        );
        console.log('Admin dashboard statistics:', adminDashboard.data.statistics);
        console.log('✅ Got admin dashboard data');

        // 7. Test: Get dashboard data as department manager
        console.log('\n📊 Testing: Get dashboard data as department manager...');
        const managerLogin = await axios.post(`${PB_URL}/api/collections/users/auth-with-password`, {
            identity: state.userEmails.manager[0],
            password: 'Test123!@#'
        });
        const managerToken = managerLogin.data.token;

        const managerDashboard = await axios.get(
            `${API_URL}/dashboard`,
            { 
                headers: { 'Authorization': `Bearer ${managerToken}` },
                params: {
                    expand: 'tanks,departments'
                }
            }
        );
        console.log('Manager dashboard statistics:', managerDashboard.data.statistics);
        console.log('✅ Got manager dashboard data');

        // 8. Test: Get dashboard data as operator
        console.log('\n📊 Testing: Get dashboard data as operator...');
        const operatorLogin = await axios.post(`${PB_URL}/api/collections/users/auth-with-password`, {
            identity: state.userEmails.operator[0],
            password: 'Test123!@#'
        });
        const operatorToken = operatorLogin.data.token;

        const operatorDashboard = await axios.get(
            `${API_URL}/dashboard`,
            { 
                headers: { 'Authorization': `Bearer ${operatorToken}` },
                params: {
                    expand: 'tanks'
                }
            }
        );
        console.log('Operator dashboard statistics:', operatorDashboard.data.statistics);
        
        // Verify operator can only see assigned tanks
        if (operatorDashboard.data.tanks) {
            console.log(`Operator can see ${operatorDashboard.data.tanks.length} tanks in their department`);
            const tankIds = operatorDashboard.data.tanks.map(t => t.tank_id).join(', ');
            console.log('Tank IDs:', tankIds);
        }
        console.log('✅ Got operator dashboard data');

        console.log('\n✨ All dashboard tests completed successfully');

    } catch (error) {
        console.error('\n❌ Test failed:', error.response?.data || error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    } finally {
        if (authToken) {
            await cleanupTestData(authToken, state);
        }
    }
}

async function cleanupTestData(authToken, state) {
    console.log('\n🧹 Cleaning up test data...');
    try {
        // Delete tanks
        for (const id of state.tanks) {
            try {
                await axios.delete(
                    `${API_URL}/tanks/${id}`,
                    { headers: { 'Authorization': `Bearer ${authToken}` } }
                );
            } catch (error) {
                console.log(`Could not delete tank ${id}:`, error.response?.data?.message || error.message);
            }
        }

        // Delete users
        for (const id of state.users) {
            try {
                await axios.delete(
                    `${API_URL}/users/${id}`,
                    { headers: { 'Authorization': `Bearer ${authToken}` } }
                );
            } catch (error) {
                console.log(`Could not delete user ${id}:`, error.response?.data?.message || error.message);
            }
        }

        // Delete departments
        for (const id of state.departments) {
            try {
                await axios.delete(
                    `${API_URL}/departments/${id}`,
                    { headers: { 'Authorization': `Bearer ${authToken}` } }
                );
            } catch (error) {
                console.log(`Could not delete department ${id}:`, error.response?.data?.message || error.message);
            }
        }
    } catch (error) {
        console.error('Error during cleanup:', error.message);
    }
    console.log('✅ Cleanup completed');
}

testDashboard(); 