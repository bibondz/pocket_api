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
        
        try {
            // Get user data from token
            const tokenData = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
            console.log('Token data:', tokenData);

            if (!tokenData.id) {
                throw new Error('Invalid token format - no user ID');
            }

            // Get full user data including role using req.pb from pbMiddleware
            const fullUser = await req.pb.collection('users').getOne(tokenData.id);
            console.log('Full user data:', fullUser);

            // Attach user data to request
            req.user = fullUser;
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