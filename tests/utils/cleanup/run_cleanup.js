const cleanup = require('./cleanup');
const axios = require('axios');
const { PB_URL } = require('../config');

async function main() {
    try {
        const login = await axios.post(`${PB_URL}/api/collections/users/auth-with-password`, {
            identity: 'admin@example.com',
            password: 'TestUser@2024'
        });
        await cleanup(login.data.token);
    } catch (error) {
        console.error('Failed:', error.response?.data || error.message);
    }
}

main(); 