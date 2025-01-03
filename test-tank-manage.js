require('dotenv').config({ path: '.env.node' });
const TankManageService = require('./src/services/tank-manage.service');

async function test() {
    const tankService = new TankManageService();
    await tankService.init();

    // Verify auth token
    console.log('Verifying auth token...');
    const isValid = tankService.pb.authStore.isValid;
    console.log('Auth token valid:', isValid);
    console.log('Auth token:', tankService.pb.authStore.token);
    console.log();

    // Test createTank
    console.log('Testing createTank...');
    const timestamp = Date.now();
    const tankData = {
        name: `Test Tank ${timestamp}`,
        tank_id: `T-TEST-${timestamp}`,
        description: 'Test tank description',
        capacity: 1000,
        percentage: 50,
        status: 'active',
        created_by: 'test',
        updated_by: 'test'
    };

    try {
        const result = await tankService.createTank(tankData);
        console.log('Create tank result:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('Error:', error);
    }
}

test(); 