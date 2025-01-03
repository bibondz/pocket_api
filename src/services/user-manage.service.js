const BaseService = require('./base.service');

class UserManageService extends BaseService {
    constructor(auth = {}) {
        super(auth);
    }

    async listUsers(queryParams = {}) {
        try {
            const page = parseInt(queryParams.page) || 1;
            const perPage = parseInt(queryParams.perPage) || 10;
            const filter = queryParams.filter || '';
            const sort = queryParams.sort || '-created';

            const resultList = await this.pb.collection('users').getList(page, perPage, {
                filter,
                sort
            });

            return {
                success: true,
                data: {
                    items: resultList.items,
                    page: resultList.page,
                    perPage: resultList.perPage,
                    totalItems: resultList.totalItems,
                    totalPages: resultList.totalPages
                }
            };
        } catch (error) {
            console.error('Error listing users:', error);
            throw {
                status: error.status || 500,
                message: error.message || 'Failed to list users',
                data: error.data || {}
            };
        }
    }

    async getUser(userId) {
        try {
            const user = await this.pb.collection('users').getOne(userId);
            return {
                success: true,
                data: user
            };
        } catch (error) {
            console.error('Error getting user:', error);
            throw {
                status: error.status || 404,
                message: error.message || 'Failed to get user',
                data: error.data || {}
            };
        }
    }

    async createUser(userData) {
        try {
            const { email, password, name, role } = userData;
            const user = await this.pb.collection('users').create({
                email,
                password,
                passwordConfirm: password,
                name,
                role: role || 'operator',
                emailVisibility: true,
                status: 'active'
            });

            return {
                success: true,
                data: user
            };
        } catch (error) {
            console.error('Error creating user:', error);
            throw {
                status: error.status || 400,
                message: error.message || 'Failed to create user',
                data: error.data || {}
            };
        }
    }

    async updateUser(userId, userData) {
        try {
            const user = await this.pb.collection('users').update(userId, userData);
            return {
                success: true,
                data: user
            };
        } catch (error) {
            console.error('Error updating user:', error);
            throw {
                status: error.status || 400,
                message: error.message || 'Failed to update user',
                data: error.data || {}
            };
        }
    }

    async deleteUser(userId) {
        try {
            await this.pb.collection('users').delete(userId);
            return {
                success: true,
                message: 'User deleted successfully'
            };
        } catch (error) {
            console.error('Error deleting user:', error);
            throw {
                status: error.status || 400,
                message: error.message || 'Failed to delete user',
                data: error.data || {}
            };
        }
    }
}

module.exports = UserManageService; 