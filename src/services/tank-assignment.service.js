const BaseService = require('./base.service');

class TankAssignmentService extends BaseService {
    constructor(auth) {
        super(auth?.token || null);
        this.userId = auth?.record?.id;
    }

    async listOperatorTanks(operatorId, departmentId, options = {}) {
        try {
            // Get operator's access record for the department
            let accessRecord;
            try {
                accessRecord = await this.pb.collection('department_user_access').getFirstListItem(
                    `user = "${operatorId}" && department = "${departmentId}"`
                );
            } catch (error) {
                return {
                    page: 1,
                    perPage: 50,
                    totalItems: 0,
                    totalPages: 0,
                    items: []
                };
            }

            // Get all tank IDs with read permission
            const tankIds = Object.entries(accessRecord.tank_permissions || {})
                .filter(([_, perms]) => perms.read)
                .map(([id]) => id);

            if (tankIds.length === 0) {
                return {
                    page: options.page || 1,
                    perPage: options.perPage || 50,
                    totalItems: 0,
                    totalPages: 0,
                    items: []
                };
            }

            // Build filter
            let filter = [
                `department = "${departmentId}"`,
                `id ?~ "${tankIds.join('|')}"`
            ];
            if (options.filter) {
                filter.push(options.filter);
            }

            // Get tanks with pagination
            const tanks = await this.pb.collection('tanks').getList(
                options.page || 1,
                options.perPage || 50,
                {
                    filter: filter.join(' && '),
                    sort: options.sort || '-created',
                    fields: options.fields || '*'
                }
            );

            // Map tanks with permissions
            const items = tanks.items.map(tank => ({
                tank,
                permissions: accessRecord.tank_permissions[tank.id]
            }));

            return {
                page: tanks.page,
                perPage: tanks.perPage,
                totalItems: tanks.totalItems,
                totalPages: tanks.totalPages,
                items
            };
        } catch (error) {
            console.error('List operator tanks failed:', error);
            throw error;
        }
    }

    async assignTank(tankId, operatorId, departmentId, permissions = { read: true }) {
        try {
            // Check if user is a manager of the department first
            const isManager = await this.isManagerOfDepartment(departmentId);
            if (!isManager) {
                throw new Error('Only department managers can assign tanks');
            }

            // Get operator's access record
            let accessRecord;
            try {
                accessRecord = await this.pb.collection('department_user_access').getFirstListItem(
                    `user = "${operatorId}" && department = "${departmentId}"`
                );
            } catch (error) {
                throw new Error('Operator does not have access to this department');
            }

            // Validate permissions
            if (!permissions || typeof permissions !== 'object') {
                throw new Error('Invalid permissions');
            }

            // Initialize tank_permissions if it doesn't exist
            if (!accessRecord.tank_permissions) {
                accessRecord.tank_permissions = {};
            }

            // Set default values for missing permissions
            const updatedPermissions = {
                ...accessRecord.tank_permissions,
                [tankId]: {
                    read: !!permissions.read,
                    write: !!permissions.write,
                    manage: !!permissions.manage,
                    create_token: !!permissions.create_token
                }
            };

            // Update access record
            await this.pb.collection('department_user_access').update(accessRecord.id, {
                tank_permissions: updatedPermissions
            });

            return {
                success: true,
                message: 'Tank assigned successfully',
                permissions: updatedPermissions[tankId]
            };
        } catch (error) {
            console.error('Assign tank failed:', error);
            throw error;
        }
    }

    async unassignTank(tankId, operatorId, departmentId) {
        try {
            // Check if user is a manager of the department
            const isManager = await this.isManagerOfDepartment(departmentId);
            if (!isManager) {
                throw new Error('Only department managers can unassign tanks');
            }

            // Get operator's access record
            let accessRecord;
            try {
                accessRecord = await this.pb.collection('department_user_access').getFirstListItem(
                    `user = "${operatorId}" && department = "${departmentId}"`
                );
            } catch (error) {
                throw new Error('Operator does not have access to this department');
            }

            // Remove tank permissions
            const { [tankId]: removed, ...updatedPermissions } = accessRecord.tank_permissions || {};

            // Update access record
            await this.pb.collection('department_user_access').update(accessRecord.id, {
                tank_permissions: updatedPermissions
            });

            return {
                success: true,
                message: 'Tank unassigned successfully'
            };
        } catch (error) {
            console.error('Unassign tank failed:', error);
            throw error;
        }
    }

    async updateTankPermissions(operatorId, departmentId, tankId, permissions) {
        return await this.assignTank(tankId, operatorId, departmentId, permissions);
    }

    async isManagerOfDepartment(departmentId) {
        try {
            if (!this.userId) {
                throw new Error('User not authenticated');
            }
            const accessRecord = await this.pb.collection('department_user_access').getFirstListItem(
                `user = "${this.userId}" && department = "${departmentId}" && role = "manager"`
            );
            return true;
        } catch (error) {
            if (error.message === 'User not authenticated') {
                throw error;
            }
            return false;
        }
    }
}

module.exports = TankAssignmentService; 