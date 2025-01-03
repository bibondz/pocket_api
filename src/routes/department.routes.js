const express = require('express');
const PocketBase = require('pocketbase/cjs');
const { PB_URL } = require('../../config');
const DepartmentService = require('../services/department.service');
const { authMiddleware } = require('../middleware/auth.middleware');
const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// List tanks (filtered by user permissions)
router.get('/tanks', async (req, res) => {
    try {
        const departmentService = new DepartmentService({
            token: req.pb.authStore.token,
            record: req.user
        });
        
        // If department is specified in query params, use that
        const departmentFilter = req.query.department;
        const result = await departmentService.listDepartmentTanks(departmentFilter);
        res.json(result);
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// List departments
router.get('/', async (req, res) => {
    try {
        const { page = 1, perPage = 50, filter = '', sort = '-created', search = '' } = req.query;
        console.log('List departments request:', { page, perPage, filter, sort, search });
        console.log('Auth token:', req.pb.authStore.token);
        console.log('User:', req.user);
        
        const departmentService = new DepartmentService({
            token: req.pb.authStore.token,
            record: req.user
        });
        const result = await departmentService.listDepartments(
            parseInt(page),
            parseInt(perPage),
            filter,
            sort,
            search
        );
        console.log('List departments response:', result);
        res.json(result);
    } catch (error) {
        console.error('List departments error:', error);
        res.status(400).json({
            success: false,
            message: error.message,
            details: error.stack
        });
    }
});

// Create department
router.post('/', async (req, res) => {
    try {
        const departmentService = new DepartmentService({
            token: req.pb.authStore.token,
            record: req.user
        });
        const result = await departmentService.createDepartment(req.body);
        if (!result.success) {
            return res.status(400).json(result);
        }
        res.json(result);
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// Simple search for departments
router.get('/search', async (req, res) => {
    try {
        const departmentService = new DepartmentService({
            token: req.pb.authStore.token,
            record: req.user
        });

        // Build search filter from query params
        let filter = [];
        if (req.query.name) {
            filter.push(`name~'${req.query.name}'`);
        }
        if (req.query.location) {
            filter.push(`location~'${req.query.location}'`);
        }

        console.log('Search filter:', filter);
        const result = await departmentService.listDepartments(
            1, // page
            50, // perPage
            filter.length > 0 ? filter.join('||') : '', // filter
            '-created', // sort
            req.query.q || '' // search
        );
        console.log('Search result:', JSON.stringify(result, null, 2));

        // Transform response to be more readable
        const simplifiedResults = result.data.items.map(dept => ({
            id: dept.id,
            name: dept.name,
            location: dept.location,
            description: dept.description,
            created: dept.created,
            last_updated: dept.updated
        }));

        res.json({
            success: true,
            total: result.data.totalItems,
            departments: simplifiedResults
        });
    } catch (error) {
        console.error('Search error:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// Get department by ID
router.get('/:id', async (req, res) => {
    try {
        const departmentService = new DepartmentService({
            token: req.pb.authStore.token,
            record: req.user
        });
        const result = await departmentService.getDepartment(req.params.id);
        res.json(result);
    } catch (error) {
        res.status(404).json({
            success: false,
            message: error.message
        });
    }
});

// Update department
router.patch('/:id', async (req, res) => {
    try {
        const departmentService = new DepartmentService({
            token: req.pb.authStore.token,
            record: req.user
        });
        const result = await departmentService.updateDepartment(req.params.id, req.body);
        res.json(result);
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// Delete department
router.delete('/:id', async (req, res) => {
    try {
        const departmentService = new DepartmentService({
            token: req.pb.authStore.token,
            record: req.user
        });
        const result = await departmentService.deleteDepartment(req.params.id);
        res.json(result);
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// List department members
router.get('/:id/members', async (req, res) => {
    try {
        const departmentService = new DepartmentService({
            token: req.pb.authStore.token,
            record: req.user
        });
        const result = await departmentService.listDepartmentMembers(req.params.id);
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// Add department member
router.post('/:id/members', authMiddleware, async (req, res) => {
    try {
        const departmentService = new DepartmentService({
            token: req.pb.authStore.token,
            record: req.user
        });
        const result = await departmentService.addDepartmentMember(req.params.id, req.body);
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// Update department member
router.patch('/:id/members/:userId', async (req, res) => {
    try {
        const departmentService = new DepartmentService({
            token: req.pb.authStore.token,
            record: req.user
        });
        const result = await departmentService.updateDepartmentMember(req.params.id, req.params.userId, req.body);
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// Remove department member
router.delete('/:id/members/:userId', async (req, res) => {
    try {
        const departmentService = new DepartmentService({
            token: req.pb.authStore.token,
            record: req.user
        });
        const result = await departmentService.removeDepartmentMember(req.params.id, req.params.userId);
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// List department tanks
router.get('/:id/tanks', async (req, res) => {
    try {
        if (!req.params.id) {
            return res.status(400).json({
                success: false,
                message: 'Department ID is required'
            });
        }

        const departmentService = new DepartmentService({
            token: req.pb.authStore.token,
            record: req.user
        });
        const result = await departmentService.listDepartmentTanks(req.params.id);
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// Remove tank from department
router.delete('/:id/tanks/:tankId', authMiddleware, async (req, res) => {
    try {
        const departmentService = new DepartmentService({
            token: req.pb.authStore.token,
            record: req.user
        });
        const result = await departmentService.removeTank(req.params.id, req.params.tankId);
        res.json(result);
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// Add tank to department
router.post('/:id/tanks', async (req, res) => {
    try {
        const departmentService = new DepartmentService({
            token: req.pb.authStore.token,
            record: req.user
        });

        const result = await departmentService.addTank(req.params.id, req.body.tank_id);
        
        res.json(result);
    } catch (error) {
        console.error('Failed to add tank:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router; 