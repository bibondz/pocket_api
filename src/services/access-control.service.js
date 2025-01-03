const BaseService = require('./base.service');

class AccessControlService extends BaseService {
    constructor(auth = {}) {
        super(auth);
    }

    // ดึงข้อมูลการเข้าถึงแผนกทั้งหมดของ user
    async getUserDepartmentAccess(userId) {
        try {
            const access = await this.pb.collection('department_user_access').getFullList({
                filter: `user = "${userId}"`,
                expand: 'department'
            });
            return {
                success: true,
                data: access.map(a => ({
                    id: a.id,
                    department: a.department,
                    departmentName: a.expand?.department?.name || 'Unknown',
                    accessType: a.access_type || 'view'  // view, edit, manage
                }))
            };
        } catch (error) {
            console.error('Error getting department access:', error);
            return { success: false, error: error.message };
        }
    }

    // เช็คว่า user มีสิทธิ์เข้าถึงแผนกหรือไม่
    async canAccessDepartment(userId, departmentId, requiredAccess = 'view') {
        try {
            // Admin เข้าถึงได้ทุกแผนก
            if (this.isAdmin) return true;
            
            // ถ้าเป็นแผนกของตัวเอง
            const user = await this.pb.collection('users').getOne(userId);
            if (user.department === departmentId) return true;

            // เช็คจาก department_user_access
            const access = await this.pb.collection('department_user_access').getFirstListItem(
                `user = "${userId}" && department = "${departmentId}"`
            );

            // เช็คระดับการเข้าถึง
            const accessLevels = ['view', 'edit', 'manage'];
            const requiredLevel = accessLevels.indexOf(requiredAccess);
            const userLevel = accessLevels.indexOf(access.access_type || 'view');

            return userLevel >= requiredLevel;
        } catch (error) {
            console.error('Error checking department access:', error);
            return false;
        }
    }

    // เพิ่มสิทธิ์การเข้าถึงแผนก
    async addDepartmentAccess(userId, departmentId, accessType = 'view') {
        try {
            if (!this.isAdmin) {
                throw new Error('Only admin can manage department access');
            }

            const data = {
                user: userId,
                department: departmentId,
                access_type: accessType
            };

            const result = await this.pb.collection('department_user_access').create(data);
            return { success: true, data: result };
        } catch (error) {
            console.error('Error adding department access:', error);
            return { success: false, error: error.message };
        }
    }

    // ลบสิทธิ์การเข้าถึงแผนก
    async removeDepartmentAccess(accessId) {
        try {
            if (!this.isAdmin) {
                throw new Error('Only admin can manage department access');
            }

            await this.pb.collection('department_user_access').delete(accessId);
            return { success: true };
        } catch (error) {
            console.error('Error removing department access:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = AccessControlService; 