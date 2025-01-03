const BaseService = require('./base.service');
const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL);

class TankService extends BaseService {
    constructor({ token, record }) {
        super(token);
        this.record = record;
        this.redis = redis;
    }

    async create(tankData) {
        try {
            // Validate required fields
            const { name, tank_id } = tankData;
            if (!name || !tank_id) {
                throw {
                    status: 400,
                    message: "name and tank_id are required",
                    data: {}
                };
            }

            // Set default values
            const data = {
                name: tankData.name,
                tank_id: tankData.tank_id,
                description: tankData.description || '',
                capacity: tankData.capacity || 0,
                percentage: tankData.percentage || 0,
                status: tankData.status || 'active',
                device_key: this.generateDeviceKey()
            };

            // Create tank directly in PocketBase
            const tank = await this.pb.collection('tanks').create(data);
            
            return {
                success: true,
                data: tank
            };
        } catch (error) {
            console.error('Failed to create tank:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    async isManagerOfDepartment(userId, departmentId) {
        try {
            const filter = `department="${departmentId}" && user="${userId}"`;
            const access = await this.pb.collection('department_user_access').getFirstListItem(filter);
            return access && access.role === 'manager';
        } catch (error) {
            return false;
        }
    }

    async list(options = {}) {
        try {
            const { page = 1, perPage = 50, status, department, search } = options;
            
            // Generate cache key based on query parameters
            const cacheKey = `tanks:list:${JSON.stringify(options)}`;
            
            // Try get from cache first
            const cached = await this.redis.get(cacheKey);
            if (cached) {
                return {
                    success: true,
                    data: JSON.parse(cached)
                };
            }

            // If not in cache, get from DB
            const filter = [];
            if (status) {
                filter.push(`status = "${status}"`);
            }
            if (department) {
                filter.push(`department = "${department}"`);
            }
            if (search) {
                filter.push(`(name ~ "${search}" || tank_id ~ "${search}")`);
            }

            const tanks = await this.pb.collection('tanks').getList(
                page,
                perPage,
                {
                    filter: filter.length > 0 ? filter.join(' && ') : '',
                    sort: options.sort || '-created',
                    expand: 'department'
                }
            );

            const result = {
                page: tanks.page,
                perPage: tanks.perPage,
                totalItems: tanks.totalItems,
                totalPages: tanks.totalPages,
                items: tanks.items
            };

            // Save to cache for 2 minutes
            await this.redis.setex(
                cacheKey,
                120,
                JSON.stringify(result)
            );

            return {
                success: true,
                data: result
            };
        } catch (error) {
            console.error('Failed to list tanks:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    async getById(id) {
        try {
            const tank = await this.pb.collection('tanks').getOne(id, {
                expand: 'department'
            });

            // Check if user has access to this tank's department
            if (this.record.role !== 'admin') {
                const userAccess = await this.pb.collection('department_user_access').getFirstListItem(
                    `user="${this.record.id}" && department="${tank.department}"`
                ).catch(() => null);

                if (!userAccess) {
                    throw new Error('Not authorized to access this tank');
                }
            }

            return {
                success: true,
                data: tank
            };
        } catch (error) {
            console.error('Failed to get tank:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    async update(id, tankData) {
        try {
            // Get the tank first
            const tank = await this.pb.collection('tanks').getOne(id);

            // Check if user is admin or a manager of the department
            if (this.record.role !== 'admin') {
                const isManager = await this.isManagerOfDepartment(this.record.id, tank.department);
                if (!isManager) {
                    throw new Error('Only department managers can update tanks');
                }
            }

            // Validate percentage if provided
            if (tankData.percentage !== undefined) {
                if (tankData.percentage < 0 || tankData.percentage > 100) {
                    throw {
                        status: 400,
                        message: "Percentage must be between 0 and 100",
                        data: {}
                    };
                }
            }

            const updatedTank = await this.pb.collection('tanks').update(id, tankData);
            return {
                success: true,
                data: updatedTank
            };
        } catch (error) {
            console.error('Failed to update tank:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    async delete(id) {
        try {
            // Get the tank first
            const tank = await this.pb.collection('tanks').getOne(id);

            // Check if user is admin or a manager of the department
            if (this.record.role !== 'admin') {
                const isManager = await this.isManagerOfDepartment(this.record.id, tank.department);
                if (!isManager) {
                    throw new Error('Only department managers can delete tanks');
                }
            }

            // Check if tank has any assigned operators
            const assignedOperators = await this.pb.collection('department_user_access').getList(1, 1, {
                filter: `tank_permissions.${id} != null && department="${tank.department}"`
            });

            if (assignedOperators.totalItems > 0) {
                throw new Error('Cannot delete tank with assigned operators');
            }

            await this.pb.collection('tanks').delete(id);
            return {
                success: true,
                message: 'Tank deleted successfully'
            };
        } catch (error) {
            console.error('Failed to delete tank:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    async updatePercentageFromDevice(id, percentage, deviceKey) {
        try {
            // Get the tank first
            const tank = await this.pb.collection('tanks').getOne(id);

            // Validate device key
            if (!deviceKey || tank.device_key !== deviceKey) {
                throw new Error('Invalid device key');
            }

            // Validate percentage
            if (percentage < 0 || percentage > 100) {
                throw new Error('Percentage must be between 0 and 100');
            }

            const updatedTank = await this.pb.collection('tanks').update(id, {
                percentage,
                last_signal_time: new Date().toISOString()
            });

            return {
                success: true,
                data: updatedTank
            };
        } catch (error) {
            console.error('Failed to update tank percentage:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    generateDeviceKey() {
        return require('crypto').randomBytes(16).toString('hex');
    }

    async getByTankId(tankId) {
        try {
            const result = await this.pb.collection('tanks').getFirstListItem(`tank_id="${tankId}"`, {
                expand: 'department'
            });

            return {
                success: true,
                data: result
            };
        } catch (error) {
            console.error('Failed to get tank by tank_id:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    async updateByTankId(tankId, tankData) {
        try {
            // Get the tank first
            const tank = await this.pb.collection('tanks').getFirstListItem(`tank_id="${tankId}"`);

            // Check if user is admin or a manager of the department
            if (this.record.role !== 'admin') {
                const isManager = await this.isManagerOfDepartment(this.record.id, tank.department);
                if (!isManager) {
                    throw new Error('Only department managers can update tanks');
                }
            }

            // Validate percentage if provided
            if (tankData.percentage !== undefined) {
                if (tankData.percentage < 0 || tankData.percentage > 100) {
                    throw {
                        status: 400,
                        message: "Percentage must be between 0 and 100",
                        data: {}
                    };
                }
            }

            const updatedTank = await this.pb.collection('tanks').update(tank.id, tankData);
            return {
                success: true,
                data: updatedTank
            };
        } catch (error) {
            console.error('Failed to update tank:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    async deleteByTankId(tankId) {
        try {
            // Get the tank first
            const tank = await this.pb.collection('tanks').getFirstListItem(`tank_id="${tankId}"`);

            // Check if user is admin or a manager of the department
            if (this.record.role !== 'admin') {
                const isManager = await this.isManagerOfDepartment(this.record.id, tank.department);
                if (!isManager) {
                    throw new Error('Only department managers can delete tanks');
                }
            }

            // Check if tank has any assigned operators
            const assignedOperators = await this.pb.collection('department_user_access').getList(1, 1, {
                filter: `tank_permissions.${tank.id} != null && department="${tank.department}"`
            });

            if (assignedOperators.totalItems > 0) {
                throw new Error('Cannot delete tank with assigned operators');
            }

            await this.pb.collection('tanks').delete(tank.id);
            return {
                success: true,
                message: 'Tank deleted successfully'
            };
        } catch (error) {
            console.error('Failed to delete tank:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    async updateProgressByTankId(tankId, percentage) {
        try {
            // Get the tank first
            const tank = await this.pb.collection('tanks').getFirstListItem(`tank_id="${tankId}"`);

            // Validate percentage
            if (percentage < 0 || percentage > 100) {
                throw {
                    status: 400,
                    message: "Percentage must be between 0 and 100",
                    data: {}
                };
            }

            const updatedTank = await this.pb.collection('tanks').update(tank.id, {
                percentage,
                last_signal_time: new Date().toISOString()
            });

            return {
                success: true,
                data: updatedTank
            };
        } catch (error) {
            console.error('Failed to update tank progress:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    async assignToDepartment(tankId, departmentName) {
        try {
            // Get tank by tank_id
            const tank = await this.pb.collection('tanks').getFirstListItem(`tank_id="${tankId}"`);
            if (!tank) {
                throw new Error('Tank not found');
            }

            // Get department by name
            const department = await this.pb.collection('departments').getFirstListItem(`name="${departmentName}"`);
            if (!department) {
                throw new Error('Department not found');
            }

            // Check if user is admin or manager of the department
            if (this.record.role !== 'admin') {
                const isManager = await this.isManagerOfDepartment(this.record.id, department.id);
                if (!isManager) {
                    throw new Error('Only department managers can assign tanks');
                }
            }

            // Update tank with new department
            const updatedTank = await this.pb.collection('tanks').update(tank.id, {
                department: department.id
            });

            return {
                success: true,
                data: updatedTank
            };
        } catch (error) {
            console.error('Failed to assign tank:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    /**
     * Import tanks from data
     * @param {object[]} tanks - Array of tank data to import
     * @returns {Promise<object>} - Result of the import operation
     */
    async importTanks(tanks) {
        if (!Array.isArray(tanks)) {
            throw new Error('Invalid data format. Expected array of tanks');
        }

        try {
            const results = [];
            const total = tanks.length;
            let processed = 0;

            for (const tankData of tanks) {
                try {
                    // Check if tank with same tank_id already exists
                    const existingTank = await this.pb.collection('tanks').getFirstListItem(`tank_id="${tankData.tank_id}"`).catch(() => null);
                    if (existingTank) {
                        results.push({
                            tank_id: tankData.tank_id,
                            success: false,
                            error: 'Tank with this ID already exists'
                        });
                    } else {
                        // Create new tank
                        const tank = await this.pb.collection('tanks').create({
                            ...tankData,
                            created: new Date().toISOString(),
                            updated: new Date().toISOString()
                        });

                        results.push({
                            tank_id: tankData.tank_id,
                            success: true,
                            data: tank
                        });
                    }
                } catch (error) {
                    results.push({
                        tank_id: tankData.tank_id,
                        success: false,
                        error: error.message
                    });
                }

                processed++;
                console.log(`Progress: ${Math.round((processed / total) * 100)}%`);
            }

            return {
                success: true,
                data: {
                    total: total,
                    successful: results.filter(r => r.success).length,
                    failed: results.filter(r => !r.success).length,
                    results: results
                }
            };
        } catch (error) {
            throw new Error(`Failed to import tanks: ${error.message}`);
        }
    }

    /**
     * Get import history
     * @returns {Promise<object>} - Import history records
     */
    async getImportHistory() {
        try {
            const imports = await this.pb.collection('tank_imports').getFullList({
                sort: '-imported_at',
                expand: 'imported_by'
            });

            return {
                success: true,
                data: imports
            };
        } catch (error) {
            throw new Error(`Failed to get import history: ${error.message}`);
        }
    }

    async importFromCSV(file) {
        try {
            // Parse CSV file
            const csv = require('csv-parse/sync');
            const content = file.buffer.toString();
            const records = csv.parse(content, {
                columns: true,
                skip_empty_lines: true
            });

            // Convert CSV records to tank format
            const tanks = records.map(record => ({
                name: record.name,
                tank_id: record.tank_id,
                description: record.description,
                capacity: parseInt(record.capacity) || 0,
                percentage: parseInt(record.percentage) || 0,
                status: record.status || 'active'
            }));

            // Import tanks
            return await this.importTanks({ tanks });
        } catch (error) {
            console.error('Import from CSV failed:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    async getTankIdByTankId(tankId) {
        try {
            const tank = await this.pb.collection('tanks').getFirstListItem(`tank_id="${tankId}"`);
            return tank.id;
        } catch (error) {
            throw new Error('Tank not found');
        }
    }

    /**
     * Transfer tank between departments
     * @param {string} tankId - ID of the tank to transfer
     * @param {string} fromDepartmentId - Source department ID
     * @param {string} toDepartmentId - Target department ID
     * @returns {Promise<object>} - Result of the transfer operation
     */
    async transferTank(tankId, fromDepartmentId, toDepartmentId) {
        try {
            // Get tank details
            const tank = await this.pb.collection('tanks').getOne(tankId);
            if (!tank) {
                throw new Error('Tank not found');
            }

            // Verify current department
            if (tank.department !== fromDepartmentId) {
                throw new Error('Tank is not in the specified source department');
            }

            // Check user permissions for both departments
            const userDepartments = await this.pb.collection('user_departments').getFullList({
                filter: `user="${this.record.id}" && (department="${fromDepartmentId}" || department="${toDepartmentId}")`,
                expand: 'department'
            });

            const hasSourceAccess = userDepartments.some(ud => ud.department === fromDepartmentId);
            const hasTargetAccess = userDepartments.some(ud => ud.department === toDepartmentId);

            if (!hasSourceAccess || !hasTargetAccess) {
                throw new Error('Insufficient permissions to transfer tank between these departments');
            }

            // Update tank department
            const updatedTank = await this.pb.collection('tanks').update(tankId, {
                department: toDepartmentId,
                updated: new Date().toISOString()
            });

            // Create transfer record
            const transfer = await this.pb.collection('tank_transfers').create({
                tank: tankId,
                from_department: fromDepartmentId,
                to_department: toDepartmentId,
                transferred_by: this.record.id,
                transferred_at: new Date().toISOString()
            });

            return {
                success: true,
                data: {
                    tank: updatedTank,
                    transfer: transfer
                }
            };
        } catch (error) {
            throw new Error(`Failed to transfer tank: ${error.message}`);
        }
    }

    async updateStatus(tankId, status) {
        try {
            // Validate status
            const validStatuses = ['active', 'inactive', 'maintenance'];
            if (!validStatuses.includes(status)) {
                throw {
                    status: 400,
                    message: "Invalid status. Must be one of: active, inactive, maintenance",
                    data: {}
                };
            }

            // Get the tank first
            const tank = await this.pb.collection('tanks').getOne(tankId);

            // Check if user is admin or has permission
            if (this.record && this.record.role !== 'admin') {
                const isManager = await this.isManagerOfDepartment(this.record.id, tank.department);
                if (!isManager) {
                    throw new Error('Only department managers can update tank status');
                }
            }

            const updatedTank = await this.pb.collection('tanks').update(tankId, { 
                status,
                last_signal_time: new Date().toISOString()
            });

            return {
                success: true,
                data: updatedTank
            };
        } catch (error) {
            console.error('Failed to update tank status:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    async getStatistics() {
        try {
            // Get total tanks
            const totalResult = await this.pb.collection('tanks').getList(1, 1);
            const total = totalResult.totalItems;

            // Get active tanks
            const activeResult = await this.pb.collection('tanks').getList(1, 1, {
                filter: 'status = "active"'
            });
            const active = activeResult.totalItems;

            // Get inactive tanks
            const inactiveResult = await this.pb.collection('tanks').getList(1, 1, {
                filter: 'status = "inactive"'
            });
            const inactive = inactiveResult.totalItems;

            // Get maintenance tanks
            const maintenanceResult = await this.pb.collection('tanks').getList(1, 1, {
                filter: 'status = "maintenance"'
            });
            const maintenance = maintenanceResult.totalItems;

            return {
                success: true,
                data: {
                    total,
                    active,
                    inactive,
                    maintenance
                }
            };
        } catch (error) {
            console.error('Failed to get tank statistics:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    /**
     * Batch update tanks
     * @param {string[]} ids - Array of tank IDs to update
     * @param {object} data - Data to update
     * @returns {Promise<object>} - Result of the batch update operation
     */
    async batchUpdate(ids, data) {
        try {
            const results = await Promise.all(
                ids.map(async (id) => {
                    try {
                        const tank = await this.pb.collection('tanks').update(id, data);
                        return {
                            id,
                            success: true,
                            data: tank
                        };
                    } catch (error) {
                        return {
                            id,
                            success: false,
                            error: error.message
                        };
                    }
                })
            );

            return {
                success: true,
                data: results
            };
        } catch (error) {
            throw new Error(`Failed to batch update tanks: ${error.message}`);
        }
    }

    /**
     * Batch delete tanks
     * @param {string[]} ids - Array of tank IDs to delete
     * @returns {Promise<object>} - Result of the batch delete operation
     */
    async batchDelete(ids) {
        try {
            const results = await Promise.all(
                ids.map(async (id) => {
                    try {
                        await this.pb.collection('tanks').delete(id);
                        return {
                            id,
                            success: true
                        };
                    } catch (error) {
                        return {
                            id,
                            success: false,
                            error: error.message
                        };
                    }
                })
            );

            return {
                success: true,
                data: results
            };
        } catch (error) {
            throw new Error(`Failed to batch delete tanks: ${error.message}`);
        }
    }

    /**
     * Get import progress
     * @param {string} importId - ID of the import operation
     * @returns {Promise<object>} - Import progress details
     */
    async getImportProgress(importId) {
        try {
            const importRecord = await this.pb.collection('tank_imports').getOne(importId, {
                expand: 'imported_by'
            });

            if (!importRecord) {
                throw new Error('Import record not found');
            }

            // Calculate progress percentage
            const progress = Math.round(
                ((importRecord.successful_imports + importRecord.failed_imports) / 
                importRecord.total_tanks) * 100
            );

            return {
                success: true,
                data: {
                    import_id: importRecord.id,
                    status: importRecord.status || 'completed',
                    progress: progress,
                    total_tanks: importRecord.total_tanks,
                    successful_imports: importRecord.successful_imports,
                    failed_imports: importRecord.failed_imports,
                    started_at: importRecord.imported_at,
                    completed_at: importRecord.completed_at || null,
                    imported_by: importRecord.expand?.imported_by || null
                }
            };
        } catch (error) {
            throw new Error(`Failed to get import progress: ${error.message}`);
        }
    }
}

module.exports = TankService; 