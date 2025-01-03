const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { pbMiddleware } = require('./middlewares/pb.middleware');
const { authMiddleware } = require('./middlewares/auth.middleware');

// Import routes
const authRoutes = require('./routes/auth.routes');
const tankRoutes = require('./routes/tank.routes');
const apiKeyRoutes = require('./routes/api-keys.routes');
const userRoutes = require('./routes/user.routes');
const departmentRoutes = require('./routes/department.routes');

const app = express();

// Middlewares
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/app2/auth', pbMiddleware, authRoutes);
app.use('/app2/tanks', pbMiddleware, tankRoutes);
app.use('/app2/api-keys', pbMiddleware, apiKeyRoutes);
app.use('/app2/users', pbMiddleware, userRoutes);
app.use('/app2/departments', pbMiddleware, departmentRoutes);

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Something broke!',
        data: {
            error: err.message
        }
    });
});

module.exports = app;