const authMiddleware = async (req, res, next) => {
    try {
        // Check if user is authenticated
        if (!req.pb.authStore.isValid) {
            try {
                // Try to refresh token
                await req.pb.collection('users').authRefresh();
                
                // If refresh successful, update token
                if (req.pb.authStore.isValid) {
                    req.token = req.pb.authStore.token;
                } else {
                    return res.status(401).json({
                        success: false,
                        message: 'Authentication required'
                    });
                }
            } catch (error) {
                return res.status(401).json({
                    success: false,
                    message: 'Token expired'
                });
            }
        }

        // Get user record and ensure role is set
        const user = await req.pb.collection('users').getOne(req.pb.authStore.model.id);
        
        // Set role from auth store if not in user record
        if (!user.role && req.pb.authStore.model.role) {
            user.role = req.pb.authStore.model.role;
        }
        
        // Attach user to request
        req.user = user;
        
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            data: {
                error: error.message
            }
        });
    }
};

module.exports = { authMiddleware }; 