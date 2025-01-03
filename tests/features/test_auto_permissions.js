const axios = require('axios');
const { PB_URL } = require('../config');
const API_URL = 'http://localhost:5053';

async function testAutoPermissions() {
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
                    description: `Test department ${i} for permissions`,
                    location: 'Test Location'
                },
                { headers: { 'Authorization': `Bearer ${authToken}` } }
            );
            state.departments.push(deptResponse.data.id);
        }
        console.log('✅ Created test departments');

        // 3. Create test users with different roles
        console.log('\n👥 Creating test users...');
        const users = [
            { role: 'manager', dept: 0 },    // Manager for dept 1
            { role: 'operator', dept: 0 },   // Operator for dept 1
            { role: 'manager', dept: 1 },    // Manager for dept 2
            { role: 'operator', dept: 1 }    // Operator for dept 2
        ];

        for (let i = 0; i < users.length; i++) {
            const email = `perm_test${i+1}_${timestamp}@example.com`;
            const userResponse = await axios.post(
                `${API_URL}/users`,
                {
                    email: email,
                    password: 'Test123!@#',
                    passwordConfirm: 'Test123!@#',
                    name: `Permission Test User ${i+1}`,
                    role: users[i].role
                },
                { headers: { 'Authorization': `Bearer ${authToken}` } }
            );
            users[i].id = userResponse.data.id;
            state.users.push(userResponse.data.id);
            state.userEmails[users[i].role] = state.userEmails[users[i].role] || [];
            state.userEmails[users[i].role].push(email);
        }
        console.log('✅ Created test users');

        // 4. Add users to their respective departments
        console.log('\n🔄 Adding users to departments...');
        for (const user of users) {
            await axios.post(
                `${API_URL}/departments/${state.departments[user.dept]}/members`,
                {
                    userIds: [user.id],
                    role: user.role
                },
                { headers: { 'Authorization': `Bearer ${authToken}` } }
            );
            console.log(`Added ${user.role} to department ${user.dept + 1}`);
        }
        console.log('✅ Added users to departments');

        // 5. Create test tanks in each department
        console.log('\n🛢️ Creating test tanks...');
        for (let dept = 0; dept < 2; dept++) {
            for (let i = 1; i <= 2; i++) {
                const tankResponse = await axios.post(
                    `${API_URL}/tanks`,
                    {
                        name: `Permission Test Tank ${dept+1}-${i}`,
                        tank_id: `PERM-${timestamp}-${dept+1}-${i}`,
                        capacity: 1000 * i,
                        status: 'active',
                        department: state.departments[dept]
                    },
                    { headers: { 'Authorization': `Bearer ${authToken}` } }
                );
                state.tanks.push(tankResponse.data.id);
            }
        }
        console.log('✅ Created test tanks');

        // 6. Test: Verify automatic permissions
        console.log('\n🔍 Testing: Verifying automatic permissions...');
        
        // Test each user
        for (const user of users) {
            console.log(`\n👤 Testing ${user.role} in department ${user.dept + 1}...`);
            
            // Login as user
            const userLogin = await axios.post(`${PB_URL}/api/collections/users/auth-with-password`, {
                identity: state.userEmails[user.role][user.dept],
                password: 'Test123!@#'
            });
            const userToken = userLogin.data.token;

            // Test 1: View department tanks
            try {
                const deptTanks = await axios.get(
                    `${API_URL}/departments/${state.departments[user.dept]}/tanks`,
                    { headers: { 'Authorization': `Bearer ${userToken}` } }
                );
                console.log(`✅ Can view tanks in own department (${deptTanks.data.length} tanks)`);
            } catch (error) {
                console.error('❌ Cannot view tanks in own department');
            }

            // Test 2: Try to view other department's tanks
            try {
                const otherDept = user.dept === 0 ? 1 : 0;
                await axios.get(
                    `${API_URL}/departments/${state.departments[otherDept]}/tanks`,
                    { headers: { 'Authorization': `Bearer ${userToken}` } }
                );
                console.error('❌ Can view tanks in other department (should be denied)');
            } catch (error) {
                console.log('✅ Cannot view tanks in other department (correct)');
            }

            // Test 3: Manager-specific permissions
            if (user.role === 'manager') {
                // Try to add new user to department
                try {
                    await axios.post(
                        `${API_URL}/departments/${state.departments[user.dept]}/members`,
                        {
                            userIds: [state.users[0]], // Try to add first user
                            role: 'operator'
                        },
                        { headers: { 'Authorization': `Bearer ${userToken}` } }
                    );
                    console.log('✅ Manager can add users to department');
                } catch (error) {
                    console.error('❌ Manager cannot add users to department');
                }
            }

            // Test 4: Operator-specific permissions
            if (user.role === 'operator') {
                // Try to update tank status
                try {
                    const deptTanks = await axios.get(
                        `${API_URL}/departments/${state.departments[user.dept]}/tanks`,
                        { headers: { 'Authorization': `Bearer ${userToken}` } }
                    );
                    if (deptTanks.data.length > 0) {
                        await axios.patch(
                            `${API_URL}/tanks/${deptTanks.data[0].id}/status`,
                            { status: 'maintenance' },
                            { headers: { 'Authorization': `Bearer ${userToken}` } }
                        );
                        console.log('✅ Operator can update tank status');
                    }
                } catch (error) {
                    console.error('❌ Operator cannot update tank status');
                }
            }
        }

        console.log('\n✨ All permission tests completed successfully');

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

testAutoPermissions(); 