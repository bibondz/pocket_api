const BaseService = require('./base.service');
const AccessControlService = require('./access-control.service');

class UserService extends BaseService {
    static VALID_ROLES = ['admin', 'manager', 'operator'];
    static VALID_STATUSES = ['active', 'inactive'];

    constructor(auth = {}) {
        super(auth);
        this.accessControl = new AccessControlService(auth);
    }

    async list() {
        try {
            const options = {
                sort: '-created',
                expand: 'department'
            };

            // Admin เห็นทุกคน
            if (!this.isAdmin) {
                // ดึงแผนกที่มีสิทธิ์เข้าถึง
                const { data: accessList } = await this.accessControl.getUserDepartmentAccess(this.record.id);
                const departmentIds = [
                    this.department,
                    ...accessList.map(a => a.department)
                ].filter(Boolean);

                if (departmentIds.length > 0) {
                    options.filter = `department = "${departmentIds.join('" || department = "')}"`;
                }
            }

            const users = await this.pb.collection('users').getFullList(options);
            return {
                items: users.map(user => ({
                    ...user,
                    department: user.department ? {
                        id: user.department,
                        name: user.expand?.department?.name || 'Unknown'
                    } : null
                }))
            };
        } catch (error) {
            console.error('List users error:', error);
            throw error;
        }
    }

    async update(userId, data) {
        try {
            const user = await this.pb.collection('users').getOne(userId);
            
            // เช็คสิทธิ์การแก้ไข
            if (this.isAdmin) {
                // Admin แก้ได้ทุกคน
            } else if (this.isManager) {
                // Manager แก้ได้เฉพาะคนในแผนกที่มีสิทธิ์
                const canAccess = await this.accessControl.canAccessDepartment(
                    this.record.id,
                    user.department,
                    'edit'
                );
                if (!canAccess) {
                    throw new Error('You do not have permission to edit users in this department');
                }
            } else {
                // Operator แก้ได้แค่ตัวเอง
                if (!this.isSelf(userId)) {
                    throw new Error('You can only edit your own profile');
                }
            }

            const updatedUser = await this.pb.collection('users').update(userId, data);
            return {
                ...updatedUser,
                department: updatedUser.department ? {
                    id: updatedUser.department,
                    name: updatedUser.expand?.department?.name || 'Unknown'
                } : null
            };
        } catch (error) {
            console.error('Update user error:', error);
            throw error;
        }
    }

    async getById(userId) {
        try {
            const user = await this.pb.collection('users').getOne(userId, {
                expand: 'department'
            });
            
            // เช็คสิทธิ์การเข้าถึง
            if (!this.isAdmin) {
                const canAccess = await this.accessControl.canAccessDepartment(
                    this.record.id,
                    user.department,
                    'view'
                );
                if (!canAccess) {
                    throw new Error('You do not have access to this user');
                }
            }

            return {
                ...user,
                department: user.department ? {
                    id: user.department,
                    name: user.expand?.department?.name || 'Unknown'
                } : null
            };
        } catch (error) {
            console.error('Get user error:', error);
            throw error;
        }
    }
}

module.exports = UserService; 