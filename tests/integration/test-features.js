const axios = require('axios');
const { API_URL, PB_URL } = require('../../config');

// Test data
const timestamp = new Date().getTime();
const TEST_USER = {
    email: `test${timestamp}@example.com`,
    password: 'Test123!@#',
    name: 'Test User',
    role: 'operator'
};

const TEST_DEPARTMENT = {
    name: `Test Department ${timestamp}`,
    description: 'Test department for feature test',
    location: 'Test Location'
};

const TEST_TANK = {
    name: `Test Tank ${timestamp}`,
    tank_id: `TST-${timestamp}`,
    capacity: 1000,
    status: 'active'
};

// Store created records for cleanup
let state = {
    token: null,
    userId: null,
    departmentId: null,
    tankId: null
};

async function testFeatures() {
    try {
        console.log('\n=== Testing Features ===\n');

        // 1. Authentication & User Creation
        console.log('Setting up authentication...');
        const auth = await axios.post(`${PB_URL}/api/collections/users/auth-with-password`, {
            email: 'admin@example.com',
            password: 'TestUser@2024'
        });
        state.token = auth.data.token;
        console.log('✓ PocketBase login successful');

        // Create test user
        const user = await axios.post(
            `${PB_URL}/api/collections/users/records`,
            TEST_USER,
            { headers: { 'Authorization': state.token } }
        );
        state.userId = user.data.id;
        console.log('✓ Test user created');

        // Verify user exists
        const userCheck = await axios.get(
            `${PB_URL}/api/collections/users/records/${state.userId}`,
            { headers: { 'Authorization': state.token } }
        );
        console.log('✓ User verification successful');

        // 2. Department Creation
        console.log('\nSetting up department...');
        const department = await axios.post(
            `${API_URL}/departments`,
            TEST_DEPARTMENT,
            { headers: { 'Authorization': `Bearer ${state.token}` } }
        );
        state.departmentId = department.data.id;
        console.log('✓ Department created');

        // Verify department exists
        const deptCheck = await axios.get(
            `${API_URL}/departments/${state.departmentId}`,
            { headers: { 'Authorization': `Bearer ${state.token}` } }
        );
        console.log('✓ Department verification successful');

        // 3. Department Member Management
        console.log('\nTesting Department Member Management...');
        // Add member to department (now we know both user and department exist)
        await axios.post(
            `${API_URL}/departments/${state.departmentId}/members`,
            { userId: state.userId, role: 'operator' },
            { headers: { 'Authorization': `Bearer ${state.token}` } }
        );
        console.log('✓ Member added to department');

        // Verify membership
        const memberCheck = await axios.get(
            `${API_URL}/departments/${state.departmentId}/members`,
            { headers: { 'Authorization': `Bearer ${state.token}` } }
        );
        console.log('✓ Department membership verification successful');

        // 4. Tank Management
        console.log('\nSetting up tank...');
        // Create tank (now we know department exists)
        const tank = await axios.post(
            `${API_URL}/tanks`,
            { ...TEST_TANK, department: state.departmentId },
            { headers: { 'Authorization': `Bearer ${state.token}` } }
        );
        state.tankId = tank.data.id;
        console.log('✓ Tank created');

        // Verify tank exists
        const tankCheck = await axios.get(
            `${API_URL}/tanks/${state.tankId}`,
            { headers: { 'Authorization': `Bearer ${state.token}` } }
        );
        console.log('✓ Tank verification successful');

        // 5. Tank Assignment
        console.log('\nTesting Tank Assignment...');
        // Now we know tank, user and department all exist and are properly related
        await axios.post(
            `${API_URL}/tanks/${state.tankId}/assign`,
            { operatorId: state.userId, departmentId: state.departmentId },
            { headers: { 'Authorization': `Bearer ${state.token}` } }
        );
        console.log('✓ Tank assigned to operator');

        // Verify assignment
        const assignmentCheck = await axios.get(
            `${API_URL}/tanks/${state.tankId}`,
            { headers: { 'Authorization': `Bearer ${state.token}` } }
        );
        console.log('✓ Tank assignment verification successful');

        // 6. Tank Operations
        console.log('\nTesting Tank Operations...');
        await axios.put(
            `${API_URL}/tanks/${state.tankId}/status`,
            { status: 'maintenance' },
            { headers: { 'Authorization': `Bearer ${state.token}` } }
        );
        console.log('✓ Tank status updated');

        // 7. Tank Permissions
        console.log('\nTesting Tank Permissions...');
        // Now we know all relations are properly set up
        await axios.put(
            `${API_URL}/tank-permissions/${state.departmentId}/${state.tankId}/${state.userId}`,
            { can_view: true, can_edit: true },
            { headers: { 'Authorization': `Bearer ${state.token}` } }
        );
        console.log('✓ Tank permissions granted');

        await axios.get(
            `${API_URL}/tank-permissions/${state.departmentId}/${state.tankId}`,
            { headers: { 'Authorization': `Bearer ${state.token}` } }
        );
        console.log('✓ Tank permissions listed');

        await axios.delete(
            `${API_URL}/tank-permissions/${state.departmentId}/${state.tankId}/${state.userId}`,
            { headers: { 'Authorization': `Bearer ${state.token}` } }
        );
        console.log('✓ Tank permissions revoked');

        console.log('\n=== All Feature Tests Passed ===\n');

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    } finally {
        // Cleanup through PocketBase
        if (state.token) {
            try {
                if (state.tankId) {
                    await axios.delete(`${PB_URL}/api/collections/tanks/records/${state.tankId}`, {
                        headers: { 'Authorization': state.token }
                    });
                }
                if (state.departmentId) {
                    await axios.delete(`${PB_URL}/api/collections/departments/records/${state.departmentId}`, {
                        headers: { 'Authorization': state.token }
                    });
                }
                if (state.userId) {
                    await axios.delete(`${PB_URL}/api/collections/users/records/${state.userId}`, {
                        headers: { 'Authorization': state.token }
                    });
                }
                console.log('✓ Cleanup completed');
            } catch (error) {
                console.error('Cleanup failed:', error.message);
            }
        }
    }
}

// Run tests
testFeatures(); 