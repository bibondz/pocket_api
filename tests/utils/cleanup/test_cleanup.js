const axios = require('axios');

const PB_URL = process.env.PB_URL_PUBLIC || 'http://localhost:5050';
const API_URL = process.env.API_URL || 'http://localhost:5053/api';

async function cleanupTestData() {
    try {
        // 1. Login first to get token
        console.log('\n🔑 Getting admin token...');
        const loginResponse = await axios.post(`${PB_URL}/api/collections/users/auth-with-password`, {
            identity: 'admin@example.com',
            password: 'TestUser@2024'
        });
        const authToken = loginResponse.data.token;
        console.log('✅ Got admin token');

        // 2. Get all test tanks
        console.log('\n🛢️ Getting test tanks...');
        const tanksResponse = await axios.get(
            `${PB_URL}/api/collections/tanks/records?filter=(name~"Test Tank")`,
            {
                headers: { 
                    'Authorization': `Bearer ${authToken}`
                }
            }
        );
        
        // 3. Delete test tanks
        console.log(`Found ${tanksResponse.data.items.length} test tanks`);
        for (const tank of tanksResponse.data.items) {
            await axios.delete(
                `${PB_URL}/api/collections/tanks/records/${tank.id}`,
                {
                    headers: { 
                        'Authorization': `Bearer ${authToken}`
                    }
                }
            );
        }
        console.log('✅ Deleted all test tanks');

        // 4. Get all test departments
        console.log('\n🏢 Getting test departments...');
        const departmentsResponse = await axios.get(
            `${PB_URL}/api/collections/departments/records?filter=(name~"Test Department")`,
            {
                headers: { 
                    'Authorization': `Bearer ${authToken}`
                }
            }
        );
        
        // 5. Delete test departments
        console.log(`Found ${departmentsResponse.data.items.length} test departments`);
        for (const dept of departmentsResponse.data.items) {
            await axios.delete(
                `${PB_URL}/api/collections/departments/records/${dept.id}`,
                {
                    headers: { 
                        'Authorization': `Bearer ${authToken}`
                    }
                }
            );
        }
        console.log('✅ Deleted all test departments');

        console.log('\n✨ All test data cleaned up successfully');

    } catch (error) {
        console.error('\n❌ Cleanup failed:', error.response?.data || error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

cleanupTestData(); 