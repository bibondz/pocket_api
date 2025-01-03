require('dotenv').config({ path: '.env.node' });
const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase('http://127.0.0.1:5050');

async function listMembers() {
    try {
        await pb.admins.authWithPassword(
            process.env.POCKETBASE_SUPER_ADMIN_EMAIL,
            process.env.POCKETBASE_SUPER_ADMIN_PASSWORD
        );
        
        const result = await pb.collection('department_user_access').getList(1, 50, {
            filter: 'department = "ytt7n39n22jkkhy"',
            expand: 'user'
        });
        
        console.log('Current members:', JSON.stringify(result.items, null, 2));
    } catch (error) {
        console.error('Error:', error);
    }
}

listMembers(); 