const BaseService = require('./base.service');

class AdminService extends BaseService {
    async listUsers(filter = {}, sort = '-created') {
        try {
            return await this.pb.collection('users').getList(1, 50, {
                filter,
                sort
            });
        } catch (error) {
            console.error('List users failed:', error);
            throw error;
        }
    }

    async listTanks(filter = {}, sort = '-created') {
        try {
            return await this.pb.collection('tanks').getList(1, 50, {
                filter,
                sort
            });
        } catch (error) {
            console.error('List tanks failed:', error);
            throw error;
        }
    }

    async createAdmin(userData) {
        try {
            userData.role = 'admin';
            return await this.pb.collection('users').create(userData);
        } catch (error) {
            console.error('Create admin failed:', error);
            throw error;
        }
    }

    async updateUserRole(userId, role) {
        try {
            return await this.pb.collection('users').update(userId, { role });
        } catch (error) {
            console.error('Update user role failed:', error);
            throw error;
        }
    }

    async assignDepartment(userId, departmentId) {
        try {
            return await this.pb.collection('users').update(userId, {
                department: departmentId
            });
        } catch (error) {
            console.error('Assign department failed:', error);
            throw error;
        }
    }
}

module.exports = AdminService;
