const PocketBase = require('pocketbase/cjs');
const { PB_URL } = require('../../config');

class BaseService {
    constructor(authToken = null) {
        this.pb = new PocketBase(PB_URL);
        
        if (authToken) {
            this.pb.authStore.save(authToken);
        }
    }
}

module.exports = BaseService; 