const PocketBase = require('pocketbase/cjs');
const { PB_URL } = require('../../config');
const crypto = require('crypto');
const BaseService = require('./base.service');

class ApiKeyService extends BaseService {
    constructor({ token, record }) {
        super(token);
        this.record = record;
        
        // Use auth state from base service if available
        if (this.pb.authStore.isValid) {
            this.record = this.pb.authStore.model;
        }
    }

    generateApiKey() {
        return crypto.randomBytes(32).toString('hex');
    }

    async createApiKey(data) {
        if (!data.permissions || typeof data.permissions !== 'object') {
            throw new Error('Tank permissions are required');
        }

        // Admin can create API keys with any permissions
        if (this.record.role === 'admin') {
            const key = this.generateApiKey();
            const createData = {
                name: data.name,
                key: key,
                created_by: this.record.id,
                expires_at: data.expires_at,
                permissions: data.permissions,
                status: 'active',
                last_used: new Date().toISOString(),
                department: data.department
            };
            
            try {
                const apiKey = await this.pb.collection('api_keys').create(createData);
                return {
                    ...apiKey,
                    key: key
                };
            } catch (error) {
                console.error('Failed to create API key:', error);
                throw error;
            }
        }

        // Validate tank permissions for non-admin users
        for (const [tankId, permissions] of Object.entries(data.permissions)) {
            if (!permissions || typeof permissions !== 'object') {
                throw new Error(`Invalid permissions for tank ${tankId}`);
            }

            // 1. Check tank first
            let tank;
            try {
                tank = await this.pb.collection('tanks').getOne(tankId);
            } catch (error) {
                throw new Error(`Tank ${tankId} not found`);
            }

            // 2. Check user access to department
            let userAccess;
            try {
                userAccess = await this.pb.collection('department_user_access').getFirstListItem(
                    `user="${this.record.id}" && department="${tank.department}"`
                );
            } catch (error) {
                throw new Error(`Not authorized to access tank ${tankId}`);
            }

            // 3. Check if user has access to this tank's department
            if (userAccess.department !== tank.department) {
                throw new Error(`Not authorized to access tank ${tankId}`);
            }

            // 4. For operators, check tank permissions
            if (userAccess.role !== 'manager') {
                const tankPerms = userAccess.tank_permissions?.[tankId];
                if (!tankPerms || Object.keys(tankPerms).length === 0) {
                    throw new Error(`Not authorized to manage tank ${tankId}`);
                }

                // Convert array of permissions to object format if needed
                let requestedPerms = {};
                if (Array.isArray(permissions)) {
                    for (const perm of permissions) {
                        requestedPerms[perm] = true;
                    }
                } else if (typeof permissions === 'object') {
                    requestedPerms = permissions;
                } else {
                    throw new Error(`Invalid permissions format for tank ${tankId}`);
                }

                // Check each requested permission against user's permissions
                for (const [action, value] of Object.entries(requestedPerms)) {
                    if (!value) continue;

                    if (!tankPerms[action]) {
                        const actionText = {
                            read: 'read from',
                            write: 'write to',
                            manage: 'manage',
                            create_token: 'create tokens for'
                        }[action] || action;
                        throw new Error(`Not authorized to ${actionText} tank ${tankId}`);
                    }
                }
            }
        }

        const key = this.generateApiKey();
        const createData = {
            name: data.name,
            key: key,
            created_by: this.record.id,
            expires_at: data.expires_at,
            permissions: data.permissions,
            status: 'active',
            last_used: new Date().toISOString(),
            department: data.department
        };
        
        try {
            const apiKey = await this.pb.collection('api_keys').create(createData);
            return {
                ...apiKey,
                key: key
            };
        } catch (error) {
            console.error('Failed to create API key:', error);
            throw error;
        }
    }

    async list(queryParams = {}) {
        const page = parseInt(queryParams.page) || 1;
        const perPage = parseInt(queryParams.perPage) || 10;

        try {
            let filter = [];
            
            // Only show API keys created by the user unless admin
            if (this.record.role !== 'admin') {
                filter.push(`created_by="${this.record.id}"`);
            }
            
            // Search by name
            if (queryParams.search) {
                filter.push(`name ~ "${queryParams.search}"`);
            }

            // Filter by status
            if (queryParams.status) {
                filter.push(`status = "${queryParams.status}"`);
            }

            // Filter by department
            if (queryParams.department) {
                filter.push(`department = "${queryParams.department}"`);
            }

            const finalFilter = filter.length > 0 ? filter.join(' && ') : '';
            const sort = queryParams.sort || '-created';

            const resultList = await this.pb.collection('api_keys').getList(page, perPage, {
                filter: finalFilter,
                sort: sort,
                expand: 'department,created_by'
            });

            return {
                items: resultList.items.map(item => {
                    // Remove sensitive data from response
                    const { key, ...rest } = item;
                    return rest;
                }),
                page: resultList.page,
                perPage: resultList.perPage,
                totalItems: resultList.totalItems,
                totalPages: resultList.totalPages
            };
        } catch (error) {
            throw new Error('Failed to fetch API keys: ' + error.message);
        }
    }

