const PocketBase = require('pocketbase/cjs');
const { PB_URL } = require('../../config');
const BaseService = require('./base.service');

class UserService extends BaseService {
    constructor(authToken = null) {
        super(authToken);
    }

    async login(email, password) {
        try {
            const authData = await this.pb.collection('users').authWithPassword(email, password);
            
            // Return in the same format as PocketBase auth response
            return {
                success: true,
                data: {
                    record: authData.record,
                    token: this.pb.authStore.token
                }
            };
        } catch (error) {
            console.error('Login error in service:', error);
            throw {
                success: false,
                message: 'Failed to authenticate',
                error: error.message
            };
        }
    }

    async create(data) {
        console.log('Creating user with data:', JSON.stringify(data, null, 2));
        try {
            // First, create the base user record
            const { role, department, ...userData } = data;
            const requestData = {
                ...userData,
                emailVisibility: true,
                role: role,
                department: department
            };

            const userRecord = await this.pb.collection('users').create(requestData);
            console.log('Base user created:', JSON.stringify(userRecord, null, 2));

            // Then create the department_user_access record
            const accessData = {
                user: userRecord.id,
                department: department,
                role: role
            };

            const accessRecord = await this.pb.collection('department_user_access').create(accessData);
            console.log('Department access created:', JSON.stringify(accessRecord, null, 2));

            // Return in PocketBase format
            return {
                ...userRecord,
                expand: {
                    department_access: accessRecord
                }
            };
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }

    async list(queryParams = {}) {
        const { filter, sort, expand, fields, skipTotal, search } = queryParams;
        const page = parseInt(queryParams.page) || 1;
        const perPage = parseInt(queryParams.perPage) || 50;

        // Get paginated list
        const resultList = await this.pb.collection('users').getList(page, perPage, {
            filter,
            sort,
            expand,
            fields,
            skipTotal,
            search
        });

        // Return in PocketBase list format
        return {
            page: resultList.page,
            perPage: resultList.perPage,
            totalItems: resultList.totalItems,
            totalPages: resultList.totalPages,
            items: resultList.items
        };
    }

    async getById(userId, expand = '') {
        return await this.pb.collection('users').getOne(userId, {
            expand
        });
    }

    async update(userId, data) {
        return await this.pb.collection('users').update(userId, data);
    }

    async delete(userId) {
        await this.pb.collection('users').delete(userId);
    }

    // Get user's departments
    async getDepartments(userId) {
        try {
            const departmentAccess = await this.pb.collection('department_user_access').getList(1, 50, {
                filter: `user="${userId}"`,
                expand: 'department'
            });

            return {
                success: true,
                data: departmentAccess.items.map(access => ({
                    id: access.expand.department.id,
                    name: access.expand.department.name,
                    role: access.role,
                    location: access.expand.department.location,
                    status: access.expand.department.status
                }))
            };
        } catch (error) {
            throw {
                success: false,
                message: 'Failed to get user departments',
                error: error.message
            };
        }
    }

    // Get user's assigned tanks
    async getTanks(userId) {
        try {
            // First get user's department access
            const departmentAccess = await this.pb.collection('department_user_access').getList(1, 50, {
                filter: `user="${userId}"`
            });

            // Get tanks for each department where user has access
            const tanks = [];
            for (const access of departmentAccess.items) {
                const departmentTanks = await this.pb.collection('tanks').getList(1, 50, {
                    filter: `department="${access.department}"`,
                    sort: '-created'
                });
                
                tanks.push(...departmentTanks.items.map(tank => ({
                    id: tank.id,
                    name: tank.name,
                    tank_id: tank.tank_id,
                    status: tank.status,
                    percentage: tank.percentage,
                    department: access.department,
                    permissions: access.tank_permissions?.[tank.id] || {}
                })));
            }

            return {
                success: true,
                data: tanks
            };
        } catch (error) {
            throw {
                success: false,
                message: 'Failed to get user tanks',
                error: error.message
            };
        }
    }

    // Get user's activity history
    async getActivities(userId) {
        try {
            const activities = await this.pb.collection('activities').getList(1, 50, {
                filter: `user="${userId}"`,
                sort: '-created',
                expand: 'tank,department'
            });

            return {
                success: true,
                data: activities.items.map(activity => ({
                    id: activity.id,
                    type: activity.type,
                    description: activity.description,
                    created: activity.created,
                    tank: activity.expand?.tank ? {
                        id: activity.expand.tank.id,
                        name: activity.expand.tank.name,
                        tank_id: activity.expand.tank.tank_id
                    } : null,
                    department: activity.expand?.department ? {
                        id: activity.expand.department.id,
                        name: activity.expand.department.name
                    } : null
                }))
            };
        } catch (error) {
            throw {
                success: false,
                message: 'Failed to get user activities',
                error: error.message
            };
        }
    }
}

module.exports = UserService; 