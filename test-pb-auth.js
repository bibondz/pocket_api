require('dotenv').config({ path: '.env.node' });
const PBAuthService = require('./src/services/pb-auth.service');

async function test() {
    const auth = new PBAuthService();

    console.log('Testing user auth...');
    const userResult = await auth.auth('admin@tank-api.test', 'AdminTest@2024');
    console.log('User auth result:', userResult);
    console.log('Token:', auth.getToken());
    console.log();

    console.log('Testing auth verification...');
    console.log('Is valid:', auth.isValid());
    console.log();

    auth.clearAuth();
    console.log('Auth cleared');
    console.log('Is valid:', auth.isValid());
}

test(); 