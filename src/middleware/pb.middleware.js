const PocketBase = require('pocketbase/cjs');
const { PB_URL } = require('../../config');

const pbMiddleware = async (req, res, next) => {
    try {
        // Create PocketBase instance
        const pb = new PocketBase(PB_URL);
        
        // Get token from Authorization header
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            pb.authStore.save(token);
        }
        
        // Attach to request
        req.pb = pb;
        
        next();
    } catch (error) {
        console.error('PocketBase middleware error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            details: error.message
        });
    }
};

module.exports = {
    pbMiddleware
}; 