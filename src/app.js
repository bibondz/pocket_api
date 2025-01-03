const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

// Import routes
const userRoutes = require('./routes/user.routes');
const departmentRoutes = require('./routes/department.routes');
const tankRoutes = require('./routes/tank.routes');
const apiKeyRoutes = require('./routes/api-keys.routes');
const systemRoutes = require('./routes/system.routes');
const adminRoutes = require('./routes/admin');

// Create Express app
const app = express();

// Middleware
app.use(cors({
    origin: ['https://irissar.com', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(morgan('dev'));
app.use(express.json());

// Path normalization middleware
app.use((req, res, next) => {
    // Fix missing slash between app2 and other paths
    if (req.path.startsWith('/app2') && req.path.length > 5) {
        const afterApp2 = req.path.substring(5);  // Get everything after /app2
        if (!afterApp2.startsWith('/')) {
            const query = req.url.slice(req.path.length);
            return res.redirect(301, `/app2/${afterApp2}${query}`);
        }
    }
    next();
});

// Handle trailing slashes
app.use((req, res, next) => {
    if (req.path.substr(-1) === '/' && req.path.length > 1) {
        const query = req.url.slice(req.path.length);
        res.redirect(301, req.path.slice(0, -1) + query);
    } else {
        next();
    }
});

// Debug middleware
app.use((req, res, next) => {
    console.log('\n=== Request ===');
    console.log('Method:', req.method);
    console.log('Path:', req.path);
    console.log('Query:', req.query);
    console.log('Body:', req.body);
    console.log('Headers:', req.headers);
    next();
});

// Routes
app.use('/app2/users', userRoutes);
app.use('/app2/departments', departmentRoutes);
app.use('/app2/tanks', tankRoutes);
app.use('/app2/api-keys', apiKeyRoutes);
app.use('/app2/system', systemRoutes);
app.use('/app2/admin', adminRoutes);

module.exports = app;