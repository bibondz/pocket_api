const express = require('express');
const router = express.Router();
const AdminService = require('../services/admin.service');
const TankService = require('../services/tank.service');
const { verifyToken } = require('../middleware/auth');

// Admin routes
router.post('/users', verifyToken, async (req, res) => {
    try {
        const userData = req.body;
        console.log('Creating user with data:', userData);
        
        const adminService = new AdminService(req.token);
        const user = await adminService.createUser(userData);
        res.status(201).json({
            status: 'success',
            data: user
        });
    } catch (error) {
        console.error('Error in create user route:', error);
        res.status(error.status || 500).json({
            status: 'error',
            message: error.message || 'Failed to create user',
            details: error.data
        });
    }
});

router.get('/users', verifyToken, async (req, res) => {
    try {
        const adminService = new AdminService(req.token);
        const users = await adminService.listUsers();
        res.json(users);
    } catch (error) {
        res.status(error.status || 500).json({ error: error.message });
    }
});

router.get('/users/:id', verifyToken, async (req, res) => {
    try {
        const adminService = new AdminService(req.token);
        const user = await adminService.getUser(req.params.id);
        res.json(user);
    } catch (error) {
        res.status(error.status || 500).json({ error: error.message });
    }
});

router.patch('/users/:id', verifyToken, async (req, res) => {
    try {
        const adminService = new AdminService(req.token);
        const result = await adminService.updateUser(req.params.id, req.body);
        res.json(result);
    } catch (error) {
        res.status(error.status || 500).json({ error: error.message });
    }
});

router.delete('/users/:id', verifyToken, async (req, res) => {
    try {
        const adminService = new AdminService(req.token);
        await adminService.deleteUser(req.params.id);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(error.status || 500).json({ error: error.message });
    }
});

// Admin department management
router.post('/departments', verifyToken, async (req, res) => {
    try {
        const adminService = new AdminService(req.token);
        const result = await adminService.createDepartment(req.body);
        res.json(result);
    } catch (error) {
        res.status(error.status || 500).json({ error: error.message });
    }
});

router.get('/departments', verifyToken, async (req, res) => {
    try {
        const adminService = new AdminService(req.token);
        const departments = await adminService.listDepartments();
        res.json(departments);
    } catch (error) {
        res.status(error.status || 500).json({ error: error.message });
    }
});

router.get('/departments/:id', verifyToken, async (req, res) => {
    try {
        const adminService = new AdminService(req.token);
        const department = await adminService.getDepartment(req.params.id);
        res.json(department);
    } catch (error) {
        res.status(error.status || 500).json({ error: error.message });
    }
});

router.patch('/departments/:id', verifyToken, async (req, res) => {
    try {
        const adminService = new AdminService(req.token);
        const result = await adminService.updateDepartment(req.params.id, req.body);
        res.json(result);
    } catch (error) {
        res.status(error.status || 500).json({ error: error.message });
    }
});

router.delete('/departments/:id', verifyToken, async (req, res) => {
    try {
        const adminService = new AdminService(req.token);
        await adminService.deleteDepartment(req.params.id);
        res.json({ message: 'Department deleted successfully' });
    } catch (error) {
        res.status(error.status || 500).json({ error: error.message });
    }
});

// Admin tank management
router.post('/tanks', verifyToken, async (req, res) => {
    try {
        const tankService = new TankService(req.token);
        const result = await tankService.createTank(req.body);
        res.json(result);
    } catch (error) {
        res.status(error.status || 500).json({ error: error.message });
    }
});

router.get('/tanks', verifyToken, async (req, res) => {
    try {
        const tankService = new TankService(req.token);
        const { status, sort = '-created' } = req.query;
        
        const filter = {};
        if (status) {
            filter.status = status;
        }
        
        const tanks = await tankService.listTanks(filter, sort);
        res.json(tanks);
    } catch (error) {
        res.status(error.status || 500).json({ error: error.message });
    }
});

router.get('/tanks/:id', verifyToken, async (req, res) => {
    try {
        const tankService = new TankService(req.token);
        const tank = await tankService.getTank(req.params.id);
        res.json(tank);
    } catch (error) {
        res.status(error.status || 500).json({ error: error.message });
    }
});

router.patch('/tanks/:id', verifyToken, async (req, res) => {
    try {
        const tankService = new TankService(req.token);
        const result = await tankService.updateTank(req.params.id, req.body);
        res.json(result);
    } catch (error) {
        res.status(error.status || 500).json({ error: error.message });
    }
});

router.delete('/tanks/:id', verifyToken, async (req, res) => {
    try {
        const tankService = new TankService(req.token);
        await tankService.deleteTank(req.params.id);
        res.json({ message: 'Tank deleted successfully' });
    } catch (error) {
        res.status(error.status || 500).json({ error: error.message });
    }
});

module.exports = router; 