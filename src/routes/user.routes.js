const express = require('express');
const router = express.Router();
const UserService = require('../services/user.service');
const { authMiddleware } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authMiddleware);

// Get current user (✅ Working)
router.get('/me', async (req, res) => {
    try {
        const userService = new UserService({
            token: req.pb.authStore.token,
            record: req.user
        });
        
        const result = await userService.getById(req.user.id);
        res.json({
            status: 'success',
            data: result
        });
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
});

// Middleware to check roles
const checkRole = (allowedRoles) => (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
            status: 'error',
            message: `Access denied. Required roles: ${allowedRoles.join(' or ')}`
        });
    }
    next();
};

// Get user by ID (✅ Working)
router.get('/:id', async (req, res) => {
    try {
        const userService = new UserService({
            token: req.pb.authStore.token,
            record: req.user
        });
        
        const result = await userService.getById(req.params.id);
        res.json({
            status: 'success',
            data: result
        });
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
});

// Create user
router.post('/', checkRole(['admin']), async (req, res) => {
    try {
        const userService = new UserService({
            token: req.pb.authStore.token,
            record: req.user
        });
        
        // Handle department name if provided
        if (req.body.department) {
            try {
                const departments = await req.pb.collection('departments').getFullList();
                const dept = departments.find(d => d.name === req.body.department);
                if (dept) {
                    req.body.department = dept.id;
                }
            } catch (error) {
                console.error('Error finding department:', error);
            }
        }

        const result = await userService.create(req.body);
        res.status(201).json({
            status: 'success',
            data: result
        });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
});

// Verify user
router.post('/:id/verify', checkRole(['admin']), async (req, res) => {
    try {
        const userService = new UserService({
            token: req.pb.authStore.token,
            record: req.user
        });

        const result = await userService.verify(req.params.id);
        res.json({
            status: 'success',
            message: 'User verified successfully',
            data: result
        });
    } catch (error) {
        console.error('Failed to verify user:', error);
        res.status(500).json({
            status: 'error',
            message: error.message || 'Failed to verify user'
        });
    }
});

// List users
router.get('/', checkRole(['admin', 'manager']), async (req, res) => {
    try {
        const userService = new UserService({
            token: req.pb.authStore.token,
            record: req.user
        });
        
        const result = await userService.list({
            page: req.query.page || 1,
            perPage: req.query.perPage || 50,
            sort: req.query.sort || '-created'
        });
        
        res.json({
            status: 'success',
            data: result
        });
    } catch (error) {
        console.error('List users error:', error);
        res.status(error.status || 400).json({
            status: 'error',
            message: error.message,
            details: error.toString()
        });
    }
});

// Update user
router.patch('/:id', async (req, res) => {
    try {
        const userService = new UserService({
            token: req.pb.authStore.token,
            record: req.user
        });
        
        const result = await userService.update(req.params.id, req.body);
        res.json({
            status: 'success',
            data: result
        });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(error.status || 400).json({
            status: 'error',
            message: error.message,
            details: error.toString()
        });
    }
});

// Bulk operations
router.post('/bulk', checkRole(['admin']), async (req, res) => {
    try {
        const userService = new UserService({
            token: req.pb.authStore.token,
            record: req.user
        });
        
        const { operation, userIds, data } = req.body;
        let result;
        
        switch (operation) {
            case 'update':
                result = await userService.bulkUpdate(userIds, data);
                break;
            case 'delete':
                result = await userService.bulkDelete(userIds);
                break;
            default:
                throw new Error('Invalid bulk operation');
        }
        
        res.json({
            status: 'success',
            data: result
        });
    } catch (error) {
        console.error('Bulk operation error:', error);
        res.status(error.status || 400).json({
            status: 'error',
            message: error.message,
            details: error.toString()
        });
    }
});

// Delete user
router.delete('/:userId', authMiddleware, async (req, res) => {
    try {
        const userService = new UserService({
            token: req.pb.authStore.token,
            record: req.user
        });
        
        const result = await userService.delete(req.params.userId);
        if (result.success) {
            console.log(`User ${req.params.userId} deleted successfully`);
            return res.status(200).json({
                status: 'success',
                message: `User ${req.params.userId} deleted successfully`
            });
        }
        res.status(400).json({
            status: 'error',
            message: 'Failed to delete user',
            error: result.message
        });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            error: error.message
        });
    }
});

// Delete user by username
router.delete('/by-username/:username', authMiddleware, async (req, res) => {
    try {
        const userService = new UserService({
            token: req.pb.authStore.token,
            record: req.user
        });
        
        const result = await userService.deleteByUsername(req.params.username);
        if (result.success) {
            console.log(`User ${req.params.username} deleted successfully`);
            return res.status(200).json({
                status: 'success',
                message: result.message
            });
        }
        res.status(404).json({
            status: 'error',
            message: result.message
        });
    } catch (error) {
        console.error('Delete user by username error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            error: error.message
        });
    }
});

// Delete user by email
router.delete('/by-email/:email', authMiddleware, async (req, res) => {
    try {
        const userService = new UserService({
            token: req.pb.authStore.token,
            record: req.user
        });
        
        const result = await userService.deleteByEmail(req.params.email);
        if (result.success) {
            console.log(`User ${req.params.email} deleted successfully`);
            return res.status(200).json({
                status: 'success',
                message: result.message
            });
        }
        res.status(404).json({
            status: 'error',
            message: result.message
        });
    } catch (error) {
        console.error('Delete user by email error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            error: error.message
        });
    }
});

// Update user by email
router.patch('/by-email/:email', authMiddleware, async (req, res) => {
    try {
        const userService = new UserService({
            token: req.pb.authStore.token,
            record: req.user
        });
        
        const result = await userService.updateByEmail(req.params.email, req.body);
        if (result.success) {
            console.log(`User ${req.params.email} updated successfully`);
            return res.status(200).json({
                status: 'success',
                message: result.message,
                data: result.data
            });
        }
        res.status(404).json({
            status: 'error',
            message: result.message
        });
    } catch (error) {
        console.error('Update user by email error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            error: error.message
        });
    }
});

module.exports = router; 