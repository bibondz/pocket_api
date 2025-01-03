require('dotenv').config();

module.exports = {
    PB_URL: process.env.PB_URL || 'https://api.irissar.com',
    PORT: process.env.PORT || 3000,
    NODE_ENV: process.env.NODE_ENV || 'development'
}; 