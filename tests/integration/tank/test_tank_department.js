const axios = require('axios');
const cleanupTestData = require('./tests/cleanup');
const { PB_URL } = require('./config');
const API_URL = 'http://localhost:5053';

async function testTankDepartmentManagement() {
    let state = {
        tanks: [],
        departments: []
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

        // 2. Create test tanks
        console.log('\n🛢️ Creating test tanks...');
        const timestamp = Date.now();
        const tank1 = await axios.post(
            `${PB_URL}/api/collections/tanks/records`,
            {
                name: `TEST_Tank_1_${timestamp}`,
                tank_id: `TST-${timestamp}-1`,
                capacity: 10000,
                status: 'active',
                description: 'Test tank 1',
                last_signal_time: new Date().toISOString(),
                department: ''
            },
            {
                headers: { 
                    'Authorization': `Bearer ${authToken}`
                }
            }
        );
        state.tanks.push(tank1.data.id);
        
        const tank2 = await axios.post(
            `${PB_URL}/api/collections/tanks/records`,
            {
                name: `TEST_Tank_2_${timestamp}`,
                tank_id: `TST-${timestamp}-2`,
                capacity: 20000,
                status: 'active',
                description: 'Test tank 2',
                last_signal_time: new Date().toISOString(),
                department: ''
            },
            {
                headers: { 
                    'Authorization': `Bearer ${authToken}`
                }
            }
        );
        state.tanks.push(tank2.data.id);
        console.log('✅ Created test tanks');

        // 3. Get list of tanks
        console.log('\n📋 Getting list of tanks...');
        const tanksResponse = await axios.get(
            `${PB_URL}/api/collections/tanks/records?sort=-created&filter=(status="active")`,
            {
                headers: { 
                    'Authorization': `Bearer ${authToken}`
                }
            }
        );
        console.log('✅ Retrieved tanks list');

        // 4. Create test department
        console.log('\n🏢 Creating test department...');
        const createDepartmentResponse = await axios.post(
            `${PB_URL}/api/collections/departments/records`,
            {
                name: `TEST_Department_${timestamp}`,
                description: 'Department for testing',
                location: 'Test Location',
                tanks: []
            },
            {
                headers: { 
                    'Authorization': `Bearer ${authToken}`
                }
            }
        );
        const testDepartmentId = createDepartmentResponse.data.id;
        state.departments.push(testDepartmentId);
        console.log('✅ Created test department');

        // 5. Get list of departments
        console.log('\n🏢 Getting list of departments...');
        const departmentsResponse = await axios.get(
            `${PB_URL}/api/collections/departments/records?sort=name&expand=tanks`,
            {
                headers: { 
                    'Authorization': `Bearer ${authToken}`
                }
            }
        );
        console.log('✅ Retrieved departments list');

        // 6. Check department details before changes
        console.log('\n🏢 Checking department details before changes...');
        const departmentBeforeResponse = await axios.get(
            `${API_URL}/departments/${testDepartmentId}/tanks`,
            {
                headers: { 
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        console.log('✅ Department should have no tanks:', departmentBeforeResponse.data);

        // 7. Assign tanks to department
        console.log('\n📦 Assigning tanks to department...');
        const assignResponse = await axios.post(
            `${API_URL}/departments/${testDepartmentId}/tanks`,
            {
                tankIds: [tank1.data.id, tank2.data.id]
            },
            {
                headers: { 
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        console.log('✅ Tanks assigned successfully');

        // 8. Check department details after changes
        console.log('\n🏢 Checking department details after changes...');
        const departmentAfterResponse = await axios.get(
            `${API_URL}/departments/${testDepartmentId}/tanks`,
            {
                headers: { 
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        console.log('✅ Department should have 2 tanks:', departmentAfterResponse.data);

        console.log('\n✨ All tests completed successfully');

    } catch (error) {
        console.error('\n❌ Test failed:', error.response?.data || error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
            console.error('URL:', error.response.config?.url);
        }
    } finally {
        // Clean up test data
        if (authToken) {
            await cleanupTestData(authToken, state);
        }
    }
}

testTankDepartmentManagement(); 