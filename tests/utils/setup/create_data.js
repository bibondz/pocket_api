const axios = require('axios');
const { PB_URL } = require('./config');

async function createData() {
    try {
        // 1. Login to get token
        console.log('\n🔑 Getting admin token...');
        const loginResponse = await axios.post(`${PB_URL}/api/collections/users/auth-with-password`, {
            identity: 'admin@example.com',
            password: 'TestUser@2024'
        });
        const authToken = loginResponse.data.token;
        console.log('✅ Got admin token');

        // 2. Create departments
        console.log('\n🏢 Creating departments...');
        const timestamp = Date.now();
        const departments = [
            {
                name: `Chemical Engineering ${timestamp}`,
                description: 'Department responsible for chemical processes and equipment',
                location: 'Building A, Floor 1'
            },
            {
                name: `Biological Research ${timestamp}`,
                description: 'Department focused on biological research and experiments',
                location: 'Building B, Floor 2'
            },
            {
                name: `Environmental Studies ${timestamp}`,
                description: 'Department studying environmental impacts and sustainability',
                location: 'Building C, Floor 1'
            }
        ];

        const createdDepartments = [];
        for (const dept of departments) {
            const response = await axios.post(
                `${PB_URL}/api/collections/departments/records`,
                dept,
                {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                }
            );
            createdDepartments.push(response.data);
            console.log(`Created department: ${dept.name}`);
        }

        // 3. Create tanks for each department
        console.log('\n🛢️ Creating tanks...');
        
        // Chemical Engineering tanks
        await Promise.all([
            axios.post(
                `${PB_URL}/api/collections/tanks/records`,
                {
                    name: 'Chemical Reactor A',
                    tank_id: 'CHE-001',
                    capacity: 1000,
                    status: 'active',
                    description: 'Main chemical reactor for batch processing',
                    department: createdDepartments[0].id
                },
                {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                }
            ),
            axios.post(
                `${PB_URL}/api/collections/tanks/records`,
                {
                    name: 'Chemical Reactor B',
                    tank_id: 'CHE-002',
                    capacity: 1500,
                    status: 'active',
                    description: 'Secondary chemical reactor for continuous processing',
                    department: createdDepartments[0].id
                },
                {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                }
            )
        ]);
        console.log('Created Chemical Engineering tanks');

        // Biological Research tanks
        await Promise.all([
            axios.post(
                `${PB_URL}/api/collections/tanks/records`,
                {
                    name: 'Bio Reactor 1',
                    tank_id: 'BIO-001',
                    capacity: 500,
                    status: 'active',
                    description: 'Bioreactor for cell culture experiments',
                    department: createdDepartments[1].id
                },
                {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                }
            ),
            axios.post(
                `${PB_URL}/api/collections/tanks/records`,
                {
                    name: 'Bio Reactor 2',
                    tank_id: 'BIO-002',
                    capacity: 750,
                    status: 'active',
                    description: 'Bioreactor for protein production',
                    department: createdDepartments[1].id
                },
                {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                }
            )
        ]);
        console.log('Created Biological Research tanks');

        // Environmental Studies tanks
        await Promise.all([
            axios.post(
                `${PB_URL}/api/collections/tanks/records`,
                {
                    name: 'Water Analysis Tank 1',
                    tank_id: 'ENV-001',
                    capacity: 1000,
                    status: 'active',
                    description: 'Water contamination testing tank',
                    department: createdDepartments[2].id
                },
                {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                }
            ),
            axios.post(
                `${PB_URL}/api/collections/tanks/records`,
                {
                    name: 'Water Analysis Tank 2',
                    tank_id: 'ENV-002',
                    capacity: 1000,
                    status: 'active',
                    description: 'Water quality monitoring tank',
                    department: createdDepartments[2].id
                },
                {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                }
            )
        ]);
        console.log('Created Environmental Studies tanks');

        console.log('\n✨ All data created successfully');

    } catch (error) {
        console.error('\n❌ Creation failed:', error.response?.data || error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

createData(); 