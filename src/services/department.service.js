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
            const department = await this.pb.collection('departments').getOne(departmentId, {
                expand: 'tanks'
            });

            // Get tanks linked to this department
            const tanks = await this.pb.collection('tanks').getList(1, 50, {
                filter: `department = "${departmentId}"`,
            });

            return {
                success: true,
                data: {
                    ...department,
                    tanks: tanks.items.map(tank => ({
                        id: tank.id,
                        name: tank.name,
                        description: tank.description,
                        status: tank.status
                    }))
                }
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

            // Check user permissions
            if (!this.record) {
                throw new Error('Authentication required');
            }

            // Admin can see all members
            if (this.isAdmin) {
                // Allow access to all members
            }
            // Manager can only see members of their own department
            else if (this.isManager) {
                const userDepartment = await this.pb.collection('users').getOne(this.record.id, {
                    expand: 'department'
                });
                if (!userDepartment.department || userDepartment.department.id !== department.id) {
                    throw new Error('You can only view members of your own department');
                }
            }
            // Operator can only see themselves
            else {
                const users = await this.pb.collection('users').getList(1, 50, {
                    filter: `id = "${this.record.id}"`,
                    expand: 'department'
                });
                return {
                    success: true,
                    data: {
                        items: users.items.map(user => ({
                            id: user.id,
                            email: user.email,
                            name: user.name,
                            role: user.role,
                            department: user.expand?.department?.name || department.name,
                            created: user.created
                        })),
                        totalItems: users.totalItems
                    }
                };
            }

            // Get users that have this department (for admin and manager)
            const users = await this.pb.collection('users').getList(1, 50, {
                filter: `department.id = "${department.id}"`,
                expand: 'department'
            });

            const members = users.items.map(user => ({
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                department: user.expand?.department?.name || department.name,
                created: user.created
            }));

            return {
                success: true,
                data: {
                    items: members,
                    totalItems: users.totalItems
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
            // Admin can see all tanks if no department specified
            if (this.isAdmin && !departmentIdOrName) {
                const tanks = await this.pb.collection('tanks').getList(1, 50, {
                    expand: 'department'
                });

                return {
                    success: true,
                    data: {
                        items: tanks.items.map(tank => ({
                            id: tank.id,
                            name: tank.name,
                            description: tank.description,
                            status: tank.status,
                            department: tank.expand?.department?.name || 'none'
                        })),
                        totalItems: tanks.totalItems
                    }
                };
            }

            // For specific department requests
            if (!departmentIdOrName) {
                throw new Error('Department ID or name is required');
            }

            // Get department by name or id
            let department;
            try {
                department = await this.pb.collection('departments').getFirstListItem(`name = "${departmentIdOrName}"`);
            } catch (error) {
                try {
                    department = await this.pb.collection('departments').getOne(departmentIdOrName);
                } catch (error) {
                    throw new Error(`Department not found: ${departmentIdOrName}`);
                }
            }

            // Check user permissions
            if (!this.record) {
                throw new Error('Authentication required');
            }

            // Admin can see all tanks
            if (this.isAdmin) {
                // Allow access to all tanks
            }
            // Manager can only see tanks of their own department
            else if (this.isManager) {
                const userDepartment = await this.pb.collection('users').getOne(this.record.id, {
                    expand: 'department'
                });
                if (!userDepartment.department || userDepartment.department.id !== department.id) {
                    throw new Error('You can only view tanks of your own department');
                }
            }
            // Operator can only see tanks of their own department
            else {
                const userDepartment = await this.pb.collection('users').getOne(this.record.id, {
                    expand: 'department'
                });
                if (!userDepartment.department || userDepartment.department.id !== department.id) {
                    throw new Error('You can only view tanks of your own department');
                }
            }

            // Get tanks linked to this department
            const tanks = await this.pb.collection('tanks').getList(1, 50, {
                filter: `department = "${department.id}"`,
                expand: 'department'
            });

            return {
                success: true,
                data: {
                    items: tanks.items.map(tank => ({
                        id: tank.id,
                        name: tank.name,
                        description: tank.description,
                        status: tank.status,
                        department: department.name
                    })),
                    totalItems: tanks.totalItems
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