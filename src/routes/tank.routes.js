const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const TankService = require('../services/tank.service');
const crypto = require('crypto');

// Generate device key helper
const generateDeviceKey = () => {
    return crypto.randomBytes(16).toString('hex');
};

// Apply auth middleware to all routes
router.use(authMiddleware);

// Create new tank
router.post('/', async (req, res) => {
    try {
        const tankService = new TankService({
            token: req.pb.authStore.token,
            record: req.user
        });
        const result = await tankService.create(req.body);
        res.json(result);
    } catch (error) {
        res.status(error.status || 500).json({
            success: false,
            message: error.message,
            data: error.data || {}
        });
    }
});

// List tanks
router.get('/', async (req, res) => {
    try {
        const tankService = new TankService({
            token: req.pb.authStore.token,
            record: req.user
        });
        const result = await tankService.list(req.query);
        res.json(result);
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// Get tank by tank_id
router.get('/by-tank-id/:tankId',
    authMiddleware,
    async (req, res) => {
        try {
            const tankService = new TankService({
                token: req.pb.authStore.token,
                record: req.user
            });
            const result = await tankService.getByTankId(req.params.tankId);
            res.json(result);
        } catch (error) {
            res.status(error.status || 404).json({
                success: false,
                message: error.message,
                data: error.data || {}
            });
        }
    }
);

// Update tank by tank_id
router.patch('/by-tank-id/:tankId',
    authMiddleware,
    async (req, res) => {
        try {
            const tankService = new TankService({
                token: req.pb.authStore.token,
                record: req.user
            });
            const result = await tankService.updateByTankId(req.params.tankId, req.body);
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

// Delete tank by tank_id
router.delete('/by-tank-id/:tankId',
    authMiddleware,
    async (req, res) => {
        try {
            const tankService = new TankService({
                token: req.pb.authStore.token,
                record: req.user
            });
            const result = await tankService.deleteByTankId(req.params.tankId);
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

// Update tank progress by tank_id
router.patch('/by-tank-id/:tankId/progress',
    authMiddleware,
    async (req, res) => {
        try {
            const tankService = new TankService({
                token: req.pb.authStore.token,
                record: req.user
            });
            const result = await tankService.updateProgressByTankId(req.params.tankId, req.body.percentage);
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

// Get tank statistics
router.get('/stats/overview',
    authMiddleware,
    async (req, res) => {
        try {
            const tankService = new TankService({
                token: req.pb.authStore.token,
                record: req.user
            });
            const stats = await tankService.getStatistics();
            res.json({
                success: true,
                data: stats
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

// Import tanks
router.post('/import',
    authMiddleware,
    async (req, res) => {
        try {
            const tankService = new TankService({
                token: req.pb.authStore.token,
                record: req.user
            });
            const result = await tankService.importTanks(req.body);
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

// Import tanks from CSV
router.post('/import/csv',
    authMiddleware,
    async (req, res) => {
        try {
            const tankService = new TankService({
                token: req.pb.authStore.token,
                record: req.user
            });
            const result = await tankService.importFromCSV(req.files.file);
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

// Get import history
router.get('/import/history',
    authMiddleware,
    async (req, res) => {
        try {
            const tankService = new TankService({
                token: req.pb.authStore.token,
                record: req.user
            });
            const result = await tankService.getImportHistory();
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

// Transfer tank between departments
router.post('/transfer',
    authMiddleware,
    async (req, res) => {
        try {
            const tankService = new TankService({
                token: req.pb.authStore.token,
                record: req.user
            });
            const result = await tankService.transferTank(
                req.body.tankId,
                req.body.fromDepartmentId,
                req.body.toDepartmentId
            );
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

// Assign tank to department
router.post('/assign',
    authMiddleware,
    async (req, res) => {
        try {
            const tankService = new TankService({
                token: req.pb.authStore.token,
                record: req.user
            });
            const result = await tankService.assignToDepartment(req.body.tank_id, req.body.department_name);
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

// Update tank status
router.patch('/:id/status',
    authMiddleware,
    async (req, res) => {
        try {
            const tankService = new TankService({
                token: req.pb.authStore.token,
                record: req.user
            });
            const result = await tankService.updateStatus(req.params.id, req.body.status);
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

// Batch update tanks
router.patch('/batch/update',
    authMiddleware,
    async (req, res) => {
        try {
            const tankService = new TankService({
                token: req.pb.authStore.token,
                record: req.user
            });
            const result = await tankService.batchUpdate(req.body.ids, req.body.data);
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

// Batch delete tanks
router.delete('/batch/delete',
    authMiddleware,
    async (req, res) => {
        try {
            const tankService = new TankService({
                token: req.pb.authStore.token,
                record: req.user
            });
            const result = await tankService.batchDelete(req.body.ids);
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

// Get import progress
router.get('/import/:importId/progress',
    authMiddleware,
    async (req, res) => {
        try {
            const tankService = new TankService({
                token: req.pb.authStore.token,
                record: req.user
            });
            const result = await tankService.getImportProgress(req.params.importId);
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

// Simple search for tanks
router.get('/search', 
    authMiddleware,
    async (req, res) => {
        try {
            const tankService = new TankService({
                token: req.pb.authStore.token,
                record: req.user
            });

            // Get pagination params
            const page = parseInt(req.query.page) || 1;
            const perPage = parseInt(req.query.perPage) || 50;
            const sort = req.query.sort || '-created';

            // Build search filter from query params
            let filter = [];
            if (req.query.name) {
                filter.push(`name~'${req.query.name}'`);
            }
            if (req.query.id) {
                filter.push(`tank_id~'${req.query.id}'`);
            }
            if (req.query.department) {
                filter.push(`department.name~'${req.query.department}'`);
            }
            if (req.query.status) {
                filter.push(`status='${req.query.status}'`);
            }

            const result = await tankService.list({
                page,
                perPage,
                sort,
                filter: filter.length > 0 ? filter.join('||') : '',
                expand: 'department'
            });

            // Transform response to be more readable
            const simplifiedResults = result.data.items.map(tank => ({
                name: tank.name,
                tank_id: tank.tank_id,
                department: tank.expand?.department?.name || 'Unassigned',
                status: tank.status,
                capacity: tank.capacity,
                current_level: tank.percentage + '%',
                last_updated: tank.updated
            }));

            res.json({
                success: true,
                page: result.data.page,
                perPage: result.data.perPage,
                totalItems: result.data.totalItems,
                totalPages: result.data.totalPages,
                tanks: simplifiedResults
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
);

module.exports = router; 