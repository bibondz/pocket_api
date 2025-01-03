const PocketBase = require('pocketbase/cjs');
const { PB_URL } = require('../../config');
const jwt = require('jsonwebtoken');

const authMiddleware = async (req, res, next) => {
    try {
        // Check for token
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }

        const token = authHeader.split(' ')[1];
        const pb = new PocketBase(PB_URL);

        try {
            // Decode token to get user data
            const decoded = jwt.decode(token);
            if (!decoded || !decoded.id) {
                throw new Error('Invalid token format');
            }

            // Save token with model data
            pb.authStore.save(token, {
                id: decoded.id,
                collectionId: decoded.collectionId,
                collectionName: 'users',
                type: decoded.type
            });

            // Get user data from PocketBase
            const user = pb.authStore.model;
            if (!user) {
                throw new Error('Invalid token data');
            }

            // If token is valid, attach user and pb instance to request
            req.user = user;
            req.pb = pb;
            next();
            
        } catch (error) {
            console.error('Token validation error:', error);
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

module.exports = {
    authMiddleware
}; 