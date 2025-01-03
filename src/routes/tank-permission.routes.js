const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const { TankPermissionService } = require('../services/tank-permission.service');
const TankAssignmentService = require('../services/tank-assignment.service');

// Apply auth middleware to all routes
router.use(authMiddleware);

// List permissions for a tank in a department
router.get('/:departmentId/:tankId', async (req, res) => {
    try {
        const permissionService = new TankPermissionService(req.pb.authStore.token);
        const result = await permissionService.listPermissions(req.params.departmentId, req.params.tankId);
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Update tank permissions for a user
router.put('/:departmentId/:tankId/:userId', async (req, res) => {
    try {
        const permissionService = new TankPermissionService(req.pb.authStore.token);
        const result = await permissionService.updatePermission(
            req.params.departmentId,
            req.params.tankId,
            req.params.userId,
            req.body.permissions
        );
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Revoke tank permissions from a user
router.delete('/:departmentId/:tankId/:userId', async (req, res) => {
    try {
        const permissionService = new TankPermissionService(req.pb.authStore.token);
        const result = await permissionService.revokePermission(
            req.params.departmentId,
            req.params.tankId,
            req.params.userId
        );
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// List all tank permissions for a user
router.get('/user/:userId', async (req, res) => {
    try {
        const permissionService = new TankPermissionService(req.pb.authStore.token);
        const result = await permissionService.listUserPermissions(req.params.userId, req.query);
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Assign tank to operator
router.post('/assign', async (req, res) => {
    try {
        const assignmentService = new TankAssignmentService({
            token: req.pb.authStore.token,
            record: req.auth.record
        });
        const result = await assignmentService.assignTank(
            req.body.tankId,
            req.body.operatorId,
            req.body.departmentId,
            req.body.permissions
        );
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Unassign tank from operator
router.post('/unassign', async (req, res) => {
    try {
        const assignmentService = new TankAssignmentService({
            token: req.pb.authStore.token,
            record: req.auth.record
        });
        const result = await assignmentService.unassignTank(
            req.body.tankId,
            req.body.operatorId,
            req.body.departmentId
        );
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router; 