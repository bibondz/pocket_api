const axios = require('axios');
const { PB_URL } = require('../config');

async function cleanTestData() {
    try {
        // 1. Login first to get token
        console.log('\n🔑 Getting admin token...');
        const loginResponse = await axios.post(`${PB_URL}/api/collections/users/auth-with-password`, {
            identity: 'admin@example.com',
            password: 'TestUser@2024'
        });
        const authToken = loginResponse.data.token;
        console.log('✅ Got admin token');

        // 2. Get test tanks only
        console.log('\n🛢️ Getting test tanks...');
        const tanksResponse = await axios.get(
            `${PB_URL}/api/collections/tanks/records?filter=(tank_id~'CHE-' || tank_id~'BIO-' || tank_id~'ENV-')`,
            {
                headers: { 'Authorization': `Bearer ${authToken}` }
            }
        );
        const testTanks = tanksResponse.data.items;
        console.log(`Found ${testTanks.length} test tanks`);

        // 3. Delete test tanks
        console.log('\n🗑️ Deleting test tanks...');
        await Promise.all(testTanks.map(tank =>
            axios.delete(
                `${PB_URL}/api/collections/tanks/records/${tank.id}`,
                {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                }
            ).catch(error => {
                console.error(`Failed to delete tank ${tank.id}:`, error.response?.data || error.message);
            })
        ));

        console.log('\n✨ All test tanks cleaned successfully');

    } catch (error) {
        console.error('\n❌ Cleanup failed:', error.response?.data || error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

cleanTestData(); 