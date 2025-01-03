require('dotenv').config({ path: '.env.node' });
const PocketBase = require('pocketbase/cjs');

async function verifyUser(userId) {
    try {
        const pb = new PocketBase(process.env.PB_URL);
        
        // Login as admin
        await pb.admins.authWithPassword(
            process.env.POCKETBASE_SUPER_ADMIN_EMAIL,
            process.env.POCKETBASE_SUPER_ADMIN_PASSWORD
        );

        // Update user verified status
        const result = await pb.collection('users').update(userId, {
            verified: true
        });

        console.log('User verified successfully:', result);
        return result;
    } catch (error) {
        console.error('Failed to verify user:', error);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    const userId = process.argv[2];
    if (!userId) {
        console.error('Please provide user ID as argument');
        process.exit(1);
    }

    verifyUser(userId)
        .then(() => process.exit(0))
        .catch(err => {
            console.error(err);
            process.exit(1);
        });
}

module.exports = verifyUser; 