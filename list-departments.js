require('dotenv').config({ path: '.env.node' });
const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase('http://127.0.0.1:5050');

async function listDepartments() {
    try {
        // Login first
        await pb.admins.authWithPassword(
            process.env.POCKETBASE_SUPER_ADMIN_EMAIL,
            process.env.POCKETBASE_SUPER_ADMIN_PASSWORD
        );
        
        // Get all departments
        const records = await pb.collection('departments').getList(1, 100);
        console.log('Departments:', JSON.stringify(records, null, 2));
    } catch (error) {
        console.error('Error:', error);
    }
}

listDepartments(); 