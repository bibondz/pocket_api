const BaseService = require('./base.service');
const crypto = require('crypto');

class ApiKeyService extends BaseService {
    constructor({ token, record }) {
        super();
        this.token = token;
        this.user = record;
    }

    async generateKey(data) {
        if (!data.name) {
            throw new Error('Name is required');
        }
        if (!data.expires_at) {
            throw new Error('Expiration date is required');
        }
        if (!data.permissions) {
            throw new Error('Permissions are required (read/write)');
        }

        // If manager, ensure they can only create keys for their department
        if (this.user.role === 'manager') {
            if (!this.user.department) {
                throw new Error('Manager must be assigned to a department');
            }
            data.department = this.user.department;
        }

        // Generate random API key
        const apiKey = crypto.randomBytes(32).toString('hex');

        // Create API key record
        const result = await this.pb.collection('api_keys').create({
            ...data,
            key: apiKey,
            user: this.user.id,
            status: 'active',
            last_used: null
        });

        return {
            success: true,
            data: {
                ...result,
                key: apiKey // Include the API key in response
            }
        };
    }

    async list(options = {}) {
        let filter = '';

        // If manager, only list keys from their department
        if (this.user.role === 'manager') {
            if (!this.user.department) {
                throw new Error('Manager must be assigned to a department');
            }
            filter = `department = "${this.user.department}"`;
        }

        // Add status filter if provided
        if (options.status) {
            filter += filter ? ` && status = "${options.status}"` : `status = "${options.status}"`;
        }

        const result = await this.pb.collection('api_keys').getList(
            options.page || 1,
            options.perPage || 20,
            {
                filter: filter,
                sort: options.sort || '-created',
                fields: 'id,name,key,expires_at,status,permissions,last_used,created'
            }
        );

        return {
            success: true,
            data: result
        };
    }

    async delete(id) {
        // If manager, verify the key belongs to their department
        if (this.user.role === 'manager') {
            const key = await this.getById(id);
            if (!key.data || key.data.department !== this.user.department) {
                throw new Error('You can only delete API keys from your department');
            }
        }

        await this.pb.collection('api_keys').delete(id);

        return {
            success: true,
            message: 'API key deleted successfully'
        };
    }

    async update(id, data) {
        // If manager, verify the key belongs to their department
        if (this.user.role === 'manager') {
            const key = await this.getById(id);
            if (!key.data || key.data.department !== this.user.department) {
                throw new Error('You can only update API keys from your department');
            }
            // Prevent changing department
            delete data.department;
        }

        // Cannot update the key itself
        delete data.key;

        const result = await this.pb.collection('api_keys').update(id, data);

        return {
            success: true,
            data: result
        };
    }

    async getById(id) {
        const result = await this.pb.collection('api_keys').getOne(id, {
            fields: 'id,name,key,expires_at,status,permissions,department,last_used,created'
        });
        return {
            success: true,
            data: result
        };
    }

    // Method to validate API key permissions
    async validateApiKey(key, requiredPermission) {
        try {
            const apiKey = await this.pb.collection('api_keys').getFirstListItem(`key = "${key}"`);
            
            if (!apiKey) {
                throw new Error('Invalid API key');
            }

            if (apiKey.status !== 'active') {
                throw new Error('API key is not active');
            }

            const expiresAt = new Date(apiKey.expires_at);
            if (expiresAt < new Date()) {
                // Auto revoke expired key
                await this.pb.collection('api_keys').update(apiKey.id, { status: 'revoked' });
                throw new Error('API key has expired');
            }

            // Check if key has required permission
            if (!apiKey.permissions.includes(requiredPermission)) {
                throw new Error(`API key does not have ${requiredPermission} permission`);
            }

            // Update last used timestamp
            await this.pb.collection('api_keys').update(apiKey.id, {
                last_used: new Date().toISOString()
            });

            return {
                success: true,
                data: apiKey
            };
        } catch (error) {
            throw new Error(`API key validation failed: ${error.message}`);
        }
    }
}

module.exports = ApiKeyService; 