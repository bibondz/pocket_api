require('dotenv').config({ path: '.env.node' });
const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase('http://127.0.0.1:5050');

async function updateMember() {
    try {
        await pb.admins.authWithPassword(
            process.env.POCKETBASE_SUPER_ADMIN_EMAIL,
            process.env.POCKETBASE_SUPER_ADMIN_PASSWORD
        );
        
        // หา record ID ของ department_user_access
        const access = await pb.collection('department_user_access').getFirstListItem(
            `user = "zajta09j0oss5l1" && department = "ytt7n39n22jkkhy"`
        );
        
        // อัพเดทตำแหน่งในแผนก
        const result = await pb.collection('department_user_access').update(access.id, {
            position: "manager"  // ใช้ position แทน role เพื่อไม่ให้สับสนกับ user role
        });
        
        console.log('Updated member position in department:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('Error:', error);
    }
}

updateMember(); 