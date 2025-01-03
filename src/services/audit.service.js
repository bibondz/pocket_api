const PocketBase = require('pocketbase/cjs');
const { PB_URL } = require('../../config');

class AuditService {
    constructor(authToken = null) {
        this.pb = new PocketBase(PB_URL);
        if (authToken) {
            this.pb.authStore.save(authToken);
        }
    }

    async log(data) {
        return await this.pb.collection('audit_logs').create({
            action: data.action,
            collection: data.collection,
            record_id: data.record_id,
            user_id: data.user_id,
            changes: JSON.stringify(data.changes),
            metadata: JSON.stringify(data.metadata),
            timestamp: new Date().toISOString()
        });
    }

    async logTankChange(tank, changes, userId) {
        return await this.log({
            action: 'update',
            collection: 'tanks',
            record_id: tank.id,
            user_id: userId,
            changes,
            metadata: {
                tank_id: tank.tank_id,
                name: tank.name,
                department: tank.department
            }
        });
    }

    async logStatusChange(tank, oldStatus, newStatus, userId) {
        return await this.log({
            action: 'status_change',
            collection: 'tanks',
            record_id: tank.id,
            user_id: userId,
            changes: {
                status: {
                    old: oldStatus,
                    new: newStatus
                }
            },
            metadata: {
                tank_id: tank.tank_id,
                name: tank.name,
                department: tank.department
            }
        });
    }

    async list(queryParams = {}) {
        const { filter, sort, expand, fields, skipTotal, search } = queryParams;
        const page = parseInt(queryParams.page) || 1;
        const perPage = parseInt(queryParams.perPage) || 50;

        const resultList = await this.pb.collection('audit_logs').getList(page, perPage, {
            filter,
            sort: sort || '-timestamp',
            expand,
            fields,
            skipTotal,
            search
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

module.exports = { AuditService }; 