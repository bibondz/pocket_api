const axios = require('axios');
const { PB_URL } = require('../config');

async function assignTanks() {
    try {
        // 1. Login to get token
        console.log('\n🔑 Getting admin token...');
        const loginResponse = await axios.post(`${PB_URL}/api/collections/users/auth-with-password`, {
            identity: 'admin@example.com',
            password: 'TestUser@2024'
        });
        const authToken = loginResponse.data.token;
        console.log('✅ Got admin token');

        // 2. Get departments
        console.log('\n🏢 Getting departments...');
        const departmentsResponse = await axios.get(
            `${PB_URL}/api/collections/departments/records`,
            {
                headers: { 'Authorization': `Bearer ${authToken}` }
            }
        );
        const departments = departmentsResponse.data.items;
        console.log(`Found ${departments.length} departments`);

        // 3. Get tanks
        console.log('\n🛢️ Getting tanks...');
        const tanksResponse = await axios.get(
            `${PB_URL}/api/collections/tanks/records`,
            {
                headers: { 'Authorization': `Bearer ${authToken}` }
            }
        );
        const tanks = tanksResponse.data.items;
        console.log(`Found ${tanks.length} tanks`);

        // 4. Assign tanks to departments
        console.log('\n📋 Assigning tanks to departments...');
        
        for (const tank of tanks) {
            let departmentId = null;
            
            // Match tank to department based on tank_id prefix
            if (tank.tank_id.startsWith('CHE-')) {
                departmentId = departments.find(d => d.name.includes('Chemical'))?.id;
            } else if (tank.tank_id.startsWith('BIO-')) {
                departmentId = departments.find(d => d.name.includes('Bio'))?.id;
            } else if (tank.tank_id.startsWith('ENV-')) {
                departmentId = departments.find(d => d.name.includes('Environmental'))?.id;
            }

            if (departmentId) {
                await axios.patch(
                    `${PB_URL}/api/collections/tanks/records/${tank.id}`,
                    { department: departmentId },
                    {
                        headers: { 'Authorization': `Bearer ${authToken}` }
                    }
                );
                console.log(`Assigned tank ${tank.tank_id} to department ${departmentId}`);
            }
        }

        console.log('\n✨ All tanks assigned successfully');

    } catch (error) {
        console.error('\n❌ Assignment failed:', error.response?.data || error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

assignTanks(); 