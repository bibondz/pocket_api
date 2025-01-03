const BaseService = require('./base.service');
const crypto = require('crypto');

class ApiKeyService extends BaseService {
    async generateKey(data) {
        try {
            if (!this.record) {
                throw new Error('Authentication required');
            }

            // Validate required fields
            if (!data.name) {
                throw new Error('Name is required');
            }
            if (!data.expires_at) {
                throw new Error('Expiration date is required');
            }
            if (!data.permissions) {
                throw new Error('Permissions are required');
            }

            // Generate random key
            const apiKey = crypto.randomBytes(32).toString('hex');

            // Create API key record
            const keyData = {
                name: data.name,
                key: apiKey,
                expires_at: data.expires_at,
                permissions: data.permissions,
                status: 'active',
                created_by: this.record.id,
                last_used: null
            };

            const record = await this.pb.collection('api_keys').create(keyData);

            return {
                success: true,
                data: {
                    ...record,
                    key: apiKey // Include plain key only in response
                }
            };
        } catch (error) {
            console.error('Generate API key error:', error);
            throw error;
        }
    }

    async list(query = {}) {
        try {
            let filter = 'created >= "2000-01-01 00:00:00"';
            
            if (query.status) {
                filter += ` && status = "${query.status}"`;
            }
            if (query.search) {
                filter += ` && name ~ "${query.search}"`;
            }

            const records = await this.pb.collection('api_keys').getList(1, 50, {
                filter,
                sort: '-created',
                fields: 'id,name,key,expires_at,status,last_used'
            });

            return {
                success: true,
                data: records
            };
        } catch (error) {
            console.error('List API keys error:', error);
            throw error;
        }
    }

    async delete(id) {
        try {
            if (!this.record) {
                throw new Error('Authentication required');
            }

            await this.pb.collection('api_keys').delete(id);
            return {
                success: true,
                message: 'API key deleted successfully'
            };
        } catch (error) {
            console.error('Delete API key error:', error);
            throw error;
        }
    }

    async update(id, data) {
        try {
            if (!this.record) {
                throw new Error('Authentication required');
            }

            // ไม่อนุญาตให้แก้ไข key
            delete data.key;

            const record = await this.pb.collection('api_keys').update(id, data);
            return {
                success: true,
                data: record
            };
        } catch (error) {
            console.error('Update API key error:', error);
            throw error;
        }
    }

    async checkExpiringKeys() {
        try {
            const now = new Date();
            
            const activeKeys = await this.pb.collection('api_keys').getFullList({
                filter: `status = "active"`
            });

            for (const key of activeKeys) {
                const expiresAt = new Date(key.expires_at);
                const timeLeft = expiresAt - now;
                const hoursLeft = timeLeft / (1000 * 60 * 60);

                if (timeLeft <= 0) {
                    await this.pb.collection('api_keys').update(key.id, {
                        status: 'revoked'
                    });
                    continue;
                }

                if (hoursLeft <= 24) {
                    const nextCheckInterval = Math.floor(hoursLeft / 3);
                    console.log(`Key ${key.name} expires in ${hoursLeft.toFixed(1)} hours. Will check again in ${nextCheckInterval} hours`);
                }
            }

            return {
                success: true,
                message: `Checked ${activeKeys.length} active keys`
            };
        } catch (error) {
            console.error('Check expiring keys error:', error);
            throw error;
        }
    }
}

module.exports = ApiKeyService; 