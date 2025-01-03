const axios = require('axios');

const PB_URL = 'http://localhost:5050';
const API_URL = 'http://localhost:5053';
let authToken = '';

async function createSampleDepartment() {
    const timestamp = new Date().getTime();
    const department = await axios.post(`${PB_URL}/api/collections/departments/records`, {
        name: `Test Department ${timestamp}`
    }, {
        headers: { 'Authorization': authToken }
    });
    return department.data;
}

async function createSampleTank(departmentId) {
    const timestamp = new Date().getTime();
    const tank = await axios.post(`${PB_URL}/api/collections/tanks/records`, {
        name: `Test Tank ${timestamp}`,
        tank_id: `TANK${timestamp}`,
        capacity: 1000,
        status: "active",
        department: departmentId
    }, {
        headers: { 'Authorization': authToken }
    });
    return tank.data;
}

async function testEndpoints() {
    try {
        // 1. Test Health Check
        console.log('\n🏥 Testing Health Check...');
        const health = await axios.get(`${API_URL}/healthex`);
        console.log('✅ Health Check OK:', health.status === 200);

        // 2. Test Login
        console.log('\n🔑 Testing Login...');
        const loginResponse = await axios.post(`${PB_URL}/api/collections/users/auth-with-password`, {
            identity: 'admin@example.com',
            password: 'TestUser@2024'
        });
        console.log('Login Response:', loginResponse.data);
        authToken = loginResponse.data.token;
        console.log('Auth Token:', authToken);
        console.log('✅ Login OK:', !!authToken);

        // 3. Test User Profile
        console.log('\n👤 Testing Get Profile...');
        const profile = await axios.get(`${PB_URL}/api/collections/users/records/${loginResponse.data.record.id}`, {
            headers: { 'Authorization': authToken }
        });
        console.log('✅ Profile OK:', !!profile.data.id);

        // Create sample data
        console.log('\n📝 Creating sample data...');
        const sampleDepartment = await createSampleDepartment();
        console.log('Created department:', sampleDepartment.id);
        const sampleTank = await createSampleTank(sampleDepartment.id);
        console.log('Created tank:', sampleTank.id);

        // 4. Test List Departments
        console.log('\n🏢 Testing List Departments...');
        const departments = await axios.get(`${API_URL}/departments`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        console.log('Departments:', departments.data);
        console.log('✅ Departments OK:', Array.isArray(departments.data));

        // 5. Test List Tanks
        console.log('\n🛢️ Testing List Tanks...');
        const tanks = await axios.get(`${API_URL}/tanks`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        console.log('Tanks:', tanks.data);
        console.log('✅ Tanks OK:', Array.isArray(tanks.data));

        // 6. Test System Status
        console.log('\n📊 Testing System Status...');
        const status = await axios.get(`${API_URL}/statusex`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        console.log('✅ System Status OK:', status.data.status === 'operational');

        console.log('\n✨ All tests completed successfully!');
    } catch (error) {
        console.error('\n❌ Test failed:', error.response?.data || error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Headers:', error.response.headers);
            if (error.response.data) {
                console.error('Response Data:', error.response.data);
            }
        }
    }
}

testEndpoints(); 