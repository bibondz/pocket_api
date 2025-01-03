const BaseService = require('./base.service');

class UserService extends BaseService {
    constructor({ token, record }) {
        super({ token, record });
    }

    static get VALID_STATUSES() {
        return ['active', 'inactive', 'suspended'];
    }

    static get VALID_ROLES() {
        return ['admin', 'manager', 'operator'];
    }

    async list(queryParams = {}) {
        if (!this.isAdmin && !this.isManager) {
            throw new Error('Only admin or manager can list users');
        }

        try {
            const { 
                page = 1, 
                perPage = 50,
                status,
                sort = '-created'
            } = queryParams;

            const options = {
                sort: sort,
                expand: 'department'
            };

            // Add status filter if provided
            if (status) {
                if (!UserService.VALID_STATUSES.includes(status)) {
                    throw new Error(`Invalid status. Must be one of: ${UserService.VALID_STATUSES.join(', ')}`);
                }
                options.filter = `status = "${status}"`;
            }

            // For managers, only show users in their department
            if (this.isManager && !this.isAdmin) {
                const manager = await this.pb.collection('users').getOne(this.record.id, {
                    expand: 'department'
                });
                if (!manager.department) {
                    throw new Error('Manager must be assigned to a department first');
                }
                options.filter = options.filter 
                    ? `${options.filter} && department = "${manager.department}"`
                    : `department = "${manager.department}"`;
            }

            const result = await this.pb.collection('users').getList(page, perPage, options);

            return {
                success: true,
                data: result
            };
        } catch (error) {
            console.error('List users error:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }
}

module.exports = UserService; 