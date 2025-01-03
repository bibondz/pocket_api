const PocketBase = require('pocketbase/cjs');
const { PB_URL } = require('../../config');

class AuthService {
    constructor() {
        this.pb = new PocketBase(PB_URL);
    }

    async login(email, password) {
        try {
            const authData = await this.pb.collection('users').authWithPassword(email, password);
            return {
                success: true,
                data: {
                    token: this.pb.authStore.token,
                    user: authData.record
                }
            };
        } catch (error) {
            console.error('Login error:', error);
            throw {
                success: false,
                message: error.message || 'Failed to login',
                error: error
            };
        }
    }

    async adminLogin() {
        try {
            await this.pb.admins.authWithPassword(
                process.env.POCKETBASE_SUPER_ADMIN_EMAIL,
                process.env.POCKETBASE_SUPER_ADMIN_PASSWORD
            );
            return {
                success: true,
                data: {
                    token: this.pb.authStore.token
                }
            };
        } catch (error) {
            console.error('Admin login error:', error);
            throw {
                success: false,
                message: error.message || 'Failed to login as admin',
                error: error
            };
        }
    }

    isValid() {
        return this.pb.authStore.isValid;
    }

    getToken() {
        return this.pb.authStore.token;
    }

    logout() {
        this.pb.authStore.clear();
    }
}

module.exports = AuthService; 