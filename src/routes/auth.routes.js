const express = require('express');
const router = express.Router();
const PBAuthService = require('../services/pb-auth.service');
const PocketBase = require('pocketbase/cjs');

/**
 * Authentication Routes
 * 
 * These routes handle user authentication and should NOT use any middleware
 * because they need to be publicly accessible.
 * 
 * Available routes:
 * - POST /register - Create new user account
 * - POST /login - Authenticate user and get token
 * - POST /request-password-reset - Request password reset email
 * - POST /confirm-password-reset - Confirm and reset password with token
 */

router.post('/register', async (req, res) => {
    try {
        console.log('Register request:', req.body);

        const authService = new PBAuthService();

        // Handle department by name or ID
        let departmentId = null;
        if (req.body.department) {
            try {
                // Get all departments
                const departments = await authService.pb.collection('departments').getFullList();
                
                // Try to find department by ID first
                const deptById = departments.find(d => d.id === req.body.department);
                if (deptById) {
                    departmentId = req.body.department;
                } else {
                    // If not found by ID, try to find by name
                    const deptByName = departments.find(d => d.name === req.body.department);
                    if (deptByName) {
                        departmentId = deptByName.id;
                    } else {
                        return res.status(400).json({
                            success: false,
                            message: `แผนก ${req.body.department} ไม่มีในระบบ แผนกที่มีคือ: ${departments.map(d => d.name).join(', ')}`
                        });
                    }
                }
            } catch (error) {
                console.error('Error finding department:', error);
                return res.status(400).json({
                    success: false,
                    message: 'เกิดข้อผิดพลาดในการค้นหาแผนก'
                });
            }
        }

        // Set department ID and emailVisibility
        req.body.department = departmentId;
        req.body.emailVisibility = true;

        const result = await authService.register(req.body);
        
        if (!result.success) {
            return res.status(400).json(result);
        }

        // If department is set, create department_user_access record
        if (departmentId) {
            try {
                await authService.pb.collection('department_user_access').create({
                    user: result.user.id,
                    department: departmentId,
                    role: req.body.role || 'operator',
                    tank_permissions: {}
                });
            } catch (error) {
                console.error('Error creating department access:', error);
                // Don't return error since user is already created
            }
        }

        res.status(201).json(result);
    } catch (error) {
        console.error('Registration error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Registration failed'
        });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { identity, password } = req.body;
        console.log('Login attempt:', { identity });

        if (!identity || !password) {
            return res.status(400).json({
                success: false,
                message: 'กรุณากรอก email และรหัสผ่าน'
            });
        }

        const authService = new PBAuthService();
        console.log('Created auth service');

        const result = await authService.auth(identity, password);
        console.log('Auth result:', result);

        if (!result.success) {
            return res.status(401).json(result);
        }

        res.json(result);
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

router.post('/request-password-reset', async (req, res) => {
    try {
        const { email } = req.body;
        const authService = new PBAuthService();
        const result = await authService.requestPasswordReset(email);

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json(result);
    } catch (error) {
        console.error('Password reset request error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์'
        });
    }
});

router.post('/confirm-password-reset', async (req, res) => {
    try {
        const { token, password, passwordConfirm } = req.body;
        const authService = new PBAuthService();
        const result = await authService.confirmPasswordReset(token, password, passwordConfirm);

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json(result);
    } catch (error) {
        console.error('Password reset confirmation error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์'
        });
    }
});

router.post('/refresh', async (req, res) => {
    try {
        const authService = new PBAuthService();
        
        // Try to refresh the token
        const result = await authService.refreshToken();
        
        if (!result.success) {
            return res.status(401).json(result);
        }

        res.json(result);
    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์'
        });
    }
});

// Note: Any routes that require authentication should be in a separate router
// with proper middleware

module.exports = router; 