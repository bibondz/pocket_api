const axios = require('axios');

const PB_URL = 'http://localhost:5050';
const API_URL = 'http://localhost:5053';
let authToken = '';

// Format department data
const formatDepartment = (dept) => ({
    name: dept.name,
    tanks: dept.expand?.tanks?.map(tank => ({
        name: tank.name,
        tank_id: tank.tank_id,
        capacity: tank.capacity,
        status: tank.status.replace(/"/g, ''),
        managed_by: tank.managed_by
    })) || []
});

// Format tank data
const formatTank = (tank) => ({
    name: tank.name,
    tank_id: tank.tank_id,
    capacity: tank.capacity,
    status: tank.status.replace(/"/g, ''),
    department: tank.expand?.department?.name || 'Not Assigned'
});

async function testListDetails() {
    try {
        // 1. Login first to get token
        console.log('\n🔑 Getting token...');
        const loginResponse = await axios.post(`${PB_URL}/api/collections/users/auth-with-password`, {
            identity: 'admin@example.com',
            password: 'TestUser@2024'
        });
        authToken = loginResponse.data.token;
        console.log('✅ Got token');

        // 2. List Departments with details
        console.log('\n🏢 Department List Details:');
        const departments = await axios.get(`${API_URL}/departments?expand=tanks,members`, {
            headers: { 'Authorization': authToken }
        });
        console.log(JSON.stringify(departments.data.map(formatDepartment), null, 2));

        // 3. List Tanks with details
        console.log('\n🛢️ Tank List Details:');
        const tanks = await axios.get(`${API_URL}/tanks?expand=department,managed_by`, {
            headers: { 'Authorization': authToken }
        });
        console.log(JSON.stringify(tanks.data.map(formatTank), null, 2));

    } catch (error) {
        console.error('\n❌ Test failed:', error.response?.data || error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

testListDetails();
