const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const ApiKeyService = require('../services/api-key.service');

/**
 * List all API keys with pagination, sorting and filtering
 * GET /api-keys
 * Query parameters:
 * - page: Page number (default: 1)
 * - perPage: Items per page (default: 10)
 * - sort: Sort field (default: -created)
 * - search: Search by name
 * - status: Filter by status
 * - department: Filter by department
 */
router.get('/', 
    verifyToken,
    async (req, res) => {
        try {
            const queryParams = {
                page: parseInt(req.query.page) || 1,
                perPage: parseInt(req.query.perPage) || 10,
                sort: req.query.sort || '-created',
                search: req.query.search,
                status: req.query.status,
                department: req.query.department
            };

            const apiKeyService = new ApiKeyService({
                token: req.headers.authorization.split(' ')[1],
                record: req.user
            });

            const result = await apiKeyService.list(queryParams);
            
            // Format response for index view
            res.json({
                success: true,
                data: {
                    items: result.data.items.map(item => ({
                        id: item.id,
                        name: item.name,
                        status: item.status,
                        created: item.created,
                        expires: item.expires,
                        created_by: item.createdByUser ? {
                            name: item.createdByUser.name,
                            email: item.createdByUser.email
                        } : null,
                        department: item.departmentData ? {
                            name: item.departmentData.name
                        } : null,
                        permissions: Object.keys(item.permissions || {}).length
                    })),
                    pagination: result.data.pagination
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

/**
 * Create new API key
 */
router.post('/',
    verifyToken,
    async (req, res) => {
        try {
            const apiKeyService = new ApiKeyService({
                token: req.headers.authorization.split(' ')[1],
                record: req.user
            });
            const apiKey = await apiKeyService.createApiKey(req.body);
            res.json(apiKey);
        } catch (error) {
            res.status(error.status || 500).json({
                code: error.status || 500,
                message: error.message,
                data: error.data || {}
            });
        }
    }
);

/**
 * Get my API keys
 */
router.get('/me', 
    verifyToken,
    async (req, res) => {
        try {
            const apiKeyService = new ApiKeyService({
                token: req.headers.authorization.split(' ')[1],
                record: req.user
            });

            const result = await apiKeyService.list({
                page: 1,
                perPage: 50,
                sort: '-created',
                created_by: req.user.id
            });
            
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
 * Revoke API key
 */
router.patch('/:id/revoke',
    verifyToken,
    async (req, res) => {
        try {
            const apiKeyService = new ApiKeyService({
                token: req.headers.authorization.split(' ')[1],
                record: req.user
            });

            const result = await apiKeyService.revokeApiKey(req.params.id);
            res.json({
                success: true,
                data: result,
                message: 'API key revoked successfully'
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

/**
 * Get API key by ID
 */
router.get('/:id',
    verifyToken,
    async (req, res) => {
        try {
            const apiKeyService = new ApiKeyService({
                token: req.headers.authorization.split(' ')[1],
                record: req.user
            });

            const result = await apiKeyService.getById(req.params.id);
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
 * Update API key
 */
router.patch('/:id',
    verifyToken,
    async (req, res) => {
        try {
            const apiKeyService = new ApiKeyService({
                token: req.headers.authorization.split(' ')[1],
                record: req.user
            });

            const result = await apiKeyService.update(req.params.id, req.body);
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

module.exports = router; 