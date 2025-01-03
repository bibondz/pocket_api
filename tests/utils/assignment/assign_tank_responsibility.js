const axios = require('axios');
const { PB_URL } = require('../config');

async function assignTankResponsibilities() {
    try {
        // 1. Login first to get token
        console.log('\n🔑 Getting admin token...');
        const loginResponse = await axios.post(`${PB_URL}/api/collections/users/auth-with-password`, {
            identity: 'admin@example.com',
            password: 'TestUser@2024'
        });
        const authToken = loginResponse.data.token;
        console.log('✅ Got admin token');

        // 2. Get departments with their tanks and members
        console.log('\n🏢 Getting departments with tanks and members...');
        const departmentsResponse = await axios.get(
            `${PB_URL}/api/collections/departments/records?sort=-created&perPage=3&expand=tanks`,
            {
                headers: { 'Authorization': `Bearer ${authToken}` }
            }
        );
        const departments = departmentsResponse.data.items;
        console.log(`Found ${departments.length} departments`);

        // 3. For each department, assign tanks to members
        for (const department of departments) {
            console.log(`\n🏢 Processing department: ${department.name}`);
            
            // Get department members
            const membersResponse = await axios.get(
                `${PB_URL}/api/collections/department_user_access/records?filter=(department="${department.id}")&expand=user`,
                {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                }
            );
            const members = membersResponse.data.items;
            
            // Get department tanks
            const tanksResponse = await axios.get(
                `${PB_URL}/api/collections/tanks/records?filter=(department="${department.id}")`,
                {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                }
            );
            const tanks = tanksResponse.data.items;

            console.log(`Found ${members.length} members and ${tanks.length} tanks`);

            // Find manager and operator
            const manager = members.find(m => m.role === 'manager');
            const operator = members.find(m => m.role === 'operator');

            if (!manager || !operator) {
                console.log('⚠️ Missing manager or operator for this department');
                continue;
            }

            // Assign tanks between manager and operator
            const tankAssignments = tanks.map(async (tank, index) => {
                // Alternate between manager and operator
                const assignedMember = index % 2 === 0 ? manager : operator;
                const isManager = assignedMember.role === 'manager';
                
                // Get current tank_permissions
                const currentPermissions = assignedMember.tank_permissions || {};
                
                // Create new permissions object
                const updatedPermissions = {
                    ...currentPermissions,
                    [tank.id]: {
                        create_token: false,
                        manage_access: false,
                        read: true,
                        write: isManager // only managers can write
                    }
                };
                
                // Update department_user_access record with tank permissions
                await axios.patch(
                    `${PB_URL}/api/collections/department_user_access/records/${assignedMember.id}`,
                    {
                        tank_permissions: updatedPermissions
                    },
                    {
                        headers: { 'Authorization': `Bearer ${authToken}` }
                    }
                );

                // Update tank's managed_by field
                await axios.patch(
                    `${PB_URL}/api/collections/tanks/records/${tank.id}`,
                    {
                        managed_by: [assignedMember.expand.user.id]
                    },
                    {
                        headers: { 'Authorization': `Bearer ${authToken}` }
                    }
                );

                console.log(`Assigned tank ${tank.name} to ${assignedMember.expand.user.name} (${assignedMember.role})`);
            });

            await Promise.all(tankAssignments);
            console.log(`✅ Completed assignments for department: ${department.name}`);
        }

        console.log('\n✨ All tank responsibilities assigned successfully');

    } catch (error) {
        console.error('\n❌ Assignment failed:', error.response?.data || error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

assignTankResponsibilities(); 