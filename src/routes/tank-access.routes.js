const express = require('express');
const router = express.Router();
const TankAccessService = require('../services/tank-access.service');
const { authMiddleware } = require('../middleware/auth.middleware');

// Middleware สำหรับ admin และ manager
const adminOrManagerOnly = (req, res, next) => {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
        return res.status(403).json({
            status: 'error',
            message: 'Only admin or manager can access this endpoint'
        });
    }
    next();
};

// ดึงรายการถังที่มีสิทธิ์เข้าถึง
router.get('/my-tanks', authMiddleware, async (req, res) => {
    try {
        const tankAccess = new TankAccessService({
            token: req.pb.authStore.token,
            record: req.user
        });

        const result = await tankAccess.getUserTankAccess(req.user.id);
        res.json(result);
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
});

// ดึงรายการถังที่ user มีสิทธิ์เข้าถึง (สำหรับ admin/manager)
router.get('/user/:userId/tanks', authMiddleware, adminOrManagerOnly, async (req, res) => {
    try {
        const tankAccess = new TankAccessService({
            token: req.pb.authStore.token,
            record: req.user
        });

        const result = await tankAccess.getUserTankAccess(req.params.userId);
        res.json(result);
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
});

// เช็คสิทธิ์การเข้าถึงถัง
router.get('/check/:tankId', authMiddleware, async (req, res) => {
    try {
        const tankAccess = new TankAccessService({
            token: req.pb.authStore.token,
            record: req.user
        });

        const { accessType = 'view' } = req.query;
        const result = await tankAccess.canAccessTank(req.user.id, req.params.tankId, accessType);
        
        res.json({
            success: true,
            data: {
                canAccess: result,
                accessType: accessType
            }
        });
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
});

// ให้สิทธิ์การเข้าถึงถัง
router.post('/grant', authMiddleware, adminOrManagerOnly, async (req, res) => {
    try {
        const tankAccess = new TankAccessService({
            token: req.pb.authStore.token,
            record: req.user
        });

        const { userId, tankId, accessType = 'view' } = req.body;
        const result = await tankAccess.addTankAccess(userId, tankId, accessType);
        res.json(result);
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
});

// ยกเลิกสิทธิ์การเข้าถึงถัง
router.delete('/revoke/:accessId', authMiddleware, adminOrManagerOnly, async (req, res) => {
    try {
        const tankAccess = new TankAccessService({
            token: req.pb.authStore.token,
            record: req.user
        });

        const result = await tankAccess.removeTankAccess(req.params.accessId);
        res.json(result);
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
});

module.exports = router; 