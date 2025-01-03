const express = require('express');
const DepartmentService = require('../services/department.service');
const { authMiddleware } = require('../middleware/auth.middleware');
const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

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
        res.json(result);
    } catch (error) {
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

// List department tanks
router.get('/:id/tanks', async (req, res) => {
    try {
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

// Simple search for departments
router.get('/search',
    authMiddleware,
    async (req, res) => {
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

            const result = await departmentService.list({
                filter: filter.length > 0 ? filter.join('||') : ''
            });

            // Transform response to be more readable
            const simplifiedResults = result.data.items.map(dept => ({
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
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
);

module.exports = router; 