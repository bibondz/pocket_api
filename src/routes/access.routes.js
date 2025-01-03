const express = require('express');
const router = express.Router();
const AccessService = require('../services/access.service');
const { authMiddleware } = require('../middleware/auth.middleware');

// Create tank group
router.post('/groups', authMiddleware, async (req, res) => {
    try {
        const { departmentId, name, permissions, tanks } = req.body;
        if (!departmentId || !name || !permissions) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        const accessService = new AccessService({ token: req.token });
        const result = await accessService.createTankGroup(departmentId, {
            name,
            permissions,
            tanks
        });

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json(result);
    } catch (error) {
        console.error('Failed to create tank group:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Check tank access
router.get('/check', authMiddleware, async (req, res) => {
    try {
        const { userId, tankId } = req.query;
        if (!userId || !tankId) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        const accessService = new AccessService({ token: req.token });
        const result = await accessService.checkUserTankAccess(userId, tankId);

        if (!result.success) {
            return res.status(403).json(result);
        }

        res.json(result);
    } catch (error) {
        console.error('Failed to check tank access:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Bulk assign tanks to group
router.post('/groups/assign', authMiddleware, async (req, res) => {
    try {
        const { departmentId, groupName, tankIds } = req.body;
        if (!departmentId || !groupName || !tankIds) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        const accessService = new AccessService({ token: req.token });
        const result = await accessService.bulkAssignTanksToGroup(
            departmentId,
            groupName,
            tankIds
        );

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json(result);
    } catch (error) {
        console.error('Failed to assign tanks to group:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Set default permissions
router.post('/default', authMiddleware, async (req, res) => {
    try {
        const { departmentId, permissions } = req.body;
        if (!departmentId || !permissions) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        const accessService = new AccessService({ token: req.token });
        const result = await accessService.setDefaultPermissions(
            departmentId,
            permissions
        );

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json(result);
    } catch (error) {
        console.error('Failed to set default permissions:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Add tank exception
router.post('/exceptions', authMiddleware, async (req, res) => {
    try {
        const { departmentId, tankId, permissions } = req.body;
        if (!departmentId || !tankId || !permissions) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        const accessService = new AccessService({ token: req.token });
        const result = await accessService.addTankException(
            departmentId,
            tankId,
            permissions
        );

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json(result);
    } catch (error) {
        console.error('Failed to add tank exception:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router; 