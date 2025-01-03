const PocketBase = require('pocketbase/cjs');

class BaseService {
    constructor({ token, record }) {
        // Make sure URL has http:// prefix
        let pbUrl = process.env.PB_URL || 'localhost:5050';
        if (!pbUrl.startsWith('http://') && !pbUrl.startsWith('https://')) {
            pbUrl = `http://${pbUrl}`;
        }

        this.pb = new PocketBase(pbUrl);
        if (token) {
            this.pb.authStore.save(token, record);
        }
        this.record = record;
        this.isAdmin = record?.role === 'admin';
        this.isManager = record?.role === 'manager';
        this.isOperator = record?.role === 'operator';
    }
}

module.exports = BaseService; 