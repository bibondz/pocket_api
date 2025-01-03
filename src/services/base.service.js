const PocketBase = require('pocketbase/cjs');

class BaseService {
    constructor({ token = null, record = null } = {}) {
        // Setup PocketBase connection
        let pbUrl = process.env.PB_URL || 'localhost:5050';
        if (!pbUrl.startsWith('http://') && !pbUrl.startsWith('https://')) {
            pbUrl = `http://${pbUrl}`;
        }
        
        this.pb = new PocketBase(pbUrl);
        
        // Setup authentication
        if (token) {
            this.pb.authStore.save(token, record);
        }
        
        // Store user info
        this.record = record || this.pb.authStore.model;
        this.role = this.record?.role || 'none';
        this.department = this.record?.department;
    }

    // Role checks
    get isAdmin() {
        return this.role === 'admin';
    }

    get isManager() {
        return this.role === 'manager';
    }

    get isOperator() {
        return this.role === 'operator';
    }

    // Basic permission checks
    isSelf(userId) {
        return this.record?.id === userId;
    }

    canEdit(userId) {
        return this.isAdmin || this.isSelf(userId);
    }
}

module.exports = BaseService; 