const BaseService = require('./base.service');

class DepartmentService extends BaseService {
    constructor({ token, record }) {
        super({ token, record });
    }

    async listDepartments(page = 1, perPage = 50, filter = '', sort = '-created', search = '') {
        try {
            console.log('DepartmentService.listDepartments called with:', {
                page, perPage, filter, sort, search,
                token: this.token ? 'exists' : 'missing',
                record: this.record
            });

            // Re-save token to ensure it's available
            if (this.token) {
                console.log('Re-saving token before query');
                this.pb.authStore.save(this.token, this.record);
            }
            
            const options = {
                sort: sort,
                expand: 'department'
            };
            
            if (filter || search) {
                const filters = [];
                if (filter) filters.push(filter);
                if (search) filters.push(`name ~ "${search}" || description ~ "${search}"`);
                options.filter = filters.join(' && ');
            }

            console.log('PocketBase query options:', options);

            const result = await this.pb.collection('departments').getList(page, perPage, options);
            console.log('PocketBase result:', result);
            
            return {
                success: true,
                data: result
            };
        } catch (error) {
            console.error('List departments failed:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    async createDepartment(departmentData) {
        try {
            // Create department data
            const data = {
                name: departmentData.name,
                description: departmentData.description || '',
                location: departmentData.location || '',
                status: departmentData.status || 'active'
            };

            console.log('Creating department with data:', JSON.stringify(data, null, 2));
            
            // Create the department
            const department = await this.pb.collection('departments').create(data);
            
            return {
                success: true,
                data: department
            };
        } catch (error) {
            console.error('Create department failed:', error);
            if (error.response?.data?.data?.name?.code === 'validation_not_unique') {
                return {
                    success: false,
                    message: `Department name "${departmentData.name}" already exists`
                };
            }
            return {
                success: false,
                message: error.response?.data?.message || error.message
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
            const updatedDepartment = await this.pb.collection('departments').update(departmentId, departmentData);
            
            return {
                success: true,
                data: updatedDepartment
            };
        } catch (error) {
            console.error('Update department failed:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    async deleteDepartment(departmentIdOrName) {
        try {
            // Try to get department by name first if it's not a UUID
            let department;
            try {
                department = await this.pb.collection('departments').getFirstListItem(`name = "${departmentIdOrName}"`);
            } catch (error) {
                // If not found by name, try to get by ID
                department = await this.pb.collection('departments').getOne(departmentIdOrName);
            }

            await this.pb.collection('departments').delete(department.id);
            
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

    async listDepartmentMembers(departmentIdOrName) {
        try {
            // Get department by name or id
            let department;
            try {
                department = await this.pb.collection('departments').getFirstListItem(`name = "${departmentIdOrName}"`);
            } catch (error) {
                department = await this.pb.collection('departments').getOne(departmentIdOrName);
            }

            const result = await this.pb.collection('department_user_access').getList(1, 50, {
                filter: `department = "${department.id}"`,
                expand: 'user,department'
            });

            const members = result.items.map(access => ({
                id: access.expand?.user?.id,
                email: access.expand?.user?.email,
                name: access.expand?.user?.name,
                position: access.position,
                department: access.expand?.department?.name,
                created: access.created
            }));

            return {
                success: true,
                data: {
                    items: members,
                    totalItems: result.totalItems
                }
            };
        } catch (error) {
            console.error('List department members failed:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    async addDepartmentMember(departmentIdOrName, data) {
        try {
            // Check if user exists
            const user = await this.pb.collection('users').getOne(data.userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Get department by name or id
            let department;
            try {
                department = await this.pb.collection('departments').getFirstListItem(`name = "${departmentIdOrName}"`);
            } catch (error) {
                department = await this.pb.collection('departments').getOne(departmentIdOrName);
            }

            if (!department) {
                throw new Error('Department not found');
            }

            // Check if user is already a member
            try {
                await this.pb.collection('department_user_access').getFirstListItem(
                    `user = "${data.userId}" && department = "${department.id}"`
                );
                throw new Error('User is already a member of this department');
            } catch (error) {
                // If error is "no items found", proceed with adding the member
                if (!error.message.includes('no items found')) {
                    throw error;
                }
            }

            // Add member
            console.log('Adding member with data:', {
                user: data.userId,
                department: department.id,
                position: data.position || 'operator',
                tank_permissions: data.tank_permissions || {}
            });

            const result = await this.pb.collection('department_user_access').create({
                user: data.userId,
                department: department.id,
                position: data.position || 'operator',
                tank_permissions: data.tank_permissions || {}
            });

            console.log('Member added successfully:', result);

            return {
                success: true,
                data: {
                    ...result,
                    department: department.name
                }
            };
        } catch (error) {
            console.error('Add department member failed:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    async updateDepartmentMember(departmentIdOrName, userId, data) {
        try {
            // Get department by name or id
            let department;
            try {
                department = await this.pb.collection('departments').getFirstListItem(`name = "${departmentIdOrName}"`);
            } catch (error) {
                department = await this.pb.collection('departments').getOne(departmentIdOrName);
            }

            // Get access record
            const accessRecord = await this.pb.collection('department_user_access').getFirstListItem(
                `user = "${userId}" && department = "${department.id}"`
            );

            // Update member
            const result = await this.pb.collection('department_user_access').update(accessRecord.id, {
                position: data.position,
                tank_permissions: data.tank_permissions || accessRecord.tank_permissions
            });

            return {
                success: true,
                data: {
                    ...result,
                    department: department.name
                }
            };
        } catch (error) {
            console.error('Update department member failed:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    async removeDepartmentMember(departmentIdOrName, userId) {
        try {
            // Get department by name or id
            let department;
            try {
                department = await this.pb.collection('departments').getFirstListItem(`name = "${departmentIdOrName}"`);
            } catch (error) {
                department = await this.pb.collection('departments').getOne(departmentIdOrName);
            }

            // Get access record
            const accessRecord = await this.pb.collection('department_user_access').getFirstListItem(
                `user = "${userId}" && department = "${department.id}"`
            );

            // Remove member
            await this.pb.collection('department_user_access').delete(accessRecord.id);

            return {
                success: true,
                message: 'Member removed successfully'
            };
        } catch (error) {
            console.error('Remove department member failed:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    async listDepartmentTanks(departmentIdOrName) {
        try {
            // Get department by name or id
            let department;
            try {
                department = await this.pb.collection('departments').getFirstListItem(`name = "${departmentIdOrName}"`);
            } catch (error) {
                department = await this.pb.collection('departments').getOne(departmentIdOrName);
            }

            const result = await this.pb.collection('tanks').getList(1, 50, {
                filter: `department = "${department.id}"`,
                expand: 'department'
            });

            return {
                success: true,
                data: {
                    ...result,
                    items: result.items.map(tank => ({
                        ...tank,
                        department: tank.expand?.department?.name
                    }))
                }
            };
        } catch (error) {
            console.error('List department tanks failed:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    async removeTank(departmentId, tankId) {
        try {
            // Get tank details
            const tank = await this.pb.collection('tanks').getOne(tankId);
            if (!tank) {
                throw new Error('Tank not found');
            }

            // Verify current department
            if (tank.department !== departmentId) {
                throw new Error('Tank is not in the specified department');
            }

            // Update tank to remove department
            const updatedTank = await this.pb.collection('tanks').update(tankId, {
                department: null
            });

            return {
                success: true,
                message: 'Tank removed successfully',
                data: updatedTank
            };
        } catch (error) {
            console.error('Failed to remove tank:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    async isManagerOfDepartment(userId, departmentId) {
        try {
            // Check if user has manager position in department_user_access
            const accessRecord = await this.pb.collection('department_user_access').getFirstListItem(
                `user = "${userId}" && department = "${departmentId}" && position = "manager"`
            );
            return true;
        } catch (error) {
            return false;
        }
    }

    async addTank(departmentId, tankId) {
        try {
            // Get tank details
            const tank = await this.pb.collection('tanks').getOne(tankId);
            if (!tank) {
                throw new Error('Tank not found');
            }

            // Update tank to add department
            const updatedTank = await this.pb.collection('tanks').update(tankId, {
                department: departmentId
            });

            return {
                success: true,
                message: 'Tank added successfully',
                data: updatedTank
            };
        } catch (error) {
            console.error('Add tank failed:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }
}

module.exports = DepartmentService; 