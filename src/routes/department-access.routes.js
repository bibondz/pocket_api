const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const { DepartmentAccessService } = require('../services/department-access.service');

// Initialize service
const departmentAccessService = new DepartmentAccessService();

// Grant access to department
router.post('/department-access', authMiddleware, async (req, res) => {
    try {
        const { userId, departmentId, accessType } = req.body;
        
        // Check if user has permission to grant access
        if (!req.user.role || req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Only admins can grant department access'
            });
        }

        const result = await departmentAccessService.grantAccess(userId, departmentId, accessType);
        
        res.json({
            success: true,
            message: 'Department access granted successfully',
            data: result
        });
    } catch (error) {
        console.error('Error granting department access:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to grant department access',
            error: error.message
        });
    }
});

// Get user's department access
router.get('/department-access/:userId', authMiddleware, async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Check if user has permission to view access
        if (!req.user.role || (req.user.role !== 'admin' && req.user.id !== userId)) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized to view this information'
            });
        }

        const access = await departmentAccessService.getUserAccess(userId);
        
        res.json({
            success: true,
            data: access
        });
    } catch (error) {
        console.error('Error getting department access:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get department access',
            error: error.message
        });
    }
});

module.exports = router; 