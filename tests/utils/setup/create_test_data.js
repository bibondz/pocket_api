const axios = require('axios');

const PB_URL = 'http://localhost:5050';
let authToken = '';

async function createTestData() {
    try {
        // 1. Login as admin
        console.log('\n🔑 Getting admin token...');
        const loginResponse = await axios.post(`${PB_URL}/api/collections/users/auth-with-password`, {
            identity: 'admin@example.com',
            password: 'TestUser@2024'
        });
        authToken = loginResponse.data.token;
        console.log('✅ Got admin token');

        // 2. Create departments
        console.log('\n🏢 Creating test departments...');
        const departments = [
            {
                id: 'DEPT-001',
                name: 'Test Department 1',
                description: 'Test Department 1 Description',
                location: 'Test Location 1'
            },
            {
                id: 'DEPT-002',
                name: 'Test Department 2',
                description: 'Test Department 2 Description',
                location: 'Test Location 2'
            }
        ];

        for (const dept of departments) {
            try {
                await axios.post(
                    `${PB_URL}/api/collections/departments/records`,
                    dept,
                    {
                        headers: { 'Authorization': authToken }
                    }
                );
                console.log(`✅ Created department: ${dept.name}`);
            } catch (error) {
                if (error.response?.data?.code === 400) {
                    console.log(`Department ${dept.name} already exists`);
                } else {
                    throw error;
                }
            }
        }

        // 3. Create tanks
        console.log('\n🛢️ Creating test tanks...');
        const tanks = [
            {
                id: 'TANK-001',
                name: 'Test Tank 1',
                tank_id: 'T-001',
                capacity: 100000,
                status: 'active'
            },
            {
                id: 'TANK-002',
                name: 'Test Tank 2',
                tank_id: 'T-002',
                capacity: 200000,
                status: 'active'
            }
        ];

        for (const tank of tanks) {
            try {
                await axios.post(
                    `${PB_URL}/api/collections/tanks/records`,
                    tank,
                    {
                        headers: { 'Authorization': authToken }
                    }
                );
                console.log(`✅ Created tank: ${tank.name}`);
            } catch (error) {
                if (error.response?.data?.code === 400) {
                    console.log(`Tank ${tank.name} already exists`);
                } else {
                    throw error;
                }
            }
        }

        console.log('\n✅ Test data creation completed');

    } catch (error) {
        console.error('\n❌ Failed to create test data:', error.response?.data || error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

createTestData(); 