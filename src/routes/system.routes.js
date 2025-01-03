const express = require('express');
const router = express.Router();

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

/**
 * System status endpoint
 */
router.get('/status', (req, res) => {
    res.json({ 
        status: 'operational',
        services: {
            pocketbase: true,
            redis: true,
            api: true
        }
    });
});

module.exports = router; 