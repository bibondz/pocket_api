const axios = require('axios');
const { PB_URL } = require('../config');

async function clearTankAssignments() {
    try {
        // 1. Login to get token
        console.log('\n🔑 Getting admin token...');
        const loginResponse = await axios.post(`${PB_URL}/api/collections/users/auth-with-password`, {
            identity: 'admin@tank-api.test',
            password: 'AdminTest@2024'
        });
        const authToken = loginResponse.data.token;
        console.log('✅ Got admin token');

        // 2. Get all tanks
        console.log('\n🛢️ Getting tanks...');
        const tanksResponse = await axios.get(
            `${PB_URL}/api/collections/tanks/records`,
            {
                headers: { 'Authorization': `Bearer ${authToken}` }
            }
        );
        const tanks = tanksResponse.data.items;
        console.log(`Found ${tanks.length} tanks`);

        // 3. Clear department assignments
        console.log('\n🧹 Clearing tank assignments...');
        for (const tank of tanks) {
            await axios.patch(
                `${PB_URL}/api/collections/tanks/records/${tank.id}`,
                { department: null },
                {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                }
            );
            console.log(`Cleared department for tank ${tank.tank_id}`);
        }

        // 4. Get all departments
        console.log('\n🏢 Getting departments...');
        const departmentsResponse = await axios.get(
            `${PB_URL}/api/collections/departments/records`,
            {
                headers: { 'Authorization': `Bearer ${authToken}` }
            }
        );
        const departments = departmentsResponse.data.items;
        console.log(`Found ${departments.length} departments`);

        // 5. Clear tanks arrays in departments
        console.log('\n🧹 Clearing department tanks arrays...');
        for (const department of departments) {
            await axios.patch(
                `${PB_URL}/api/collections/departments/records/${department.id}`,
                { tanks: [] },
                {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                }
            );
            console.log(`Cleared tanks array for department ${department.name}`);
        }

        console.log('\n✨ All tank assignments cleared successfully');

    } catch (error) {
        console.error('\n❌ Clear failed:', error.response?.data || error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

clearTankAssignments(); 