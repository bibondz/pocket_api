const express = require('express');
const router = express.Router();
const ApiKeyService = require('../services/api-key.service');
const { authMiddleware } = require('../middleware/auth.middleware');

// Apply auth middleware to all routes
router.use(authMiddleware);

// GET route - allow all roles to read
router.get('/', async (req, res) => {
    try {
        const service = new ApiKeyService({
            token: req.pb.authStore.token,
            record: req.user
        });
        const result = await service.list(req.query);
        res.json(result);
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// Middleware for write operations - only admin and manager
const checkWritePermission = (req, res, next) => {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
        return res.status(403).json({
            success: false,
            message: 'Only admin or manager can modify API keys'
        });
    }
    next();
};

// Write operations require admin or manager role
router.post('/', checkWritePermission, async (req, res) => {
    try {
        const service = new ApiKeyService({
            token: req.pb.authStore.token,
            record: req.user
        });
        const result = await service.generateKey(req.body);
        res.json(result);
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

router.delete('/:id', checkWritePermission, async (req, res) => {
    try {
        const service = new ApiKeyService({
            token: req.pb.authStore.token,
            record: req.user
        });
        const result = await service.delete(req.params.id);
        res.json(result);
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

router.patch('/:id', checkWritePermission, async (req, res) => {
    try {
        const service = new ApiKeyService({
            token: req.pb.authStore.token,
            record: req.user
        });
        const result = await service.update(req.params.id, req.body);
        res.json(result);
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;