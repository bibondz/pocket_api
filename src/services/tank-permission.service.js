const PocketBase = require('pocketbase/cjs');
const { PB_URL } = require('../../config');

class TankPermissionService {
    constructor(authToken = null) {
        this.pb = new PocketBase(PB_URL);
        if (authToken) {
            this.pb.authStore.save(authToken);
        }
    }

    async listPermissions(departmentId, tankId) {
        const filter = `department="${departmentId}"`;
        const resultList = await this.pb.collection('department_user_access').getList(1, 100, {
            filter,
            expand: 'user'
        });

        const permissions = {};
        for (const record of resultList.items) {
            if (record.tank_permissions && record.tank_permissions[tankId]) {
                permissions[record.user] = record.tank_permissions[tankId];
            }
        }
        return permissions;
    }

    async updatePermission(departmentId, tankId, userId, permissions) {
        const filter = `department="${departmentId}" && user="${userId}"`;
        const record = await this.pb.collection('department_user_access').getFirstListItem(filter);

        if (!record) {
            throw new Error('User is not a member of this department');
        }

        const tankPermissions = record.tank_permissions || {};
        tankPermissions[tankId] = permissions;

        return await this.pb.collection('department_user_access').update(record.id, {
            tank_permissions: tankPermissions
        });
    }

    async revokePermission(departmentId, tankId, userId) {
        const filter = `department="${departmentId}" && user="${userId}"`;
        const record = await this.pb.collection('department_user_access').getFirstListItem(filter);

        if (!record) {
            throw new Error('User is not a member of this department');
        }

        const tankPermissions = record.tank_permissions || {};
        delete tankPermissions[tankId];

        return await this.pb.collection('department_user_access').update(record.id, {
            tank_permissions: tankPermissions
        });
    }

    async listUserPermissions(userId, queryParams = {}) {
        const { sort, expand, fields } = queryParams;
        const page = parseInt(queryParams.page) || 1;
        const perPage = parseInt(queryParams.perPage) || 50;

        // Add user filter
        const filter = `user="${userId}"`;

        const resultList = await this.pb.collection('department_user_access').getList(page, perPage, {
            filter,
            sort,
            expand: expand || 'department',
            fields
        });

        return {
            page: resultList.page,
            perPage: resultList.perPage,
            totalItems: resultList.totalItems,
            totalPages: resultList.totalPages,
            items: resultList.items
        };
    }
}

module.exports = { TankPermissionService }; 