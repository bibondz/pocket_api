require('dotenv').config({ path: '.env.node' });
const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase('http://127.0.0.1:5050');

async function addMember() {
    try {
        await pb.admins.authWithPassword(
            process.env.POCKETBASE_SUPER_ADMIN_EMAIL,
            process.env.POCKETBASE_SUPER_ADMIN_PASSWORD
        );
        
        const result = await pb.collection('department_user_access').create({
            user: "zajta09j0oss5l1", // MarkDev002
            department: "ytt7n39n22jkkhy", // Engineering Department
            role: "operator",
            tank_permissions: {}
        });
        
        console.log('Added member:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('Error:', error);
    }
}

addMember(); 