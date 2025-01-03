const jwt = require('jsonwebtoken');
const config = require('../../config');
const PocketBase = require('pocketbase/cjs');
const { PB_URL } = require('../../config');

const verifyToken = async (req, res, next) => {
    console.log('Auth header:', req.headers['authorization']);
    const token = req.headers['authorization']?.split(' ')[1];
    console.log('Extracted token:', token);
    
    if (!token) {
        return res.status(403).json({ error: 'No token provided' });
    }

    try {
        // Store the raw token for PocketBase API calls
        req.token = token;
        console.log('Token stored in request:', req.token);
        
        // Decode JWT to get user ID
        const decoded = jwt.decode(token);
        console.log('Decoded token:', decoded);

        // Get user data from PocketBase
        const pb = new PocketBase(PB_URL);
        pb.authStore.save(token, decoded);
        
        const user = await pb.collection('users').getOne(decoded.id);
        req.user = user;
        
        next();
    } catch (error) {
        console.error('Token verification error:', error);
        return res.status(401).json({ error: 'Invalid token' });
    }
};

module.exports = {
    verifyToken
}; 