    // Alias for backward compatibility
    async listApiKeys(queryParams = {}) {
        return this.list(queryParams);
    }

    async revokeApiKey(keyId) {
        const apiKey = await this.pb.collection('api_keys').getOne(keyId);
        if (apiKey.created_by !== this.record.id && this.record.role !== 'admin') {
            throw new Error('Not authorized to revoke this API key');
        }
        return await this.pb.collection('api_keys').update(keyId, {
            status: 'revoked'
        });
    }

    async verifyApiKeyPermission(key, tankId, action) {
        // 1. Check if tank exists first
        let tank;
        try {
            tank = await this.pb.collection('tanks').getOne(tankId);
        } catch (error) {
            throw new Error(`Tank ${tankId} not found`);
        }

        // 2. Check if API key exists and is valid
        const result = await this.pb.collection('api_keys').getList(1, 1, {
            filter: `key="${key}"`
        });

        if (result.items.length === 0) {
            throw new Error('Invalid API key');
        }

        const apiKey = result.items[0];
        if (apiKey.status === 'revoked') {
            throw new Error('API key is revoked');
        }

        if (new Date(apiKey.expires_at) < new Date()) {
            throw new Error('API key is expired');
        }

        // 3. Check if API key has permission for this tank and action
        const permissions = apiKey.permissions;
        if (!permissions || !permissions[tankId] || !permissions[tankId][action]) {
            throw new Error(`Not authorized to ${action} tank ${tankId}`);
        }

        return true;
    }

    async getById(apiKeyId) {
        try {
            const apiKey = await this.pb.collection('api_keys').getOne(apiKeyId, {
                expand: 'department,created_by'
            });

            // Only allow admin or creator to view the API key
            if (apiKey.created_by !== this.record.id && this.record.role !== 'admin') {
                throw new Error('Not authorized to view this API key');
            }

            return {
                success: true,
                data: {
                    ...apiKey,
                    departmentData: apiKey.expand?.department ? {
                        id: apiKey.expand.department.id,
                        name: apiKey.expand.department.name
                    } : null,
                    createdByUser: apiKey.expand?.created_by ? {
                        id: apiKey.expand.created_by.id,
                        name: apiKey.expand.created_by.name,
                        email: apiKey.expand.created_by.email
                    } : null
                }
            };
        } catch (error) {
            throw {
                success: false,
                message: error.message,
                error: error.message
            };
        }
    }

    async update(apiKeyId, data) {
        try {
            const apiKey = await this.pb.collection('api_keys').getOne(apiKeyId);

            // Only allow admin or creator to update the API key
            if (apiKey.created_by !== this.record.id && this.record.role !== 'admin') {
                throw new Error('Not authorized to update this API key');
            }

            // Validate permissions if provided
            if (data.permissions) {
                // Admin can update with any permissions
                if (this.record.role !== 'admin') {
                    // Validate tank permissions for non-admin users
                    for (const [tankId, permissions] of Object.entries(data.permissions)) {
                        if (!permissions || typeof permissions !== 'object') {
                            throw new Error(`Invalid permissions for tank ${tankId}`);
                        }

                        // 1. Check tank first
                        let tank;
                        try {
                            tank = await this.pb.collection('tanks').getOne(tankId);
                        } catch (error) {
                            throw new Error(`Tank ${tankId} not found`);
                        }

                        // 2. Check if user has access to the tank's department
                        const departmentAccess = await this.pb.collection('department_user_access').getFirstListItem(
                            `user="${this.record.id}" && department="${tank.department}"`
                        ).catch(() => null);

                        if (!departmentAccess) {
                            throw new Error(`Not authorized to manage tank ${tankId}`);
                        }

                        // 3. Check if user has the permissions they're trying to grant
                        for (const action of Object.keys(permissions)) {
                            if (!departmentAccess.tank_permissions.includes(action)) {
                                throw new Error(`Not authorized to grant ${action} permission for tank ${tankId}`);
                            }
                        }
                    }
                }
            }

            const updateData = {
                name: data.name,
                status: data.status,
                permissions: data.permissions,
                expires_at: data.expires_at
            };

            const updatedApiKey = await this.pb.collection('api_keys').update(apiKeyId, updateData);
            return {
                success: true,
                data: {
                    ...updatedApiKey,
                    departmentData: updatedApiKey.expand?.department ? {
                        id: updatedApiKey.expand.department.id,
                        name: updatedApiKey.expand.department.name
                    } : null,
                    createdByUser: updatedApiKey.expand?.created_by ? {
                        id: updatedApiKey.expand.created_by.id,
                        name: updatedApiKey.expand.created_by.name,
                        email: updatedApiKey.expand.created_by.email
                    } : null
                }
            };
        } catch (error) {
            throw {
                success: false,
                message: error.message,
                error: error.message
            };
        }
    }
}

module.exports = ApiKeyService; 