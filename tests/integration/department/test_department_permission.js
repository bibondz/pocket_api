const axios = require('axios');
const { PB_URL, LOCAL_APP_URL } = require('../config');

async function testDepartmentPermission() {
    let state = {
        departments: [],
        users: [],
        tanks: [],
        accessRecords: []
    };
    let authToken = null;

    try {
        // 1. Login as admin (using PocketBase)
        console.log('\n🔑 Getting admin token...');
        const loginResponse = await axios.post(`${PB_URL}/api/collections/users/auth-with-password`, {
            identity: 'admin@example.com',
            password: 'TestUser@2024'
        });
        authToken = loginResponse.data.token;
        console.log('✅ Got admin token');

        // 2. Create test department (using Node app)
        console.log('\n🏢 Creating test department...');
        const timestamp = new Date().getTime();
        const deptResponse = await axios.post(
            `${LOCAL_APP_URL}/departments`,
            { 
                name: `Test Department ${timestamp}`,
                description: 'Test department for permissions',
                location: 'Test Location'
            },
            { headers: { 'Authorization': `Bearer ${authToken}` } }
        );
        const department = deptResponse.data;
        state.departments.push(department.id);
        console.log('✅ Created test department');

        // 3. Create test users (using PocketBase)
        console.log('\n👥 Creating test users...');
        const users = [];
        
        // Create manager
        const managerResponse = await axios.post(
            `${PB_URL}/api/collections/users/records`,
            {
                email: `perm_manager_${timestamp}@example.com`,
                password: 'Test123!@#',
                passwordConfirm: 'Test123!@#',
                name: 'Permission Test Manager',
                role: 'manager'
            },
            { headers: { 'Authorization': `Bearer ${authToken}` } }
        );
        users.push({ ...managerResponse.data, role: 'manager' });
        state.users.push(managerResponse.data.id);

        // Create operators
        for (let i = 1; i <= 2; i++) {
            const operatorResponse = await axios.post(
                `${PB_URL}/api/collections/users/records`,
                {
                    email: `perm_operator${i}_${timestamp}@example.com`,
                    password: 'Test123!@#',
                    passwordConfirm: 'Test123!@#',
                    name: `Permission Test Operator ${i}`,
                    role: 'operator'
                },
                { headers: { 'Authorization': `Bearer ${authToken}` } }
            );
            users.push({ ...operatorResponse.data, role: 'operator' });
            state.users.push(operatorResponse.data.id);
        }
        console.log('✅ Created test users');

        // 4. Create test tanks (using Node app)
        console.log('\n🛢️ Creating test tanks...');
        for (let i = 1; i <= 3; i++) {
            const tankResponse = await axios.post(
                `${LOCAL_APP_URL}/tanks`,
                {
                    name: `Permission Test Tank ${i}`,
                    tank_id: `PERM-${timestamp}-${i}`,
                    capacity: 1000 * i,
                    status: 'active'
                },
                { headers: { 'Authorization': `Bearer ${authToken}` } }
            );
            state.tanks.push(tankResponse.data.id);
        }
        console.log('✅ Created test tanks');

        // 5. Register tanks to department (using Node app)
        console.log('\n🔗 Registering tanks to department...');
        for (const tankId of state.tanks) {
            const result = await axios.post(
                `${LOCAL_APP_URL}/departments/${department.id}/tanks`,
                { tankId },
                { headers: { 'Authorization': `Bearer ${authToken}` } }
            );
            console.log(`Added tank ${tankId} to department:`, result.data);
        }

        // Verify department has tanks
        const deptCheck = await axios.get(
            `${LOCAL_APP_URL}/departments/${department.id}`,
            { headers: { 'Authorization': `Bearer ${authToken}` } }
        );
        console.log('Department after adding tanks:', deptCheck.data);
        console.log('✅ Registered tanks to department');

        // 6. Add users to department (using Node app)
        console.log('\n🔐 Adding users to department...');
        
        // Add manager (with no tank_permission needed)
        const managerAccess = await axios.post(
            `${LOCAL_APP_URL}/departments/${department.id}/members`,
            {
                userIds: [users[0].id],
                role: 'manager'
            },
            { headers: { 'Authorization': `Bearer ${authToken}` } }
        );
        state.accessRecords.push(managerAccess.data.id);
        console.log('✅ Added manager to department');

        // Add operator 1 (with permission to tanks 1 and 2)
        const operator1Access = await axios.post(
            `${LOCAL_APP_URL}/departments/${department.id}/members`,
            {
                userIds: [users[1].id],
                role: 'operator',
                tank_permission: {
                    [state.tanks[0]]: { read: true, write: true },
                    [state.tanks[1]]: { read: true, write: false }
                }
            },
            { headers: { 'Authorization': `Bearer ${authToken}` } }
        );
        state.accessRecords.push(operator1Access.data.id);
        console.log('✅ Added operator 1 to department');

        // Add operator 2 (with permission to tanks 2 and 3)
        const operator2Access = await axios.post(
            `${LOCAL_APP_URL}/departments/${department.id}/members`,
            {
                userIds: [users[2].id],
                role: 'operator',
                tank_permission: {
                    [state.tanks[1]]: { read: true, write: true },
                    [state.tanks[2]]: { read: true, write: true }
                }
            },
            { headers: { 'Authorization': `Bearer ${authToken}` } }
        );
        state.accessRecords.push(operator2Access.data.id);
        console.log('✅ Added operator 2 to department');

        // 7. Test permissions
        console.log('\n🔍 Testing permissions...');

        // Test manager permissions (login via PocketBase)
        console.log('\n👤 Testing manager permissions...');
        const managerLogin = await axios.post(`${PB_URL}/api/collections/users/auth-with-password`, {
            identity: `perm_manager_${timestamp}@example.com`,
            password: 'Test123!@#'
        });
        const managerToken = managerLogin.data.token;
        console.log('Manager token:', managerToken);

        // Manager should see all tanks (via Node app)
        const managerTanks = await axios.get(
            `${LOCAL_APP_URL}/departments/${department.id}/tanks`,
            { headers: { 'Authorization': `Bearer ${managerToken}` } }
        );
        console.log(`✅ Manager can see all tanks (${managerTanks.data.length} tanks)`);

        // Manager should be able to update any tank (via Node app)
        await axios.patch(
            `${LOCAL_APP_URL}/tanks/${state.tanks[0]}/status`,
            { status: 'maintenance' },
            { headers: { 'Authorization': `Bearer ${managerToken}` } }
        );
        console.log('✅ Manager can update tank status');

        // Test operator 1 permissions (login via PocketBase)
        console.log('\n👤 Testing operator 1 permissions...');
        const operator1Login = await axios.post(`${PB_URL}/api/collections/users/auth-with-password`, {
            identity: `perm_operator1_${timestamp}@example.com`,
            password: 'Test123!@#'
        });
        const operator1Token = operator1Login.data.token;

        // Should be able to update tank 1 (via Node app)
        try {
            await axios.patch(
                `${LOCAL_APP_URL}/tanks/${state.tanks[0]}/status`,
                { status: 'active' },
                { headers: { 'Authorization': `Bearer ${operator1Token}` } }
            );
            console.log('✅ Operator 1 can update tank 1');
        } catch (error) {
            console.error('❌ Operator 1 cannot update tank 1');
        }

        // Should NOT be able to update tank 2 (read-only) (via Node app)
        try {
            await axios.patch(
                `${LOCAL_APP_URL}/tanks/${state.tanks[1]}/status`,
                { status: 'maintenance' },
                { headers: { 'Authorization': `Bearer ${operator1Token}` } }
            );
            console.error('❌ Operator 1 can update tank 2 (should be denied)');
        } catch (error) {
            console.log('✅ Operator 1 cannot update tank 2 (correct)');
        }

        // Test operator 2 permissions (login via PocketBase)
        console.log('\n👤 Testing operator 2 permissions...');
        const operator2Login = await axios.post(`${PB_URL}/api/collections/users/auth-with-password`, {
            identity: `perm_operator2_${timestamp}@example.com`,
            password: 'Test123!@#'
        });
        const operator2Token = operator2Login.data.token;

        // Should be able to update tanks 2 and 3 (via Node app)
        try {
            await axios.patch(
                `${LOCAL_APP_URL}/tanks/${state.tanks[1]}/status`,
                { status: 'active' },
                { headers: { 'Authorization': `Bearer ${operator2Token}` } }
            );
            console.log('✅ Operator 2 can update tank 2');

            await axios.patch(
                `${LOCAL_APP_URL}/tanks/${state.tanks[2]}/status`,
                { status: 'maintenance' },
                { headers: { 'Authorization': `Bearer ${operator2Token}` } }
            );
            console.log('✅ Operator 2 can update tank 3');
        } catch (error) {
            console.error('❌ Operator 2 cannot update assigned tanks');
        }

        // Should NOT be able to update tank 1 (via Node app)
        try {
            await axios.patch(
                `${LOCAL_APP_URL}/tanks/${state.tanks[0]}/status`,
                { status: 'maintenance' },
                { headers: { 'Authorization': `Bearer ${operator2Token}` } }
            );
            console.error('❌ Operator 2 can update tank 1 (should be denied)');
        } catch (error) {
            console.log('✅ Operator 2 cannot update tank 1 (correct)');
        }

        console.log('\n✨ All permission tests completed');

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
        // Delete access records (via Node app)
        for (const id of state.accessRecords) {
            try {
                await axios.delete(
                    `${LOCAL_APP_URL}/departments/access/${id}`,
                    { headers: { 'Authorization': `Bearer ${authToken}` } }
                );
            } catch (error) {
                console.log(`Could not delete access record ${id}:`, error.response?.data?.message || error.message);
            }
        }

        // Delete tanks (via Node app)
        for (const id of state.tanks) {
            try {
                await axios.delete(
                    `${LOCAL_APP_URL}/tanks/${id}`,
                    { headers: { 'Authorization': `Bearer ${authToken}` } }
                );
            } catch (error) {
                console.log(`Could not delete tank ${id}:`, error.response?.data?.message || error.message);
            }
        }

        // Delete users (via PocketBase)
        for (const id of state.users) {
            try {
                await axios.delete(
                    `${PB_URL}/api/collections/users/records/${id}`,
                    { headers: { 'Authorization': `Bearer ${authToken}` } }
                );
            } catch (error) {
                console.log(`Could not delete user ${id}:`, error.response?.data?.message || error.message);
            }
        }

        // Delete departments (via Node app)
        for (const id of state.departments) {
            try {
                await axios.delete(
                    `${LOCAL_APP_URL}/departments/${id}`,
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

testDepartmentPermission(); 