require('dotenv').config({ path: '.env.node' });
const PBAuthService = require('./src/services/pb-auth.service');

async function testPBAuth() {
    const auth = new PBAuthService();

    console.log('Testing authentication...');
    const result = await auth.auth('admin@tank-api.test', 'AdminTest@2024');
    console.log('Auth result:', {
        success: result.success,
        token: result.token,
        user: result.user
    });
    console.log('Is valid:', auth.isValid());

    if (result.success) {
        // ทดสอบใช้งาน PocketBase client โดยตรง
        console.log('\nTesting PocketBase client usage...');
        const pb = result.pb;
        
        // ตัวอย่างการใช้งาน: ดึงข้อมูล tanks
        try {
            const tanks = await pb.collection('tanks').getList(1, 5);
            console.log('Tanks:', tanks.items.map(tank => ({
                id: tank.id,
                name: tank.name,
                tank_id: tank.tank_id
            })));
        } catch (error) {
            console.error('Error fetching tanks:', error);
        }

        // ทดสอบสร้าง client ใหม่จาก token
        console.log('\nTesting client creation from token...');
        const newClient = auth.getClientWithToken(result.token);
        console.log('New client valid:', newClient.authStore.isValid);
    }
    
    auth.clearAuth();
    console.log('\nAuth cleared');
    console.log('Is valid:', auth.isValid());
}

testPBAuth(); 