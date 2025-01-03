const PocketBase = require('pocketbase/cjs');

const pbMiddleware = (req, res, next) => {
    try {
        // Create PocketBase instance
        const pb = new PocketBase(process.env.PB_URL);
        
        // If there's an authorization header, set the token
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            pb.authStore.save(token);
        }

        // Attach PocketBase instance to request
        req.pb = pb;
        
        next();
    } catch (error) {
        console.error('PocketBase middleware error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            data: {
                error: error.message
            }
        });
    }
};

module.exports = { pbMiddleware }; 