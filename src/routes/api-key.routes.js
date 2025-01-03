const express = require('express');
const router = express.Router();
const ApiKeyService = require('../services/api-key.service');
const { authMiddleware } = require('../middleware/auth.middleware');

router.post('/', authMiddleware, async (req, res) => {
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

router.get('/', authMiddleware, async (req, res) => {
    try {
        const service = new ApiKeyService(req.pb);
        const result = await service.list(req.query);
        res.json(result);
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const service = new ApiKeyService(req.pb);
        const result = await service.delete(req.params.id);
        res.json(result);
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

router.patch('/:id', authMiddleware, async (req, res) => {
    try {
        const service = new ApiKeyService(req.pb);
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