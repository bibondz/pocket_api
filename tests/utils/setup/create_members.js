const axios = require('axios');

const PB_URL = process.env.PB_URL_PUBLIC || 'http://localhost:5050';
const API_URL = process.env.API_URL || 'http://localhost:5053/api';

async function createMembers() {
    try {
        // 1. Login first to get token
        console.log('\n🔑 Getting admin token...');
        const loginResponse = await axios.post(`${PB_URL}/api/collections/users/auth-with-password`, {
            identity: 'admin@example.com',
            password: 'TestUser@2024'
        });
        const authToken = loginResponse.data.token;
        console.log('✅ Got admin token');

        // 2. Create test users
        console.log('\n👥 Creating users...');
        const timestamp = Date.now();
        const users = [
            {
                email: `chemical.manager.${timestamp}@example.com`,
                password: 'TestUser@2024',
                passwordConfirm: 'TestUser@2024',
                name: 'Chemical Manager',
                role: 'manager',
                emailVisibility: true,
                username: `chemical.manager.${timestamp}`
            },
            {
                email: `chemical.operator.${timestamp}@example.com`,
                password: 'TestUser@2024',
                passwordConfirm: 'TestUser@2024',
                name: 'Chemical Operator',
                role: 'operator',
                emailVisibility: true,
                username: `chemical.operator.${timestamp}`
            },
            {
                email: `bio.manager.${timestamp}@example.com`,
                password: 'TestUser@2024',
                passwordConfirm: 'TestUser@2024',
                name: 'Bio Manager',
                role: 'manager',
                emailVisibility: true,
                username: `bio.manager.${timestamp}`
            },
            {
                email: `bio.operator.${timestamp}@example.com`,
                password: 'TestUser@2024',
                passwordConfirm: 'TestUser@2024',
                name: 'Bio Operator',
                role: 'operator',
                emailVisibility: true,
                username: `bio.operator.${timestamp}`
            },
            {
                email: `env.manager.${timestamp}@example.com`,
                password: 'TestUser@2024',
                passwordConfirm: 'TestUser@2024',
                name: 'Environmental Manager',
                role: 'manager',
                emailVisibility: true,
                username: `env.manager.${timestamp}`
            },
            {
                email: `env.operator.${timestamp}@example.com`,
                password: 'TestUser@2024',
                passwordConfirm: 'TestUser@2024',
                name: 'Environmental Operator',
                role: 'operator',
                emailVisibility: true,
                username: `env.operator.${timestamp}`
            }
        ];

        const createdUsers = [];
        for (const user of users) {
            try {
                const response = await axios.post(
                    `${PB_URL}/api/collections/users/records`,
                    user,
                    {
                        headers: { 
                            'Authorization': `Bearer ${authToken}`
                        }
                    }
                );
                createdUsers.push(response.data);
                console.log(`Created user: ${user.name}`);
            } catch (error) {
                console.error(`Failed to create user ${user.name}:`, error.response?.data || error.message);
                if (error.response?.data?.code === 400) {
                    // User might already exist, try to get it
                    try {
                        const existingUser = await axios.get(
                            `${PB_URL}/api/collections/users/records?filter=(email="${user.email}")`,
                            {
                                headers: { 
                                    'Authorization': `Bearer ${authToken}`
                                }
                            }
                        );
                        if (existingUser.data.items.length > 0) {
                            createdUsers.push(existingUser.data.items[0]);
                            console.log(`Using existing user: ${user.name}`);
                        } else {
                            console.error(`User ${user.name} not found`);
                        }
                    } catch (getError) {
                        console.error(`Failed to get user ${user.name}:`, getError.response?.data || getError.message);
                    }
                }
            }
        }

        // 3. Get departments
        console.log('\n🏢 Getting departments...');
        const departmentsResponse = await axios.get(
            `${PB_URL}/api/collections/departments/records?sort=-created&perPage=3`,
            {
                headers: { 
                    'Authorization': `Bearer ${authToken}`
                }
            }
        );
        const departments = departmentsResponse.data.items;
        console.log(`Found ${departments.length} departments`);

        // 4. Assign members to departments
        console.log('\n👥 Assigning members to departments...');
        
        // Chemical Engineering gets first two users
        await Promise.all([
            axios.post(
                `${PB_URL}/api/collections/department_user_access/records`,
                {
                    department: departments[0].id,
                    user: createdUsers[0].id,
                    role: 'manager'
                },
                {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                }
            ),
            axios.post(
                `${PB_URL}/api/collections/department_user_access/records`,
                {
                    department: departments[0].id,
                    user: createdUsers[1].id,
                    role: 'operator'
                },
                {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                }
            )
        ]);
        console.log('Assigned members to Chemical Engineering');

        // Biological Research gets next two users
        await Promise.all([
            axios.post(
                `${PB_URL}/api/collections/department_user_access/records`,
                {
                    department: departments[1].id,
                    user: createdUsers[2].id,
                    role: 'manager'
                },
                {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                }
            ),
            axios.post(
                `${PB_URL}/api/collections/department_user_access/records`,
                {
                    department: departments[1].id,
                    user: createdUsers[3].id,
                    role: 'operator'
                },
                {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                }
            )
        ]);
        console.log('Assigned members to Biological Research');

        // Environmental Studies gets last two users
        await Promise.all([
            axios.post(
                `${PB_URL}/api/collections/department_user_access/records`,
                {
                    department: departments[2].id,
                    user: createdUsers[4].id,
                    role: 'manager'
                },
                {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                }
            ),
            axios.post(
                `${PB_URL}/api/collections/department_user_access/records`,
                {
                    department: departments[2].id,
                    user: createdUsers[5].id,
                    role: 'operator'
                },
                {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                }
            )
        ]);
        console.log('Assigned members to Environmental Studies');

        console.log('\n✨ All members created and assigned successfully');

    } catch (error) {
        console.error('\n❌ Creation failed:', error.response?.data || error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

createMembers(); 