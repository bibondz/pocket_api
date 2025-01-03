const express = require('express');
const router = express.Router();
const DepartmentService = require('../services/department.service');
const { authMiddleware } = require('../middleware/auth.middleware');

// Middleware สำหรับ admin only
const adminOnly = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            status: 'error',
            message: 'Only admin can access this endpoint'
        });
    }
    next();
};

// ดึงรายการแผนกทั้งหมด (ตามสิทธิ์)
router.get('/', authMiddleware, async (req, res) => {
    try {
        const departmentService = new DepartmentService({
            token: req.pb.authStore.token,
            record: req.user
        });

        const result = await departmentService.list();
        res.json(result);
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
});

// ดึงข้อมูลแผนกเดียว
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const departmentService = new DepartmentService({
            token: req.pb.authStore.token,
            record: req.user
        });

        const result = await departmentService.getById(req.params.id);
        res.json(result);
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
});

// สร้างแผนกใหม่ (admin only)
router.post('/', authMiddleware, adminOnly, async (req, res) => {
    try {
        const departmentService = new DepartmentService({
            token: req.pb.authStore.token,
            record: req.user
        });

        const result = await departmentService.create(req.body);
        res.status(201).json(result);
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
});

// อัพเดทแผนก (admin only)
router.patch('/:id', authMiddleware, adminOnly, async (req, res) => {
    try {
        const departmentService = new DepartmentService({
            token: req.pb.authStore.token,
            record: req.user
        });

        const result = await departmentService.update(req.params.id, req.body);
        res.json(result);
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
});

// เพิ่มผู้จัดการแผนก (admin only)
router.post('/:id/managers', authMiddleware, adminOnly, async (req, res) => {
    try {
        const departmentService = new DepartmentService({
            token: req.pb.authStore.token,
            record: req.user
        });

        const { userId } = req.body;
        if (!userId) {
            throw new Error('User ID is required');
        }

        const result = await departmentService.addManager(req.params.id, userId);
        res.json(result);
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
});

// ลบผู้จัดการแผนก (admin only)
router.delete('/:id/managers/:userId', authMiddleware, adminOnly, async (req, res) => {
    try {
        const departmentService = new DepartmentService({
            token: req.pb.authStore.token,
            record: req.user
        });

        const result = await departmentService.removeManager(req.params.id, req.params.userId);
        res.json(result);
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
});

// ลบแผนก (admin only)
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
    try {
        const departmentService = new DepartmentService({
            token: req.pb.authStore.token,
            record: req.user
        });

        const result = await departmentService.delete(req.params.id);
        res.json(result);
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
});

// ดึงรายชื่อ users ในแผนก
router.get('/:id/users', authMiddleware, async (req, res) => {
    try {
        const departmentService = new DepartmentService({
            token: req.pb.authStore.token,
            record: req.user
        });

        const result = await departmentService.getUsers(req.params.id);
        res.json(result);
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
});

// ดึงรายการ tanks ในแผนก
router.get('/:id/tanks', authMiddleware, async (req, res) => {
    try {
        const departmentService = new DepartmentService({
            token: req.pb.authStore.token,
            record: req.user
        });

        const result = await departmentService.getTanks(req.params.id);
        res.json(result);
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
});

module.exports = router; 