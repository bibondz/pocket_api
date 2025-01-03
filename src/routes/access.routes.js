const express = require('express');
const router = express.Router();
const AccessControlService = require('../services/access-control.service');
const { authMiddleware } = require('../middleware/auth.middleware');
const { pbMiddleware } = require('../middleware/pb.middleware');

// Middleware ตรวจสอบ admin
const adminOnly = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            status: 'error',
            message: 'Only admin can access this endpoint'
        });
    }
    next();
};

// ดึงข้อมูลการเข้าถึงแผนกของ user
router.get('/department-access/:userId', pbMiddleware, authMiddleware, async (req, res) => {
    try {
        const accessControl = new AccessControlService({
            token: req.pb.authStore.token,
            record: req.user
        });

        // ตรวจสอบสิทธิ์
        if (req.user.role !== 'admin' && req.user.id !== req.params.userId) {
            throw new Error('You can only view your own access');
        }

        const result = await accessControl.getUserDepartmentAccess(req.params.userId);
        res.json(result);
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
});

// เพิ่มสิทธิ์การเข้าถึงแผนก (admin only)
router.post('/department-access', pbMiddleware, authMiddleware, adminOnly, async (req, res) => {
    try {
        const { userId, departmentId, accessType } = req.body;
        
        const accessControl = new AccessControlService({
            token: req.pb.authStore.token,
            record: req.user
        });

        const result = await accessControl.addDepartmentAccess(userId, departmentId, accessType);
        res.json(result);
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
});

// ลบสิทธิ์การเข้าถึงแผนก (admin only)
router.delete('/department-access/:accessId', pbMiddleware, authMiddleware, adminOnly, async (req, res) => {
    try {
        const accessControl = new AccessControlService({
            token: req.pb.authStore.token,
            record: req.user
        });

        const result = await accessControl.removeDepartmentAccess(req.params.accessId);
        res.json(result);
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
});

module.exports = router; 