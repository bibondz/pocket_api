const PocketBase = require('pocketbase/cjs');

const authMiddleware = async (req, res, next) => {
    try {
        // Check for token
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Auth token not provided'
            });
        }

        const token = authHeader.split(' ')[1];
        
        // Make sure URL has http:// prefix
        let pbUrl = process.env.PB_URL || 'localhost:5050';
        if (!pbUrl.startsWith('http://') && !pbUrl.startsWith('https://')) {
            pbUrl = `http://${pbUrl}`;
        }
        console.log('Auth middleware - PocketBase URL:', pbUrl);
        const pb = new PocketBase(pbUrl);

        try {
            // Get user data from token
            const tokenData = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
            console.log('Token data:', tokenData);

            if (!tokenData.id) {
                throw new Error('Invalid token format - no user ID');
            }

            // Save token to PocketBase auth store
            pb.authStore.save(token, tokenData);

            // Get full user data including role
            const fullUser = await pb.collection('users').getOne(tokenData.id);
            console.log('Full user data:', fullUser);

            // Attach auth data to request
            req.user = fullUser;
            req.pb = pb;
            next();
            
        } catch (error) {
            console.error('Token validation error:', error);
            return res.status(401).json({
                success: false,
                message: 'Invalid token',
                details: error.message
            });
        }
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            details: error.message
        });
    }
};

module.exports = {
    authMiddleware
}; 