const PocketBase = require('pocketbase/cjs');
const BaseService = require('./base.service');

class UserService extends BaseService {
    // Valid roles from PocketBase schema
    static VALID_ROLES = ['admin', 'manager', 'operator'];
    static VALID_STATUSES = ['active', 'inactive'];

    constructor(auth = {}) {
        super(auth);
        this.isAdmin = auth.record?.role === 'admin';
        this.isManager = auth.record?.role === 'manager';
    }

    // Basic operations
    async getById(userId) {
        try {
            const user = await this.pb.collection('users').getOne(userId, {
                expand: 'department'
            });
            
            // Set default status to active if not set
            if (!user.status) {
                user.status = 'active';
                await this.pb.collection('users').update(userId, {
                    status: 'active'
                });
            }

            // Transform department to include both id and name
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

    async create(data) {
        try {
            // Validate required fields
            if (!data.email || !data.password || !data.name) {
                throw new Error('Email, password and name are required');
            }

            // Check if email already exists
            try {
                await this.pb.collection('users').getFirstListItem(`email = "${data.email}"`);
                throw new Error('Email already exists');
            } catch (err) {
                // Email not found - proceed with creation
                if (err.status !== 404) {
                    throw err;
                }
            }

            // Set default values
            data.role = data.role || 'operator';
            data.status = data.status || 'active';
            data.emailVisibility = true;
            data.passwordConfirm = data.password;
            
            // Validate role
            if (!UserService.VALID_ROLES.includes(data.role)) {
                throw new Error(`Invalid role. Must be one of: ${UserService.VALID_ROLES.join(', ')}`);
            }

            // Validate status
            if (!UserService.VALID_STATUSES.includes(data.status)) {
                throw new Error(`Invalid status. Must be one of: ${UserService.VALID_STATUSES.join(', ')}`);
            }

            // Handle department by name or ID
            let departmentId = null;
            if (data.department) {
                // Get all departments
                const departments = await this.pb.collection('departments').getFullList();
                
                // Try to find department by ID first
                const deptById = departments.find(d => d.id === data.department);
                if (deptById) {
                    departmentId = data.department;
                } else {
                    // If not found by ID, try to find by name
                    const deptByName = departments.find(d => d.name === data.department);
                    if (deptByName) {
                        departmentId = deptByName.id;
                    } else {
                        throw new Error(`Department not found: ${data.department}. Available departments: ${departments.map(d => d.name).join(', ')}`);
                    }
                }
            }

            // Create user
            const user = await this.pb.collection('users').create({
                ...data,
                department: departmentId
            });
            
            // Get full user data with expanded department
            const fullUser = await this.pb.collection('users').getOne(user.id, {
                expand: 'department'
            });

            // Transform department to include both id and name
            return {
                ...fullUser,
                department: fullUser.department ? {
                    id: fullUser.department,
                    name: fullUser.expand?.department?.name || 'Unknown'
                } : null
            };
        } catch (error) {
            console.error('Create user error:', error);
            throw error;
        }
    }

    async update(userId, data) {
        // Allow users to update their own profile
        if (this.record.id === userId) {
            try {
                // Validate role if provided
                if (data.role && !UserService.VALID_ROLES.includes(data.role)) {
                    throw new Error(`Invalid role. Must be one of: ${UserService.VALID_ROLES.join(', ')}`);
                }

                // Validate status if provided
                if (data.status && !UserService.VALID_STATUSES.includes(data.status)) {
                    throw new Error(`Invalid status. Must be one of: ${UserService.VALID_STATUSES.join(', ')}`);
                }

                // Handle password update
                if (data.password) {
                    if (!data.oldPassword) {
                        throw new Error('Old password is required to update password');
                    }
                    data.passwordConfirm = data.password;
                }
                
                return await this.pb.collection('users').update(userId, data);
            } catch (error) {
                console.error('Update user error:', error);
                throw error;
            }
        }

        // For other users' profiles
        if (!this.isAdmin && !this.isManager) {
            throw new Error('Only admin or manager can update other users');
        }

        try {
            // Validate role if provided
            if (data.role && !UserService.VALID_ROLES.includes(data.role)) {
                throw new Error(`Invalid role. Must be one of: ${UserService.VALID_ROLES.join(', ')}`);
            }

            // Validate status if provided
            if (data.status && !UserService.VALID_STATUSES.includes(data.status)) {
                throw new Error(`Invalid status. Must be one of: ${UserService.VALID_STATUSES.join(', ')}`);
            }

            // Handle password update for admin/manager
            if (data.password) {
                data.passwordConfirm = data.password;
            }
            
            return await this.pb.collection('users').update(userId, data);
        } catch (error) {
            console.error('Update user error:', error);
            throw error;
        }
    }

    async delete(userId) {
        if (!this.isAdmin) {
            throw new Error('Only admin can delete users');
        }

        try {
            // Check if user has any department access
            const accessRecords = await this.pb.collection('department_user_access').getFullList({
                filter: `user = "${userId}"`
            });
            
            // Delete all department access relationships first if they exist
            if (accessRecords && accessRecords.length > 0) {
                console.log(`Deleting ${accessRecords.length} department access records for user ${userId}`);
                for (const record of accessRecords) {
                    await this.pb.collection('department_user_access').delete(record.id);
                }
            }

            // Then delete the user
            await this.pb.collection('users').delete(userId);
            
            return {
                success: true,
                message: `User ${userId} deleted successfully`
            };
        } catch (error) {
            console.error('Delete user error:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    async list(queryParams = {}) {
        if (!this.isAdmin && !this.isManager) {
            throw new Error('Only admin or manager can list users');
        }

        try {
            const { 
                page = 1, 
                perPage = 50,
                status
            } = queryParams;

            const options = {
                sort: '-created',
                expand: 'department'
            };

            // Add status filter if provided
            if (status) {
                if (!UserService.VALID_STATUSES.includes(status)) {
                    throw new Error(`Invalid status. Must be one of: ${UserService.VALID_STATUSES.join(', ')}`);
                }
                options.filter = `status = "${status}"`;
            }

            const allUsers = await this.pb.collection('users').getFullList(options);

            // Transform users to include both department id and name
            const transformedUsers = allUsers.map(user => ({
                ...user,
                department: user.department ? {
                    id: user.department,
                    name: user.expand?.department?.name || 'Unknown'
                } : null
            }));

            // Manual pagination
            const start = (parseInt(page) - 1) * parseInt(perPage);
            const end = start + parseInt(perPage);
            const items = transformedUsers.slice(start, end);

            return {
                items,
                page: parseInt(page),
                perPage: parseInt(perPage),
                totalItems: transformedUsers.length,
                totalPages: Math.ceil(transformedUsers.length / parseInt(perPage))
            };
        } catch (error) {
            console.error('List users error:', error);
            throw error;
        }
    }

    async bulkUpdate(userIds, data) {
        if (!this.isAdmin) {
            throw new Error('Only admin can perform bulk operations');
        }

        try {
            // Validate role if provided
            if (data.role && !UserService.VALID_ROLES.includes(data.role)) {
                throw new Error(`Invalid role. Must be one of: ${UserService.VALID_ROLES.join(', ')}`);
            }

            // Validate status if provided
            if (data.status && !UserService.VALID_STATUSES.includes(data.status)) {
                throw new Error(`Invalid status. Must be one of: ${UserService.VALID_STATUSES.join(', ')}`);
            }

            const results = await Promise.all(
                userIds.map(id => this.update(id, data))
            );
            return results;
        } catch (error) {
            console.error('Bulk update error:', error);
            throw error;
        }
    }

    async bulkDelete(userIds) {
        if (!this.isAdmin) {
            throw new Error('Only admin can perform bulk operations');
        }

        try {
            const results = await Promise.all(
                userIds.map(id => this.delete(id))
            );
            return results;
        } catch (error) {
            console.error('Bulk delete error:', error);
            throw error;
        }
    }

    // Special operation that requires super admin
    async verify(userId) {
        if (!this.isAdmin) {
            throw new Error('Only admin can verify users');
        }

        try {
            // Create new PB instance for super admin
            const pb = new PocketBase(process.env.PB_URL);
            
            // Login as super admin
            await pb.admins.authWithPassword(
                process.env.POCKETBASE_SUPER_ADMIN_EMAIL,
                process.env.POCKETBASE_SUPER_ADMIN_PASSWORD
            );

            // Update user verified status
            const result = await pb.collection('users').update(userId, {
                verified: true
            });

            return result;
        } catch (error) {
            console.error('Verify user error:', error);
            throw error;
        }
    }

    async deleteByUsername(username) {
        if (!this.isAdmin) {
            throw new Error('Only admin can delete users');
        }

        try {
            // Find user by username first
            const users = await this.pb.collection('users').getFullList({
                filter: `username = "${username}"`
            });

            if (!users || users.length === 0) {
                return {
                    success: false,
                    message: `User with username ${username} not found`
                };
            }

            const user = users[0];
            
            // Check if user has any department access
            const accessRecords = await this.pb.collection('department_user_access').getFullList({
                filter: `user = "${user.id}"`
            });
            
            // Delete all department access relationships first if they exist
            if (accessRecords && accessRecords.length > 0) {
                console.log(`Deleting ${accessRecords.length} department access records for user ${username}`);
                for (const record of accessRecords) {
                    await this.pb.collection('department_user_access').delete(record.id);
                }
            }

            // Then delete the user
            await this.pb.collection('users').delete(user.id);
            
            return {
                success: true,
                message: `User ${username} deleted successfully`
            };
        } catch (error) {
            console.error('Delete user by username error:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    async deleteByEmail(email) {
        if (!this.isAdmin) {
            throw new Error('Only admin can delete users');
        }

        try {
            // Find user by email first
            const users = await this.pb.collection('users').getFullList({
                filter: `email = "${email}"`
            });

            if (!users || users.length === 0) {
                return {
                    success: false,
                    message: `User with email ${email} not found`
                };
            }

            const user = users[0];
            
            // Check if user has any department access
            const accessRecords = await this.pb.collection('department_user_access').getFullList({
                filter: `user = "${user.id}"`
            });
            
            // Delete all department access relationships first if they exist
            if (accessRecords && accessRecords.length > 0) {
                console.log(`Deleting ${accessRecords.length} department access records for user ${email}`);
                for (const record of accessRecords) {
                    await this.pb.collection('department_user_access').delete(record.id);
                }
            }

            // Then delete the user
            await this.pb.collection('users').delete(user.id);
            
            return {
                success: true,
                message: `User ${email} deleted successfully`
            };
        } catch (error) {
            console.error('Delete user by email error:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    async updateByEmail(email, data) {
        if (!this.isAdmin) {
            throw new Error('Only admin can update users');
        }

        try {
            // Find user by email first
            const users = await this.pb.collection('users').getFullList({
                filter: `email = "${email}"`
            });

            if (!users || users.length === 0) {
                return {
                    success: false,
                    message: `User with email ${email} not found`
                };
            }

            const user = users[0];
            
            // Validate role if provided
            if (data.role && !UserService.VALID_ROLES.includes(data.role)) {
                throw new Error(`Invalid role. Must be one of: ${UserService.VALID_ROLES.join(', ')}`);
            }

            // Validate status if provided
            if (data.status && !UserService.VALID_STATUSES.includes(data.status)) {
                throw new Error(`Invalid status. Must be one of: ${UserService.VALID_STATUSES.join(', ')}`);
            }

            // Update the user
            const updatedUser = await this.pb.collection('users').update(user.id, data);
            
            return {
                success: true,
                message: `User ${email} updated successfully`,
                data: updatedUser
            };
        } catch (error) {
            console.error('Update user by email error:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }
}

module.exports = UserService; 