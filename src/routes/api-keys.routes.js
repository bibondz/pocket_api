const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const ApiKeyService = require('../services/api-key.service');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Create API key
router.post('/', async (req, res) => {
    try {
        const apiKeyService = new ApiKeyService({
            token: req.pb.authStore.token,
            record: req.user
        });

        const apiKey = await apiKeyService.createApiKey({
            ...req.body,
            record: req.user
        });
        res.json({ success: true, data: apiKey });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// List API keys
router.get('/', async (req, res) => {
    try {
        const apiKeyService = new ApiKeyService({
            token: req.pb.authStore.token,
            record: req.user
        });

        const result = await apiKeyService.list(req.query);
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get API key by ID
router.get('/:id', async (req, res) => {
    try {
        const apiKeyService = new ApiKeyService({
            token: req.pb.authStore.token,
            record: req.user
        });

        const result = await apiKeyService.getById(req.params.id);
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Update API key
router.patch('/:id', async (req, res) => {
    try {
        const apiKeyService = new ApiKeyService({
            token: req.pb.authStore.token,
            record: req.user
        });

        const result = await apiKeyService.update(req.params.id, req.body);
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Revoke API key
router.patch('/:id/revoke', async (req, res) => {
    try {
        const apiKeyService = new ApiKeyService({
            token: req.pb.authStore.token,
            record: req.user
        });

        const result = await apiKeyService.revoke(req.params.id);
        res.json({
            success: true,
            data: result,
            message: 'API key revoked successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router; 