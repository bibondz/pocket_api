require('dotenv').config({ path: '.env.node' });
const UserService = require('../src/services/user.service');

async function testLogin() {
    const userService = new UserService();
    
    try {
        // Test login with email
        console.log('\nTesting login with email...');
        const emailLoginResult = await userService.login('admin@tank-api.test', 'AdminTest@2024');
        console.log('Login with email result:', JSON.stringify(emailLoginResult, null, 2));

        // Test login with username (assuming admin username)
        console.log('\nTesting login with username...');
        const usernameLoginResult = await userService.login('admin', 'AdminTest@2024');
        console.log('Login with username result:', JSON.stringify(usernameLoginResult, null, 2));

    } catch (error) {
        console.error('Login test failed:', error);
    }
}

testLogin(); 