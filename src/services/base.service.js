const PocketBase = require('pocketbase/cjs');

class BaseService {
    constructor({ token = null, record = null } = {}) {
        console.log('BaseService constructor - received record:', record);
        
        // Make sure URL has http:// prefix
        let pbUrl = process.env.PB_URL || 'localhost:5050';
        if (!pbUrl.startsWith('http://') && !pbUrl.startsWith('https://')) {
            pbUrl = `http://${pbUrl}`;
        }
        console.log('PocketBase URL:', pbUrl);
        this.pb = new PocketBase(pbUrl);
        
        if (token) {
            this.pb.authStore.save(token, record);
        }
        
        // Use the actual user record without modifying the role
        this.record = record || this.pb.authStore.model;
        
        console.log('BaseService constructor - final record:', this.record);
    }

    get isAdmin() {
        return this.record?.role === 'admin';
    }

    get isManager() {
        return this.record?.role === 'manager';
    }

    get isOperator() {
        return this.record?.role === 'operator';
    }
}

module.exports = BaseService; 