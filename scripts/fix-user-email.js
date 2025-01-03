const PocketBase = require('pocketbase/cjs');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.node' });

async function fixUserEmails() {
    try {
        // Initialize PocketBase client
        const pb = new PocketBase(process.env.PB_URL);

        // Authenticate as admin
        await pb.admins.authWithPassword(
            process.env.POCKETBASE_SUPER_ADMIN_EMAIL,
            process.env.POCKETBASE_SUPER_ADMIN_PASSWORD
        );

        // Get all users
        const users = await pb.collection('users').getFullList({
            sort: '-created',
        });

        console.log(`Found ${users.length} users to process`);

        // Process each user
        for (const user of users) {
            try {
                const updateData = {};
                
                // Check if name contains email but email field is empty
                if (user.name && user.name.includes('@') && !user.email) {
                    console.log(`Fixing user ${user.id}: Moving email from name to email field`);
                    
                    updateData.email = user.name;
                    updateData.emailVisibility = true;
                    
                    // Set a basic name if we're moving the email
                    updateData.name = `User ${user.username}`;
                    
                    await pb.collection('users').update(user.id, updateData);
                    console.log(`Updated user ${user.id} successfully`);
                }
            } catch (userError) {
                console.error(`Error processing user ${user.id}:`, userError);
            }
        }

        console.log('Email fix process completed');
    } catch (error) {
        console.error('Script error:', error);
    }
}

// Run the fix
fixUserEmails().then(() => {
    console.log('Script finished');
    process.exit(0);
}).catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
}); 