const axios = require('axios');
const { PB_URL } = require('../config');
const API_URL = 'http://localhost:5053';

async function cleanupTestData(authToken, state = null) {
    try {
        console.log('\n🧹 Cleaning up test data...');
        
        // Clean up specific test data if state is provided
        if (state) {
            if (state.tanks) {
                console.log('Cleaning up test tanks...');
                for (const tankId of state.tanks) {
                    try {
                        await axios.delete(
                            `${API_URL}/tanks/${tankId}`,
                            { headers: { 'Authorization': `Bearer ${authToken}` } }
                        );
                        console.log(`✅ Deleted tank ${tankId}`);
                    } catch (e) {
                        console.log(`Could not delete tank ${tankId}: ${e.message}`);
                    }
                }
            }

            if (state.departments) {
                console.log('Cleaning up test departments...');
                for (const deptId of state.departments) {
                    try {
                        await axios.delete(
                            `${API_URL}/departments/${deptId}`,
                            { headers: { 'Authorization': `Bearer ${authToken}` } }
                        );
                        console.log(`✅ Deleted department ${deptId}`);
                    } catch (e) {
                        console.log(`Could not delete department ${deptId}: ${e.message}`);
                    }
                }
            }
        }

        // Clean up any remaining test data
        console.log('Cleaning up remaining test data...');
        
        // Clean up test tanks
        const tanksResponse = await axios.get(
            `${API_URL}/tanks`,
            {
                headers: { 'Authorization': `Bearer ${authToken}` },
                params: { filter: 'name ~ "TEST_"' }
            }
        );
        
        for (const tank of tanksResponse.data) {
            try {
                await axios.delete(
                    `${API_URL}/tanks/${tank.id}`,
                    { headers: { 'Authorization': `Bearer ${authToken}` } }
                );
                console.log(`✅ Deleted remaining tank ${tank.id}`);
            } catch (e) {
                console.log(`Could not delete remaining tank ${tank.id}: ${e.message}`);
            }
        }

        // Clean up test departments
        const deptsResponse = await axios.get(
            `${API_URL}/departments`,
            {
                headers: { 'Authorization': `Bearer ${authToken}` },
                params: { filter: 'name ~ "TEST_"' }
            }
        );

        for (const dept of deptsResponse.data) {
            try {
                await axios.delete(
                    `${API_URL}/departments/${dept.id}`,
                    { headers: { 'Authorization': `Bearer ${authToken}` } }
                );
                console.log(`✅ Deleted remaining department ${dept.id}`);
            } catch (e) {
                console.log(`Could not delete remaining department ${dept.id}: ${e.message}`);
            }
        }

        console.log('✅ Cleanup completed');
    } catch (error) {
        console.error('❌ Cleanup failed:', error.response?.data || error.message);
    }
}

module.exports = cleanupTestData; 