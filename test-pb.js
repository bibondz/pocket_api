require('dotenv').config({ path: '.env.node' });
const PocketBase = require('pocketbase/cjs');

async function test() {
    try {
        const pb = new PocketBase('http://127.0.0.1:5050');
        
        // Try to login
        const authData = await pb.collection('users').authWithPassword(
            process.env.TEST_EMAIL,
            process.env.TEST_PASSWORD
        );
        
        console.log('Login success!');
        console.log('Token:', pb.authStore.token);
        console.log('User:', authData.record);

    } catch (error) {
        console.error('Error:', error);
    }
}

test(); 