const axios = require('axios');
const { PB_URL } = require('../config');

async function testAutoAssign() {
    try {
        // 1. Login to get token
        console.log('\n🔑 Getting admin token...');
        const loginResponse = await axios.post(`${PB_URL}/api/collections/users/auth-with-password`, {
            identity: 'admin@tank-api.test',
            password: 'AdminTest@2024'
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
        console.log(`Found ${departments.length} departments:`);
        departments.forEach(d => console.log(`- ${d.name} (${d.id})`));

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
        
        // Find Chemical Engineering department
        const chemDept = departments.find(d => d.name.includes('Chemical'));
        if (chemDept) {
            const chemTanks = tanks.filter(t => t.tank_id.startsWith('CHE-'));
            // Update department's tanks array
            await axios.patch(
                `${PB_URL}/api/collections/departments/records/${chemDept.id}`,
                { tanks: chemTanks.map(t => t.id) },
                {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                }
            );
            // Update tanks' department field
            for (const tank of chemTanks) {
                await axios.patch(
                    `${PB_URL}/api/collections/tanks/records/${tank.id}`,
                    { department: chemDept.id },
                    {
                        headers: { 'Authorization': `Bearer ${authToken}` }
                    }
                );
                console.log(`Assigned tank ${tank.tank_id} to Chemical Engineering`);
            }
        }

        // Find Biological Research department
        const bioDept = departments.find(d => d.name.includes('Bio'));
        if (bioDept) {
            const bioTanks = tanks.filter(t => t.tank_id.startsWith('BIO-'));
            // Update department's tanks array
            await axios.patch(
                `${PB_URL}/api/collections/departments/records/${bioDept.id}`,
                { tanks: bioTanks.map(t => t.id) },
                {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                }
            );
            // Update tanks' department field
            for (const tank of bioTanks) {
                await axios.patch(
                    `${PB_URL}/api/collections/tanks/records/${tank.id}`,
                    { department: bioDept.id },
                    {
                        headers: { 'Authorization': `Bearer ${authToken}` }
                    }
                );
                console.log(`Assigned tank ${tank.tank_id} to Biological Research`);
            }
        }

        // Find Environmental Studies department
        const envDept = departments.find(d => d.name.includes('Environmental'));
        if (envDept) {
            const envTanks = tanks.filter(t => t.tank_id.startsWith('ENV-'));
            // Update department's tanks array
            await axios.patch(
                `${PB_URL}/api/collections/departments/records/${envDept.id}`,
                { tanks: envTanks.map(t => t.id) },
                {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                }
            );
            // Update tanks' department field
            for (const tank of envTanks) {
                await axios.patch(
                    `${PB_URL}/api/collections/tanks/records/${tank.id}`,
                    { department: envDept.id },
                    {
                        headers: { 'Authorization': `Bearer ${authToken}` }
                    }
                );
                console.log(`Assigned tank ${tank.tank_id} to Environmental Studies`);
            }
        }

        // 5. Verify assignments
        console.log('\n🔍 Verifying assignments...');
        
        // Get updated departments with expanded tanks
        const updatedDepartmentsResponse = await axios.get(
            `${PB_URL}/api/collections/departments/records?expand=tanks`,
            {
                headers: { 'Authorization': `Bearer ${authToken}` }
            }
        );
        const updatedDepartments = updatedDepartmentsResponse.data.items;

        for (const dept of updatedDepartments) {
            console.log(`\nDepartment: ${dept.name}`);
            console.log(`Tanks: ${dept.tanks?.length || 0}`);
            if (dept.tanks?.length > 0) {
                dept.tanks.forEach(tankId => {
                    const tank = tanks.find(t => t.id === tankId);
                    console.log(`- ${tank?.tank_id || tankId}`);
                });
            }
        }

        console.log('\n✨ Test completed');

    } catch (error) {
        console.error('\n❌ Test failed:', error.response?.data || error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

testAutoAssign(); 