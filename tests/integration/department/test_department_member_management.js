const axios = require('axios');
const { PB_URL } = require('../config');
const cleanupTestData = require('./cleanup');

async function testDepartmentMemberManagement() {
    let state = {
        departments: [],
        users: [],
        accessRecords: []
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
        const departments = [];
        for (let i = 1; i <= 2; i++) {
            const deptResponse = await axios.post(
                `${PB_URL}/api/collections/departments/records`,
                { 
                    name: `Test Department ${i} ${timestamp}`,
                    description: `Test department ${i}`,
                    location: `Location ${i}`
                },
                { headers: { 'Authorization': `Bearer ${authToken}` } }
            );
            departments.push(deptResponse.data);
            state.departments.push(deptResponse.data.id);
        }
        console.log('✅ Created test departments');

        // 3. Create test users
        console.log('\n👥 Creating test users...');
        const users = [];
        const roles = ['manager', 'operator', 'operator'];
        for (let i = 1; i <= 3; i++) {
            const userResponse = await axios.post(
                `${PB_URL}/api/collections/users/records`,
                {
                    email: `test${i}_${timestamp}@example.com`,
                    password: 'Test123!@#',
                    passwordConfirm: 'Test123!@#',
                    name: `Test User ${i}`,
                    username: `testuser${i}_${timestamp}`,
                    role: roles[i-1]
                },
                { headers: { 'Authorization': `Bearer ${authToken}` } }
            );
            users.push(userResponse.data);
            state.users.push(userResponse.data.id);
        }
        console.log('✅ Created test users');

        // 4. Test: Add users to department 1
        console.log('\n🔄 Testing: Adding users to department 1...');
        for (const user of users) {
            const accessResponse = await axios.post(
                `${PB_URL}/api/collections/department_user_access/records`,
                {
                    department: departments[0].id,
                    user: user.id,
                    role: user.role,
                    tank_permissions: {}
                },
                { headers: { 'Authorization': `Bearer ${authToken}` } }
            );
            state.accessRecords.push(accessResponse.data.id);
        }
        console.log('✅ Added users to department 1');

        // 5. Test: Transfer operator to department 2
        console.log('\n🔄 Testing: Transferring operator to department 2...');
        const operatorToTransfer = users.find(u => u.role === 'operator');
        
        // Remove from department 1
        const oldAccessRecord = await axios.get(
            `${PB_URL}/api/collections/department_user_access/records?filter=(user="${operatorToTransfer.id}")`,
            { headers: { 'Authorization': `Bearer ${authToken}` } }
        );
        
        await axios.delete(
            `${PB_URL}/api/collections/department_user_access/records/${oldAccessRecord.data.items[0].id}`,
            { headers: { 'Authorization': `Bearer ${authToken}` } }
        );

        // Add to department 2
        const newAccessResponse = await axios.post(
            `${PB_URL}/api/collections/department_user_access/records`,
            {
                department: departments[1].id,
                user: operatorToTransfer.id,
                role: operatorToTransfer.role,
                tank_permissions: {}
            },
            { headers: { 'Authorization': `Bearer ${authToken}` } }
        );
        state.accessRecords.push(newAccessResponse.data.id);
        console.log('✅ Transferred operator to department 2');

        // 6. Test: Change user role
        console.log('\n🔄 Testing: Changing user role...');
        const operatorToPromote = users.find(u => u.role === 'operator' && u.id !== operatorToTransfer.id);
        
        // Update user role
        await axios.patch(
            `${PB_URL}/api/collections/users/records/${operatorToPromote.id}`,
            { role: 'manager' },
            { headers: { 'Authorization': `Bearer ${authToken}` } }
        );

        // Update department access position
        const accessToUpdate = await axios.get(
            `${PB_URL}/api/collections/department_user_access/records?filter=(user="${operatorToPromote.id}")`,
            { headers: { 'Authorization': `Bearer ${authToken}` } }
        );

        await axios.patch(
            `${PB_URL}/api/collections/department_user_access/records/${accessToUpdate.data.items[0].id}`,
            { position: 'manager' },
            { headers: { 'Authorization': `Bearer ${authToken}` } }
        );
        console.log('✅ Changed user position');

        // 7. Test: Remove user from department
        console.log('\n🔄 Testing: Removing user from department...');
        const accessToDelete = await axios.get(
            `${PB_URL}/api/collections/department_user_access/records?filter=(user="${operatorToTransfer.id}")`,
            { headers: { 'Authorization': `Bearer ${authToken}` } }
        );

        await axios.delete(
            `${PB_URL}/api/collections/department_user_access/records/${accessToDelete.data.items[0].id}`,
            { headers: { 'Authorization': `Bearer ${authToken}` } }
        );
        console.log('✅ Removed user from department');

        // 8. Verify final state
        console.log('\n🔍 Verifying final state...');
        const finalState = await axios.get(
            `${PB_URL}/api/collections/department_user_access/records?expand=user,department`,
            { headers: { 'Authorization': `Bearer ${authToken}` } }
        );
        console.log('Final department access records:', 
            finalState.data.items.map(item => ({
                department: item.expand.department.name,
                user: item.expand.user.name,
                role: item.role
            }))
        );

        console.log('\n✨ All tests completed successfully');

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

testDepartmentMemberManagement(); 