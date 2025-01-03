const axios = require('axios');
const { PB_URL } = require('../config');

async function cleanupTestData(authToken, state) {
    try {
        // Clean up access records
        if (state.accessRecords && state.accessRecords.length > 0) {
            for (const id of state.accessRecords) {
                try {
                    await axios.delete(
                        `${PB_URL}/api/collections/department_user_access/records/${id}`,
                        { headers: { 'Authorization': `Bearer ${authToken}` } }
                    );
                } catch (error) {
                    console.log(`Failed to delete access record ${id}:`, error.message);
                }
            }
        }

        // Clean up users
        if (state.users && state.users.length > 0) {
            for (const id of state.users) {
                try {
                    await axios.delete(
                        `${PB_URL}/api/collections/users/records/${id}`,
                        { headers: { 'Authorization': `Bearer ${authToken}` } }
                    );
                } catch (error) {
                    console.log(`Failed to delete user ${id}:`, error.message);
                }
            }
        }

        // Clean up departments
        if (state.departments && state.departments.length > 0) {
            for (const id of state.departments) {
                try {
                    await axios.delete(
                        `${PB_URL}/api/collections/departments/records/${id}`,
                        { headers: { 'Authorization': `Bearer ${authToken}` } }
                    );
                } catch (error) {
                    console.log(`Failed to delete department ${id}:`, error.message);
                }
            }
        }

        console.log('✨ Cleanup completed');
    } catch (error) {
        console.error('Cleanup failed:', error.message);
    }
}

module.exports = cleanupTestData; 