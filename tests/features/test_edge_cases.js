const axios = require('axios');
const { PB_URL } = require('../config');

async function testEdgeCases(authToken, state) {
    try {
        // Test case 1: Cross-department tank assignment
        console.log('\n1️⃣ Testing cross-department tank assignment...');
        
        // Create another department and tank
        const timestamp = new Date().getTime();
        const dept2Response = await axios.post(
            `${PB_URL}/api/collections/departments/records`,
            { name: `Another Department ${timestamp}` },
            { headers: { 'Authorization': `Bearer ${authToken}` } }
        );
        
        const tank2Response = await axios.post(
            `${PB_URL}/api/collections/tanks/records`,
            {
                name: 'Another Tank',
                tank_id: `ANT-${timestamp.toString().slice(-4)}`,
                capacity: 1000,
                status: 'active',
                department: dept2Response.data.id
            },
            { headers: { 'Authorization': `Bearer ${authToken}` } }
        );

        // Try to assign tank from dept2 to user in dept1
        const operatorAccess1 = await axios.get(
            `${PB_URL}/api/collections/department_user_access/records`,
            {
                headers: { 'Authorization': `Bearer ${authToken}` },
                params: {
                    filter: `user = "${state.userIds[1]}" && department = "${state.departmentId}"`
                }
            }
        );

        try {
            await axios.patch(
                `${PB_URL}/api/collections/department_user_access/records/${operatorAccess1.data.items[0].id}`,
                {
                    tank_permissions: {
                        [tank2Response.data.id]: { read: true, write: true, manage: false }
                    }
                },
                { headers: { 'Authorization': `Bearer ${authToken}` } }
            );
            console.log('❌ Should not allow cross-department assignment');
        } catch (error) {
            console.log('✅ Correctly prevented cross-department assignment');
        }

        // Test case 2: Operator permission elevation
        console.log('\n2️⃣ Testing operator permission elevation...');
        const operatorAccess2 = await axios.get(
            `${PB_URL}/api/collections/department_user_access/records`,
            {
                headers: { 'Authorization': `Bearer ${authToken}` },
                params: {
                    filter: `user = "${state.userIds[1]}" && department = "${state.departmentId}"`
                }
            }
        );

        try {
            await axios.patch(
                `${PB_URL}/api/collections/department_user_access/records/${operatorAccess2.data.items[0].id}`,
                {
                    tank_permissions: {
                        [state.tankIds[0]]: { read: true, write: true, manage: true }
                    }
                },
                { headers: { 'Authorization': `Bearer ${authToken}` } }
            );
            console.log('❌ Should not allow operator to have manager permissions');
        } catch (error) {
            console.log('✅ Correctly prevented operator permission elevation');
        }

    } catch (error) {
        console.error('\n❌ Test failed:', error.response?.data || error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

module.exports = testEdgeCases; 