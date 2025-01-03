const express = require('express');
const router = express.Router();
const UserManageService = require('../services/user-manage.service');
const { authMiddleware } = require('../middleware/auth.middleware');

/**
 * List all users
 */
router.get('/', authMiddleware, async (req, res) => {
    try {
        const userService = new UserManageService({
            token: req.pb.authStore.token
        });
        const result = await userService.listUsers(req.query);
        res.json(result);
    } catch (error) {
        res.status(error.status || 500).json({
            success: false,
            message: error.message,
            data: error.data || {}
        });
    }
});

/**
 * Get user by ID
 */
router.get('/:userId', authMiddleware, async (req, res) => {
    try {
        const userService = new UserManageService({
            token: req.pb.authStore.token
        });
        const result = await userService.getUser(req.params.userId);
        res.json(result);
    } catch (error) {
        res.status(error.status || 500).json({
            success: false,
            message: error.message,
            data: error.data || {}
        });
    }
});

/**
 * Create new user
 */
router.post('/', authMiddleware, async (req, res) => {
    try {
        const userService = new UserManageService({
            token: req.pb.authStore.token
        });
        const result = await userService.createUser(req.body);
        res.status(201).json(result);
    } catch (error) {
        res.status(error.status || 500).json({
            success: false,
            message: error.message,
            data: error.data || {}
        });
    }
});

/**
 * Update user
 */
router.patch('/:userId', authMiddleware, async (req, res) => {
    try {
        const userService = new UserManageService({
            token: req.pb.authStore.token
        });
        const result = await userService.updateUser(req.params.userId, req.body);
        res.json(result);
    } catch (error) {
        res.status(error.status || 500).json({
            success: false,
            message: error.message,
            data: error.data || {}
        });
    }
});

/**
 * Delete user
 */
router.delete('/:userId', authMiddleware, async (req, res) => {
    try {
        const userService = new UserManageService({
            token: req.pb.authStore.token
        });
        const result = await userService.deleteUser(req.params.userId);
        res.json(result);
    } catch (error) {
        res.status(error.status || 500).json({
            success: false,
            message: error.message,
            data: error.data || {}
        });
    }
});

module.exports = router; 