require('dotenv').config({ path: '.env.node' });
const UserManageService = require('./src/services/user-manage.service');
const service = new UserManageService();

async function test() {
    try {
        // Wait for initialization
        await service.init();

        // Verify auth token
        console.log('Verifying auth token...');
        const isValid = service.pb.authStore.isValid;
        const token = service.pb.authStore.token;
        console.log('Auth token valid:', isValid);
        console.log('Auth token:', token);

        console.log('\nTesting createUser...');
        const newUser = await service.createUser({
            email: `test.operator.${Date.now()}@example.com`,
            password: 'Test123!',
            name: 'Test Operator',
            role: 'operator'
        });
        console.log('Created user:', JSON.stringify(newUser, null, 2));

        console.log('\nTesting updateUser...');
        const updatedUser = await service.updateUser(newUser.data.id, {
            name: 'Updated Test Operator',
            role: 'manager'
        });
        console.log('Updated user:', JSON.stringify(updatedUser, null, 2));

        console.log('\nTesting deleteUser...');
        const deleteResult = await service.deleteUser(newUser.data.id);
        console.log('Delete result:', JSON.stringify(deleteResult, null, 2));

        console.log('\nTesting listUsers...');
        const users = await service.listUsers();
        console.log('Users:', JSON.stringify(users, null, 2));

        if (users.data.items.length > 0) {
            const userId = users.data.items[0].id;
            console.log('\nTesting getUser...');
            const user = await service.getUser(userId);
            console.log('User:', JSON.stringify(user, null, 2));
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

test(); 