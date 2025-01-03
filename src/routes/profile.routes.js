const express = require('express');
const router = express.Router();
const PBAuthService = require('../services/pb-auth.service');
const { authMiddleware } = require('../middleware/auth.middleware');

/**
 * User Profile Management Routes
 * 
 * These routes handle user profile operations and MUST use authentication middleware
 * because they deal with user-specific data.
 * 
 * Available routes:
 * - POST /request-email-change - Request to change email address
 */

router.use(authMiddleware);

router.post('/request-email-change', async (req, res) => {
    try {
        const { newEmail } = req.body;
        const authService = new PBAuthService(req.pb);
        const result = await authService.requestEmailChange(newEmail);

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json(result);
    } catch (error) {
        console.error('Email change request error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์'
        });
    }
});

module.exports = router; 