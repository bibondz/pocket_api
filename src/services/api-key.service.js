const PocketBase = require('pocketbase/cjs');
const crypto = require('crypto');
const BaseService = require('./base.service');

class ApiKeyService extends BaseService {
    constructor({ token, record, pb }) {
        super({ token });
        this.record = record;
        this.pb = pb || new PocketBase('https://api.irissar.com');
        this.pb.authStore.save(token);
    }

    async createApiKey(data) {
        const key = crypto.randomBytes(32).toString('hex');
        const createData = {
            name: data.name,
            key: key,
            created_by: data.record?.id || this.record.id,
            permissions: data.permissions,
            status: 'active',
            last_used: new Date().toISOString(),
            expires_at: data.expires_at || new Date(Date.now() + 365*24*60*60*1000).toISOString()
        };

        console.log('Creating API key with data:', createData);
        try {
            const apiKey = await this.pb.collection('api_keys').create(createData);
            return {
                id: apiKey.id,
                name: apiKey.name,
                key: key,
                status: apiKey.status,
                created: apiKey.created
            };
        } catch (error) {
            console.error('Failed to create API key:', error);
            if (error.response) {
                console.error('Error response:', error.response);
            }
            throw new Error('Failed to create API key: ' + (error.message || 'Unknown error'));
        }
    }

    async list(queryParams = {}) {
        const page = parseInt(queryParams.page) || 1;
        const perPage = parseInt(queryParams.perPage) || 10;
        const filter = [];

        if (this.record.role !== 'admin') {
            filter.push(`created_by="${this.record.id}"`);
        }

        if (queryParams.search) {
            filter.push(`name ~ "${queryParams.search}"`);
        }

        if (queryParams.status) {
            filter.push(`status = "${queryParams.status}"`);
        }

        const result = await this.pb.collection('api_keys').getList(page, perPage, {
            filter: filter.join(' && '),
            sort: queryParams.sort || '-created'
        });

        return {
            items: result.items.map(item => ({
                id: item.id,
                name: item.name,
                status: item.status,
                created: item.created
            })),
            page: result.page,
            perPage: result.perPage,
            totalItems: result.totalItems,
            totalPages: result.totalPages
        };
    }

    async getById(id) {
        const apiKey = await this.pb.collection('api_keys').getOne(id);

        if (apiKey.created_by !== this.record.id && this.record.role !== 'admin') {
            throw new Error('Not authorized to view this API key');
        }

        if (this.record.role !== 'admin') {
            return {
                id: apiKey.id,
                name: apiKey.name,
                status: apiKey.status,
                created: apiKey.created
            };
        }

        const { key, ...rest } = apiKey;
        return rest;
    }

    async revoke(id) {
        const apiKey = await this.pb.collection('api_keys').getOne(id);

        if (apiKey.created_by !== this.record.id && this.record.role !== 'admin') {
            throw new Error('Not authorized to revoke this API key');
        }

        await this.pb.collection('api_keys').delete(id);
        return {
            success: true,
            message: 'API key deleted successfully'
        };
    }
}

module.exports = ApiKeyService; 