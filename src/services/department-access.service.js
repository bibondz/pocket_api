const { BaseService } = require('./base.service');

class DepartmentAccessService extends BaseService {
    constructor() {
        super('department_user_access');
    }

    async grantAccess(userId, departmentId, accessType) {
        try {
            // Validate inputs
            if (!userId || !departmentId || !accessType) {
                throw new Error('Missing required parameters');
            }

            // Check if user exists
            const user = await this.pb.collection('users').getOne(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Check if department exists
            const department = await this.pb.collection('departments').getOne(departmentId);
            if (!department) {
                throw new Error('Department not found');
            }

            // Check if access already exists
            const existingAccess = await this.pb.collection('department_user_access').getFirstListItem(
                `user="${userId}" && department="${departmentId}"`
            ).catch(() => null);

            if (existingAccess) {
                // Update existing access
                return await this.pb.collection('department_user_access').update(existingAccess.id, {
                    accessType
                });
            } else {
                // Create new access
                return await this.pb.collection('department_user_access').create({
                    user: userId,
                    department: departmentId,
                    accessType
                });
            }
        } catch (error) {
            console.error('Error in grantAccess:', error);
            throw error;
        }
    }

    async getUserAccess(userId) {
        try {
            // Get all department access for user
            const accessList = await this.pb.collection('department_user_access').getFullList({
                filter: `user="${userId}"`,
                expand: 'department'
            });

            return accessList;
        } catch (error) {
            console.error('Error in getUserAccess:', error);
            throw error;
        }
    }
}

module.exports = {
    DepartmentAccessService
}; 