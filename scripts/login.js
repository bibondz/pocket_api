require('dotenv').config({ path: '.env.node' });
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// เก็บ token ไว้ในไฟล์
const TOKEN_FILE = path.join(__dirname, '.token.json');

async function saveToken(tokenData) {
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokenData, null, 2));
}

async function loadToken() {
    try {
        if (fs.existsSync(TOKEN_FILE)) {
            return JSON.parse(fs.readFileSync(TOKEN_FILE));
        }
    } catch (error) {
        console.error('Error loading token:', error);
    }
    return null;
}

async function refreshToken(token) {
    try {
        const response = await axios.post('https://api.irissar.com/api/collections/users/auth-refresh', {}, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        return response.data;
    } catch (error) {
        console.error('Token refresh failed:', error.response?.data || error.message);
        return null;
    }
}

async function login() {
    try {
        // ลองโหลด token เก่าก่อน
        const savedToken = await loadToken();
        if (savedToken) {
            console.log('\nTrying to refresh existing token...');
            const refreshed = await refreshToken(savedToken.token);
            if (refreshed) {
                await saveToken(refreshed);
                console.log('\n=== Token Refreshed ===');
                console.log('Token:', refreshed.token);
                console.log('\nCopy this token to use in your requests:');
                console.log(`Authorization: Bearer ${refreshed.token}`);
                return;
            }
        }

        // ถ้า refresh ไม่ได้ หรือไม่มี token เก่า ให้ login ใหม่
        console.log('\nPerforming new login...');
        const response = await axios.post('https://api.irissar.com/api/collections/users/auth-with-password', {
            identity: process.env.TEST_EMAIL,
            password: process.env.TEST_PASSWORD
        });

        await saveToken(response.data);
        console.log('\n=== Login Success ===');
        console.log('Token:', response.data.token);
        console.log('\nCopy this token to use in your requests:');
        console.log(`Authorization: Bearer ${response.data.token}`);
        
    } catch (error) {
        console.error('Login failed:', error.response?.data || error.message);
    }
}

// เพิ่มฟังก์ชันสำหรับเช็ค token
async function checkToken() {
    const savedToken = await loadToken();
    if (!savedToken) {
        console.log('No token found. Please login first.');
        return;
    }

    try {
        // ลองเรียก API ที่ต้องใช้ token เพื่อเช็คว่า token ยังใช้ได้อยู่ไหม
        await axios.get('https://api.irissar.com/api/collections/users/records', {
            headers: {
                'Authorization': `Bearer ${savedToken.token}`
            }
        });
        console.log('Token is still valid');
        console.log('\nCurrent token:');
        console.log(`Authorization: Bearer ${savedToken.token}`);
    } catch (error) {
        if (error.response?.status === 401) {
            console.log('Token expired. Trying to refresh...');
            await login(); // จะลองทำ refresh token ให้อัตโนมัติ
        } else {
            console.error('Error checking token:', error.response?.data || error.message);
        }
    }
}

// รับ argument จาก command line
const command = process.argv[2];
if (command === 'check') {
    checkToken();
} else {
    login();
} 