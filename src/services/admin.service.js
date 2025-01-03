const BaseService = require('./base.service');

class AdminService extends BaseService {
    async listUsers(filter = {}, sort = '-created') {
        try {
            console.log('Input filter:', filter);
            const filterArr = Object.entries(filter)
                .map(([key, value]) => `${key} = "${value}"`);
            console.log('Filter array:', filterArr);
            
            return await this.pb.collection('users').getList(1, 50, {
                filter: filterArr.length > 0 ? filterArr.join(' && ') : '',
                sort
            });
        } catch (error) {
            console.error('List users failed:', error);
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

    async getUser(userId) {
        try {
            return await this.pb.collection('users').getOne(userId);
        } catch (error) {
            console.error('Get user failed:', error);
            throw error;
        }
    }

    async updateUser(userId, data) {
        try {
            return await this.pb.collection('users').update(userId, data);
        } catch (error) {
            console.error('Update user failed:', error);
            throw error;
        }
    }

    async deleteUser(userId) {
        try {
            return await this.pb.collection('users').delete(userId);
        } catch (error) {
            console.error('Delete user failed:', error);
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

    async createDepartment(data) {
        try {
            return await this.pb.collection('departments').create(data);
        } catch (error) {
            console.error('Create department failed:', error);
            throw error;
        }
    }

    async listDepartments() {
        try {
            return await this.pb.collection('departments').getList(1, 50);
        } catch (error) {
            console.error('List departments failed:', error);
            throw error;
        }
    }

    async getDepartment(departmentId) {
        try {
            return await this.pb.collection('departments').getOne(departmentId);
        } catch (error) {
            console.error('Get department failed:', error);
            throw error;
        }
    }

    async updateDepartment(departmentId, data) {
        try {
            return await this.pb.collection('departments').update(departmentId, data);
        } catch (error) {
            console.error('Update department failed:', error);
            throw error;
        }
    }

    async deleteDepartment(departmentId) {
        try {
            return await this.pb.collection('departments').delete(departmentId);
        } catch (error) {
            console.error('Delete department failed:', error);
            throw error;
        }
    }

    // Bulk operations
    async bulkDeleteUsers(userIds) {
        try {
            const results = [];
            for (const userId of userIds) {
                try {
                    await this.pb.collection('users').delete(userId);
                    results.push({ id: userId, success: true });
                } catch (error) {
                    results.push({ id: userId, success: false, error: error.message });
                }
            }
            return results;
        } catch (error) {
            console.error('Bulk delete users failed:', error);
            throw error;
        }
    }

    async bulkUpdateUsers(userIds, data) {
        try {
            const results = [];
            for (const userId of userIds) {
                try {
                    const user = await this.pb.collection('users').update(userId, data);
                    results.push({ id: userId, success: true, data: user });
                } catch (error) {
                    results.push({ id: userId, success: false, error: error.message });
                }
            }
            return results;
        } catch (error) {
            console.error('Bulk update users failed:', error);
            throw error;
        }
    }

    async bulkVerifyUsers(userIds) {
        try {
            return await this.bulkUpdateUsers(userIds, { verified: true });
        } catch (error) {
            console.error('Bulk verify users failed:', error);
            throw error;
        }
    }

    // Export users
    async exportUsers(format = 'csv', filter = {}) {
        try {
            const users = await this.listUsers(filter);
            
            if (format === 'csv') {
                const fields = ['id', 'email', 'name', 'role', 'department', 'created', 'updated', 'verified'];
                const csv = [fields.join(',')];
                
                for (const user of users.items) {
                    const row = fields.map(field => {
                        const value = user[field];
                        return value ? `"${value}"` : '""';
                    });
                    csv.push(row.join(','));
                }
                
                return csv.join('\n');
            }
            
            throw new Error('Unsupported export format');
        } catch (error) {
            console.error('Export users failed:', error);
            throw error;
        }
    }

    // Reset user password
    async resetUserPassword(userId, newPassword) {
        try {
            return await this.pb.collection('users').update(userId, {
                password: newPassword,
                passwordConfirm: newPassword
            });
        } catch (error) {
            console.error('Reset user password failed:', error);
            throw error;
        }
    }

    // Get user permissions
    async getUserPermissions(userId) {
        try {
            const departmentAccess = await this.pb.collection('department_user_access').getList(1, 50, {
                filter: `user="${userId}"`,
                expand: 'department'
            });

            const permissions = {
                departments: departmentAccess.items.map(access => ({
                    id: access.department,
                    role: access.role,
                    name: access.expand?.department?.name,
                    permissions: access.permissions || {}
                }))
            };

            return permissions;
        } catch (error) {
            console.error('Get user permissions failed:', error);
            throw error;
        }
    }

    // Update user permissions
    async updateUserPermissions(userId, permissions) {
        try {
            const results = [];
            for (const deptPerm of permissions.departments) {
                try {
                    const filter = `user="${userId}" && department="${deptPerm.id}"`;
                    const existingAccess = await this.pb.collection('department_user_access').getFirstListItem(filter);
                    
                    if (existingAccess) {
                        const updated = await this.pb.collection('department_user_access').update(existingAccess.id, {
                            role: deptPerm.role,
                            permissions: deptPerm.permissions
                        });
                        results.push({ department: deptPerm.id, success: true, data: updated });
                    } else {
                        const created = await this.pb.collection('department_user_access').create({
                            user: userId,
                            department: deptPerm.id,
                            role: deptPerm.role,
                            permissions: deptPerm.permissions
                        });
                        results.push({ department: deptPerm.id, success: true, data: created });
                    }
                } catch (error) {
                    results.push({ department: deptPerm.id, success: false, error: error.message });
                }
            }
            return results;
        } catch (error) {
            console.error('Update user permissions failed:', error);
            throw error;
        }
    }
}

module.exports = AdminService;
