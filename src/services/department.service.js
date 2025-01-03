const BaseService = require('./base.service');

class DepartmentService extends BaseService {
    constructor({ token, record }) {
        super(token);
        this.record = record;
    }

    async listDepartments(page = 1, perPage = 50, filter = '', sort = '-created', search = '') {
        try {
            if (!this.pb) {
                throw new Error('PocketBase client not initialized');
            }
            if (!this.pb.authStore.token) {
                throw new Error('Auth token not provided');
            }

            console.log('Building list departments options:', { page, perPage, filter, sort, search });
            const options = {
                sort: sort
            };
            
            let filters = [];
            if (filter) {
                filters.push(filter);
            }
            if (search) {
                filters.push(`name ~ "${search}" || description ~ "${search}"`);
            }

            if (filters.length > 0) {
                options.filter = filters.join(' && ');
            }

            console.log('Final list departments options:', options);
            const result = await this.pb.collection('departments').getList(page, perPage, options);
            console.log('List departments result:', result);
            
            return {
                success: true,
                data: result
            };
        } catch (error) {
            console.error('List departments failed:', {
                error: error.message,
                stack: error.stack,
                details: error.data
            });
            return {
                success: false,
                message: error.message,
                details: error.data || {}
            };
        }
    }

    async createDepartment(departmentData) {
        try {
            // Ensure required fields are present
            const requiredFields = ['name', 'location'];
            for (const field of requiredFields) {
                if (!departmentData[field]) {
                    throw new Error(`Missing required field: ${field}`);
                }
            }

            // Create department data
            const data = {
                name: departmentData.name,
                description: departmentData.description || '',
                location: departmentData.location
            };

            // Create the department
            const department = await this.pb.collection('departments').create(data);
            return {
                success: true,
                data: department
            };
        } catch (error) {
            console.error('Create department failed:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    async getDepartment(departmentId) {
        try {
            const department = await this.pb.collection('departments').getOne(departmentId);
            return {
                success: true,
                data: department
            };
        } catch (error) {
            console.error('Get department failed:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    async updateDepartment(departmentId, departmentData) {
        try {
            const department = await this.pb.collection('departments').update(departmentId, departmentData);
            return {
                success: true,
                data: department
            };
        } catch (error) {
            console.error('Update department failed:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    async deleteDepartment(departmentId) {
        try {
            await this.pb.collection('departments').delete(departmentId);
            return {
                success: true,
                message: 'Department deleted successfully'
            };
        } catch (error) {
            console.error('Delete department failed:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    async listDepartmentMembers(departmentId) {
        try {
            const result = await this.pb.collection('users').getList(1, 50, {
                filter: `department = "${departmentId}"`
            });
            return {
                success: true,
                data: result
            };
        } catch (error) {
            console.error('List department members failed:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    async listDepartmentTanks(departmentId) {
        try {
            const result = await this.pb.collection('tanks').getList(1, 50, {
                filter: `department = "${departmentId}"`
            });
            return {
                success: true,
                data: result
            };
        } catch (error) {
            console.error('List department tanks failed:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }
}

module.exports = DepartmentService; 