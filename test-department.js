require('dotenv').config({ path: '.env.node' });
const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase('http://127.0.0.1:5050');

async function testDepartment() {
    try {
        // Login
        await pb.admins.authWithPassword(
            process.env.POCKETBASE_SUPER_ADMIN_EMAIL,
            process.env.POCKETBASE_SUPER_ADMIN_PASSWORD
        );

        // 1. List members
        console.log('\n1. Current members:');
        const members = await pb.collection('department_user_access').getList(1, 50, {
            filter: 'department = "ytt7n39n22jkkhy"',
            expand: 'user'
        });
        console.log(JSON.stringify(members.items, null, 2));

        // 2. Add new member
        console.log('\n2. Adding new member:');
        const newMember = await pb.collection('department_user_access').create({
            user: "rx0i2zikft1taof",
            department: "ytt7n39n22jkkhy",
            role: "operator",
            tank_permissions: {}
        });
        console.log(JSON.stringify(newMember, null, 2));

        // 3. Update member role
        console.log('\n3. Updating member role:');
        const updatedMember = await pb.collection('department_user_access').update(newMember.id, {
            role: "manager"
        });
        console.log(JSON.stringify(updatedMember, null, 2));

        // 4. List members again
        console.log('\n4. Updated members list:');
        const updatedMembers = await pb.collection('department_user_access').getList(1, 50, {
            filter: 'department = "ytt7n39n22jkkhy"',
            expand: 'user'
        });
        console.log(JSON.stringify(updatedMembers.items, null, 2));

    } catch (error) {
        console.error('Error:', error);
    }
}

testDepartment(); 