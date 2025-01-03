const axios = require('axios');
const PocketBase = require('pocketbase/cjs');
const { PB_URL, LOCAL_APP_URL } = require('../../../config');

// Add delay helper function
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function testTankAssignment() {
    let state = {
        departments: [],
        users: [],
        tanks: [],
        accessRecords: []
    };
    let authToken = null;

    try {
        // 1. Login as admin using PocketBase
        console.log('\n🔑 Getting admin token...');
        const pb = new PocketBase(PB_URL);
        const authData = await pb.collection('users').authWithPassword('admin@example.com', 'TestUser@2024');
        authToken = pb.authStore.token;
        console.log('✅ Got admin token');
        await delay(1000); // Add 1s delay

        // 2. Create department using Node.js app
        console.log('\n🏢 Creating test department...');
        const timestamp = new Date().getTime();
        const deptResponse = await axios.post(
            `${LOCAL_APP_URL}/departments`,
            { 
                name: `Test Department ${timestamp}`,
                description: 'Test department for tank assignment',
                location: 'Test Location'
            },
            { headers: { 'Authorization': `Bearer ${authToken}` } }
        );
        const department = deptResponse.data;
        state.departments.push(department.id);
        console.log('✅ Created test department');
        await delay(1000); // Add 1s delay

        // 3. Create test users using PocketBase (user management)
        console.log('\n👥 Creating test users...');
        const users = [];
        const roles = ['manager', 'operator', 'operator'];
        for (let i = 0; i < roles.length; i++) {
            const userData = {
                email: `test${i+1}_${timestamp}@example.com`,
                username: `test${i+1}_${timestamp}`,
                password: 'Test123!@#',
                passwordConfirm: 'Test123!@#',
                name: `Test User ${i+1}`,
                role: roles[i],
                emailVisibility: true
            };
            const userResponse = await axios.post(
                `${PB_URL}/api/collections/users/records`,
                userData,
                { headers: { 'Authorization': `Bearer ${authToken}` } }
            );
            users.push({...userResponse.data, role: roles[i]});
            state.users.push(userResponse.data.id);

            // Add user to department using Node.js app
            const accessResponse = await axios.post(
                `${LOCAL_APP_URL}/departments/${department.id}/members`,
                {
                    userIds: [userResponse.data.id],
                    role: roles[i]
                },
                { headers: { 'Authorization': `Bearer ${authToken}` } }
            );
            state.accessRecords.push(accessResponse.data.id);
        }
        console.log('✅ Created test users and assigned to department');
        await delay(1000); // Add 1s delay

        // 4. Create test tanks using Node.js app
        console.log('\n🛢️ Creating test tanks...');
        const tanks = [];
        for (let i = 1; i <= 3; i++) {
            const tankResponse = await axios.post(
                `${LOCAL_APP_URL}/tanks`,
                {
                    name: `Test Tank ${i}`,
                    tank_id: `TST-${timestamp}-${i}`,
                    capacity: 1000 * i,
                    status: 'active',
                    last_signal: new Date().toISOString(),
                    description: `Test tank ${i} for tank assignment test`
                },
                { headers: { 'Authorization': `Bearer ${authToken}` } }
            );
            tanks.push(tankResponse.data);
            state.tanks.push(tankResponse.data.id);
        }
        console.log('✅ Created test tanks');
        await delay(1000); // Add 1s delay

        // 4.5 Assign tanks to department using Node.js app
        console.log('\n🏢 Assigning tanks to department...');
        for (const tank of tanks) {
            await axios.post(
                `${LOCAL_APP_URL}/departments/${department.id}/tanks`,
                { tankId: tank.id },
                { headers: { 'Authorization': `Bearer ${authToken}` } }
            );
            await delay(1000); // Add delay between assignments
        }
        console.log('✅ Assigned tanks to department');
        await delay(1000); // Add 1s delay

        // 5. Test: Manager assigns tanks to operators
        console.log('\n🔄 Testing: Manager assigning tanks to operators...');
        const manager = users.find(u => u.role === 'manager');
        const operators = users.filter(u => u.role === 'operator');
        
        console.log('Manager:', { email: manager.email, id: manager.id });
        console.log('Operators:', operators.map(o => ({ email: o.email, id: o.id })));

        // Login as manager using PocketBase
        console.log('\n👤 Logging in as manager...');
        const managerPb = new PocketBase(PB_URL);
        const managerAuth = await managerPb.collection('users').authWithPassword(manager.email, 'Test123!@#');
        const managerToken = managerPb.authStore.token;
        console.log('✅ Logged in as manager');

        // Get tanks in department using Node.js app
        console.log('\n🛢️ Getting tanks in department...');
        const departmentTanks = await axios.get(
            `${LOCAL_APP_URL}/departments/${department.id}/tanks`,
            { headers: { 'Authorization': `Bearer ${managerToken}` } }
        );
        console.log(`Found ${departmentTanks.data.length} tanks in department`);

        // Assign tanks to operators using Node.js app
        for (let i = 0; i < operators.length; i++) {
            const operator = operators[i];
            const tank = tanks[i];
            
            console.log(`\n📝 Assigning tank ${tank.tank_id} to operator ${operator.email}...`);
            
            // Create tank assignment using Node.js app
            await axios.post(
                `${LOCAL_APP_URL}/tanks/${tank.id}/assign`,
                {
                    operatorId: operator.id,
                    departmentId: department.id
                },
                { headers: { 'Authorization': `Bearer ${managerToken}` } }
            );
            
            console.log('✅ Tank assigned successfully');
        }
        console.log('\n✅ All tanks assigned to operators');

        // 6. Test: Verify operator permissions
        console.log('\n🔍 Testing: Verifying operator permissions...');
        for (const operator of operators) {
            console.log(`\n👤 Testing operator ${operator.email}...`);

            // Login as operator using PocketBase
            const operatorPb = new PocketBase(PB_URL);
            const operatorAuth = await operatorPb.collection('users').authWithPassword(operator.email, 'Test123!@#');
            const operatorToken = operatorPb.authStore.token;
            console.log('✅ Logged in as operator');

            // Get operator's assigned tanks using Node.js app
            const assignedTanks = await axios.get(
                `${LOCAL_APP_URL}/tanks/mine`,
                { headers: { 'Authorization': `Bearer ${operatorToken}` } }
            );
            console.log(`Found ${assignedTanks.data.length} assigned tanks`);

            // Try to update assigned tank (should succeed)
            const assignedTank = tanks.find(t => assignedTanks.data.some(at => at.id === t.id));
            try {
                await axios.patch(
                    `${LOCAL_APP_URL}/tanks/${assignedTank.id}/status`,
                    { status: 'maintenance' },
                    { headers: { 'Authorization': `Bearer ${operatorToken}` } }
                );
                console.log(`✅ Operator can update assigned tank ${assignedTank.tank_id}`);
            } catch (error) {
                console.error(`❌ Operator cannot update assigned tank ${assignedTank.tank_id}`);
            }

            // Try to update unassigned tank (should fail)
            const unassignedTank = tanks.find(t => !assignedTanks.data.some(at => at.id === t.id));
            try {
                await axios.patch(
                    `${LOCAL_APP_URL}/tanks/${unassignedTank.id}/status`,
                    { status: 'maintenance' },
                    { headers: { 'Authorization': `Bearer ${operatorToken}` } }
                );
                console.error(`❌ Operator can update unassigned tank ${unassignedTank.tank_id}`);
            } catch (error) {
                console.log(`✅ Operator cannot update unassigned tank ${unassignedTank.tank_id}`);
            }
        }

        console.log('\n✨ All tests completed successfully');

    } catch (error) {
        console.error('\n❌ Test failed:', error.response?.data || error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    } finally {
        // Cleanup using Node.js app
        if (authToken) {
            await cleanupTestData(authToken, state);
        }
    }
}

async function cleanupTestData(authToken, state) {
    console.log('\n🧹 Cleaning up test data...');
    try {
        // Delete tank assignments first using Node.js app
        console.log('Deleting tank assignments...');
        for (const id of state.tanks) {
            try {
                await axios.delete(
                    `${LOCAL_APP_URL}/tanks/${id}/assignments`,
                    { headers: { 'Authorization': `Bearer ${authToken}` } }
                );
            } catch (error) {
                console.log(`Could not delete tank assignments for tank ${id}:`, error.response?.data?.message || error.message);
            }
        }

        // Delete tanks using Node.js app
        console.log('Deleting tanks...');
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

        // Delete users using PocketBase
        console.log('Deleting users...');
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

        // Delete departments using Node.js app
        console.log('Deleting departments...');
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

testTankAssignment(); 