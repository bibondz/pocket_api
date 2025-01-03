const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const AdminService = require('../services/admin.service');
const UserService = require('../services/user.service');

/**
 * Get user's departments
 */
router.get('/:userId/departments', 
    verifyToken,
    async (req, res) => {
        try {
            const userService = new UserService(req.token);
            const result = await userService.getDepartments(req.params.userId);
            res.json(result);
        } catch (error) {
            res.status(error.status || 500).json({
                success: false,
                message: error.message,
                data: error.data || {}
            });
        }
    }
);

/**
 * Get user's assigned tanks
 */
router.get('/:userId/tanks',
    verifyToken,
    async (req, res) => {
        try {
            const userService = new UserService(req.token);
            const result = await userService.getTanks(req.params.userId);
            res.json(result);
        } catch (error) {
            res.status(error.status || 500).json({
                success: false,
                message: error.message,
                data: error.data || {}
            });
        }
    }
);

/**
 * Get user's activity history
 */
router.get('/:userId/activities',
    verifyToken,
    async (req, res) => {
        try {
            const userService = new UserService(req.token);
            const result = await userService.getActivities(req.params.userId);
            res.json(result);
        } catch (error) {
            res.status(error.status || 500).json({
                success: false,
                message: error.message,
                data: error.data || {}
            });
        }
    }
);

/**
 * Simple search for users
 */
router.get('/search',
    verifyToken,
    async (req, res) => {
        try {
            const userService = new UserService({
                token: req.pb.authStore.token,
                record: req.user
            });

            // Build search filter from query params
            let filter = [];
            if (req.query.name) {
                filter.push(`name~'${req.query.name}'`);
            }
            if (req.query.role) {
                filter.push(`role='${req.query.role}'`);
            }
            if (req.query.department) {
                filter.push(`department.name~'${req.query.department}'`);
            }

            const result = await userService.list({
                filter: filter.length > 0 ? filter.join('||') : '',
                expand: 'department'
            });

            // Transform response to be more readable
            const simplifiedResults = result.data.items.map(user => ({
                name: user.name,
                role: user.role,
                department: user.expand?.department?.name || 'Unassigned',
                email: user.email,
                created: user.created,
                last_updated: user.updated
            }));

            res.json({
                success: true,
                total: result.data.totalItems,
                users: simplifiedResults
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
);

/**
 * Get current user's profile with departments and tanks
 */
router.get('/me',
    verifyToken,
    async (req, res) => {
        try {
            const userService = new UserService(req.token);
            
            // Get user's departments
            const departments = await userService.getDepartments(req.user.id);
            
            // Get user's tanks
            const tanks = await userService.getTanks(req.user.id);
            
            res.json({
                success: true,
                data: {
                    user: {
                        id: req.user.id,
                        name: req.user.name,
                        email: req.user.email,
                        role: req.user.role,
                        created: req.user.created,
                        updated: req.user.updated
                    },
                    departments: departments.data,
                    tanks: tanks.data
                }
            });
        } catch (error) {
            res.status(error.status || 500).json({
                success: false,
                message: error.message,
                data: error.data || {}
            });
        }
    }
);

module.exports = router; 