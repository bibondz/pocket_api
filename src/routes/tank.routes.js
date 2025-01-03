const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const TankService = require('../services/tank.service');
const crypto = require('crypto');

// Generate device key helper
const generateDeviceKey = () => {
    return crypto.randomBytes(16).toString('hex');
};

// List tanks
router.get('/', authMiddleware, async (req, res) => {
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

// Create tank
router.post('/', authMiddleware, async (req, res) => {
    try {
        const tankService = new TankService({
            token: req.pb.authStore.token,
            record: req.user
        });
        const result = await tankService.create(req.body);
        res.json(result);
    } catch (error) {
        res.status(error.status || 400).json({
            success: false,
            message: error.message,
            data: error.data || {}
        });
    }
});

// Get tank statistics
router.get('/stats/overview', authMiddleware, async (req, res) => {
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
});

// Get tank by tank_id
router.get('/by-tank-id/:tankId', authMiddleware, async (req, res) => {
    try {
        const tankService = new TankService({
            token: req.pb.authStore.token,
            record: req.user
        });
        const result = await tankService.getByTankId(req.params.tankId);
        res.json(result);
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// Update tank by tank_id
router.patch('/by-tank-id/:tank_id', authMiddleware, async (req, res) => {
    try {
        const tankService = new TankService({
            token: req.pb.authStore.token,
            record: req.user
        });

        // Get tank by tank_id first
        const tank = await tankService.pb.collection('tanks').getFirstListItem(`tank_id = "${req.params.tank_id}"`).catch(() => null);
        if (!tank) {
            return res.status(404).json({
                success: false,
                message: `Tank with ID ${req.params.tank_id} not found`
            });
        }

        // Log the update attempt
        console.log('Updating tank:', {
            tank_id: req.params.tank_id,
            current_data: tank,
            update_data: req.body
        });

        // Update tank using its ID
        const result = await tankService.updateTank(tank.id, req.body);
        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json(result);
    } catch (error) {
        console.error('Failed to update tank:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to update tank',
            details: error.response?.data || {}
        });
    }
});

// Update tank status by tank_id
router.patch('/by-tank-id/:tankId/status', authMiddleware, async (req, res) => {
    try {
        const tankService = new TankService({
            token: req.pb.authStore.token,
            record: req.user
        });
        const result = await tankService.updateStatusByTankId(req.params.tankId, req.body.status);
        res.json(result);
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// Update tank progress by tank_id
router.patch('/by-tank-id/:tankId/progress', authMiddleware, async (req, res) => {
    try {
        const tankService = new TankService({
            token: req.pb.authStore.token,
            record: req.user
        });
        const result = await tankService.updateProgressByTankId(req.params.tankId, req.body);
        res.json(result);
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// Delete tank by tank_id
router.delete('/by-tank-id/:tankId', authMiddleware, async (req, res) => {
    try {
        console.log('Full user data for delete:', req.user);
        
        const tankService = new TankService({
            token: req.pb.authStore.token,
            record: req.user
        });
        
        const result = await tankService.deleteByTankId(req.params.tankId);
        res.json(result);
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// Get tank by ID (UUID)
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const tankService = new TankService({
            token: req.pb.authStore.token,
            record: req.user
        });
        const result = await tankService.get(req.params.id);
        res.json(result);
    } catch (error) {
        res.status(error.status || 404).json({
            success: false,
            message: error.message,
            data: error.data || {}
        });
    }
});

// Assign tank to department
router.post('/assign', authMiddleware, async (req, res) => {
    try {
        const tankService = new TankService({
            token: req.pb.authStore.token,
            record: req.user
        });

        const { tank_id, departmentName } = req.body;
        if (!tank_id || !departmentName) {
            return res.status(400).json({
                success: false,
                message: 'tank_id and departmentName are required'
            });
        }

        const result = await tankService.assignTankByDepartmentName(tank_id, departmentName);
        if (!result.success) {
            return res.status(400).json(result);
        }
        
        res.json(result);
    } catch (error) {
        console.error('Failed to assign tank:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Unassign tank from department
router.post('/unassign', authMiddleware, async (req, res) => {
    try {
        const tankService = new TankService({
            token: req.pb.authStore.token,
            record: req.user
        });
        const result = await tankService.unassignTankFromDepartment(req.body.tank_id);
        res.json(result);
    } catch (error) {
        res.status(error.status || 500).json({
            success: false,
            message: error.message,
            data: error.data || {}
        });
    }
});

// Update tank by ID (UUID)
router.patch('/:id', authMiddleware, async (req, res) => {
    try {
        const tankService = new TankService({
            token: req.pb.authStore.token,
            record: req.user
        });

        // Log the update attempt
        console.log('Updating tank by UUID:', {
            id: req.params.id,
            update_data: req.body
        });

        // Update tank using UUID
        const result = await tankService.updateTank(req.params.id, req.body);
        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json(result);
    } catch (error) {
        console.error('Failed to update tank:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to update tank',
            details: error.response?.data || {}
        });
    }
});

module.exports = router; 