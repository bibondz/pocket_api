const BaseService = require('./base.service');
const Redis = require('ioredis');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const zlib = require('zlib');
const { promisify } = require('util');
const gzip = promisify(zlib.gzip);
const LineNotify = process.env.LINE_NOTIFY_TOKEN ? require('line-notify-nodejs')(process.env.LINE_NOTIFY_TOKEN) : null;
const crypto = require('crypto');

// สร้าง Redis connection สำหรับ primary และ replica
const redisPrimary = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 5051,
    password: process.env.REDIS_PASSWORD || 'AhYa7Y890',
    retryStrategy: function(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
    }
});

const redisReplica = new Redis({
    host: process.env.REDIS_REPLICA_HOST || process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_REPLICA_PORT) || parseInt(process.env.REDIS_PORT) || 5051,
    password: process.env.REDIS_REPLICA_PASSWORD || process.env.REDIS_PASSWORD || 'AhYa7Y890',
    retryStrategy: function(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
    }
});

class TankService extends BaseService {
    constructor({ token = null, record = null } = {}) {
        super({ token, record });
        this.redis = redisPrimary;
        this.redisReplica = redisReplica;
        
        // เริ่มระบบ backup อัตโนมัติ
        this.initializeBackupSystem();
    }

    generateDeviceKey() {
        return crypto.randomBytes(16).toString('hex');
    }

    // ระบบ Backup
    initializeBackupSystem() {
        // Backup ทุก 30 นาที
        cron.schedule('*/30 * * * *', () => {
            this.createBackup('hourly');
        });

        // Backup ทุก 6 ชั่วโมง
        cron.schedule('0 */6 * * *', () => {
            this.createBackup('daily');
        });

        // Backup ทุก 3 วัน
        cron.schedule('0 0 */3 * *', () => {
            this.createBackup('weekly');
        });

        // Replicate to standby ทุก 2 นาที
        cron.schedule('*/2 * * * *', () => {
            this.replicateToStandby();
        });
    }

    async notifyBackupStatus(type, status, details = '') {
        const emoji = status === 'success' ? '✅' : '❌';
        const message = `${emoji} Redis Backup ${type}\nStatus: ${status}\n${details}`;
        
        try {
            // แจ้งเตือนผ่าน Line Notify ถ้ามีการตั้งค่า token
            if (LineNotify) {
                await LineNotify.notify({
                    message: message
                });
            }

            // แจ้งเตือนผ่าน Redis pub/sub
            await this.redis.publish('backup-status', JSON.stringify({
                type,
                status,
                details,
                timestamp: new Date().toISOString()
            }));

            // Log ไว้ใน Redis
            await this.redis.lpush('backup:logs', JSON.stringify({
                type,
                status,
                details,
                timestamp: new Date().toISOString()
            }));
            await this.redis.ltrim('backup:logs', 0, 999); // เก็บแค่ 1000 logs ล่าสุด
        } catch (error) {
            console.error('Failed to send notification:', error);
        }
    }

    async createBackup(type) {
        try {
            const startTime = Date.now();
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupDir = path.join(__dirname, '../../backups', type);
            
            // Create directory if it doesn't exist
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }

            const backupPath = path.join(backupDir, `redis-backup-${timestamp}.gz`);
            
            // Get all keys from Redis
            const keys = await this.redis.keys('*');
            const data = {};
            
            for (const key of keys) {
                const type = await this.redis.type(key);
                const ttl = await this.redis.ttl(key);
                
                data[key] = {
                    type,
                    ttl: ttl > 0 ? ttl : -1
                };
                
                switch (type) {
                    case 'string':
                        data[key].value = await this.redis.get(key);
                        break;
                        
                    case 'list':
                        data[key].value = await this.redis.lrange(key, 0, -1);
                        break;
                        
                    case 'hash':
                        data[key].value = await this.redis.hgetall(key);
                        break;
                        
                    case 'set':
                        data[key].value = await this.redis.smembers(key);
                        break;
                        
                    case 'zset':
                        data[key].value = await this.redis.zrange(key, 0, -1, 'WITHSCORES');
                        break;
                }
            }

            // Compress data with gzip
            const jsonData = JSON.stringify(data);
            const compressedData = await gzip(jsonData);

            // Save compressed file
            fs.writeFileSync(backupPath, compressedData);

            // Manage old files
            const retentionConfig = {
                'hourly': 48,  // Keep last 48 backups (24 hours)
                'daily': 28,   // Keep last 28 backups (7 days)
                'weekly': 12   // Keep last 12 backups (36 days)
            };

            const files = fs.readdirSync(backupDir);
            if (files.length > retentionConfig[type]) {
                files.sort((a, b) => {
                    return fs.statSync(path.join(backupDir, b)).mtime.getTime() -
                           fs.statSync(path.join(backupDir, a)).mtime.getTime();
                });

                // Delete old files
                for (let i = retentionConfig[type]; i < files.length; i++) {
                    fs.unlinkSync(path.join(backupDir, files[i]));
                }
            }

            const duration = Date.now() - startTime;
            await this.notifyBackupStatus(type, 'success', `Backup completed in ${duration}ms`);
            
            return {
                success: true,
                path: backupPath,
                duration
            };
        } catch (error) {
            console.error('Failed to create backup:', error);
            await this.notifyBackupStatus(type, 'error', error.message);
            throw error;
        }
    }

    async replicateToStandby() {
        try {
            // Get all keys from source Redis
            const keys = await this.redis.keys('*');
            
            // Skip if no keys to replicate
            if (!keys || keys.length === 0) {
                return;
            }
            
            // Process each key
            for (const key of keys) {
                try {
                    // Get the type of the key
                    const type = await this.redis.type(key);
                    
                    switch (type) {
                        case 'string':
                            const value = await this.redis.get(key);
                            const ttl = await this.redis.ttl(key);
                            if (ttl > 0) {
                                await this.redisReplica.setex(key, ttl, value);
                            } else {
                                await this.redisReplica.set(key, value);
                            }
                            break;
                            
                        case 'list':
                            const list = await this.redis.lrange(key, 0, -1);
                            if (list.length > 0) {
                                await this.redisReplica.del(key);
                                await this.redisReplica.rpush(key, ...list);
                            }
                            break;
                            
                        case 'hash':
                            const hash = await this.redis.hgetall(key);
                            if (Object.keys(hash).length > 0) {
                                await this.redisReplica.del(key);
                                await this.redisReplica.hmset(key, hash);
                            }
                            break;
                            
                        case 'set':
                            const set = await this.redis.smembers(key);
                            if (set.length > 0) {
                                await this.redisReplica.del(key);
                                await this.redisReplica.sadd(key, ...set);
                            }
                            break;
                            
                        case 'zset':
                            const zset = await this.redis.zrange(key, 0, -1, 'WITHSCORES');
                            if (zset.length > 0) {
                                await this.redisReplica.del(key);
                                for (let i = 0; i < zset.length; i += 2) {
                                    await this.redisReplica.zadd(key, zset[i + 1], zset[i]);
                                }
                            }
                            break;
                    }
                } catch (error) {
                    console.error(`Failed to replicate key ${key}:`, error);
                }
            }
        } catch (error) {
            console.error('Replication error:', error);
            throw error;
        }
    }

    async restoreFromBackup(backupPath) {
        try {
            // Read and decompress backup file
            const compressedData = fs.readFileSync(backupPath);
            const jsonData = await promisify(zlib.gunzip)(compressedData);
            const data = JSON.parse(jsonData.toString());
            
            // Restore data to Redis
            for (const [key, { type, value, ttl }] of Object.entries(data)) {
                try {
                    // Delete existing key first
                    await this.redis.del(key);
                    
                    switch (type) {
                        case 'string':
                            if (ttl > 0) {
                                await this.redis.setex(key, ttl, value);
                            } else {
                                await this.redis.set(key, value);
                            }
                            break;
                            
                        case 'list':
                            if (value.length > 0) {
                                await this.redis.rpush(key, ...value);
                            }
                            break;
                            
                        case 'hash':
                            if (Object.keys(value).length > 0) {
                                await this.redis.hmset(key, value);
                            }
                            break;
                            
                        case 'set':
                            if (value.length > 0) {
                                await this.redis.sadd(key, ...value);
                            }
                            break;
                            
                        case 'zset':
                            for (let i = 0; i < value.length; i += 2) {
                                await this.redis.zadd(key, value[i + 1], value[i]);
                            }
                            break;
                    }
                    
                    // Set TTL if it exists
                    if (ttl > 0) {
                        await this.redis.expire(key, ttl);
                    }
                } catch (error) {
                    console.error(`Failed to restore key ${key}:`, error);
                }
            }

            console.log(`Restored from backup: ${backupPath}`);
            return true;
        } catch (error) {
            console.error('Failed to restore from backup:', error);
            return false;
        }
    }

    async create(tankData) {
        try {
            // Check if user has create permission
            if (!this.record?.role === 'admin') {
                const hasPermission = await this.checkTankPermission(this.record.id, tankData.department, 'create');
                if (!hasPermission) {
                    return {
                        success: false,
                        message: 'You do not have permission to create tanks in this department'
                    };
                }
            }

            // Required fields validation
            const requiredFields = ['name', 'tank_id', 'status'];
            const missingFields = requiredFields.filter(field => !tankData[field]);
            if (missingFields.length > 0) {
                return {
                    success: false,
                    message: `Missing required fields: ${missingFields.join(', ')}`
                };
            }

            // Validate status
            const validStatuses = ['active', 'inactive', 'maintenance'];
            if (!validStatuses.includes(tankData.status)) {
                return {
                    success: false,
                    message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
                };
            }

            // Validate capacity if provided
            if (tankData.capacity !== undefined) {
                if (typeof tankData.capacity !== 'number' || tankData.capacity < 0) {
                    return {
                        success: false,
                        message: 'If provided, capacity must be a positive number'
                    };
                }
            }

            // Check if tank_id already exists
            const existingTankId = await this.pb.collection('tanks').getFirstListItem(`tank_id = "${tankData.tank_id}"`).catch(() => null);
            if (existingTankId) {
                return {
                    success: false,
                    message: `Tank with ID ${tankData.tank_id} already exists`
                };
            }

            // Get department ID if department name is provided
            let departmentId = null;
            if (tankData.department) {
                try {
                    const department = await this.pb.collection('departments').getFirstListItem(`name = "${tankData.department}"`);
                    departmentId = department.id;
                } catch (error) {
                    return {
                        success: false,
                        message: `Department "${tankData.department}" not found`
                    };
                }
            }

            // Set default values and clean data
            const cleanData = {
                name: tankData.name,
                tank_id: tankData.tank_id,
                capacity: tankData.capacity || 0,
                status: tankData.status,
                description: tankData.description || '',
                percentage: tankData.percentage || 0,
                department: departmentId,
                device_key: this.generateDeviceKey(),
                created: new Date().toISOString(),
                updated: new Date().toISOString()
            };

            // Create tank
            const tank = await this.pb.collection('tanks').create(cleanData, {
                expand: 'department'
            });

            return {
                success: true,
                data: {
                    ...tank,
                    department_name: tank.expand?.department?.name || null
                }
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
            const { 
                page = 1, 
                perPage = 20,
                status, 
                department, 
                search,
                cursor = null
            } = options;
            
            // Generate cache key based on query parameters
            const cacheKey = `tanks:list:${JSON.stringify(options)}`;
            
            // Try get from cache first
            const cached = await this.safeRedisGet(cacheKey);
            if (cached) {
                return {
                    success: true,
                    data: JSON.parse(cached)
                };
            }

            // If not in cache or Redis failed, get from DB
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
            if (cursor) {
                filter.push(`created < "${cursor}"`);
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
                items: tanks.items.map(tank => ({
                    ...tank,
                    department_name: tank.expand?.department?.name || null
                })),
                nextCursor: tanks.items.length > 0 ? tanks.items[tanks.items.length - 1].created : null,
                hasMore: tanks.page < tanks.totalPages
            };

            // Try to save to cache, but continue if Redis fails
            await this.safeRedisSet(cacheKey, JSON.stringify(result), 120);

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
            
            // Invalidate cache
            await this.invalidateCache(tank.tank_id);
            
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
            
            // Invalidate cache
            await this.invalidateCache(tank.tank_id);
            
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

    async getByTankId(tankId) {
        try {
            console.log('Getting tank by tank_id:', tankId);
            
            // Try get from cache first
            const cached = await this.safeRedisGet(`tank:${tankId}:details`);
            if (cached) {
                console.log('Found tank in cache');
                return {
                    success: true,
                    data: JSON.parse(cached)
                };
            }

            console.log('Tank not in cache or Redis failed, getting from DB');
            // Get from DB
            const filter = `tank_id = "${tankId}"`;
            console.log('Using filter:', filter);
            const result = await this.pb.collection('tanks').getFirstListItem(filter, {
                expand: 'department'
            });

            console.log('Found tank in DB:', result);

            // Try to save to cache, but continue if Redis fails
            await this.safeRedisSet(`tank:${tankId}:details`, JSON.stringify(result), 300);

            return {
                success: true,
                data: result
            };
        } catch (error) {
            console.error('Failed to get tank by tank_id:', error.message);
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
            
            // Invalidate cache
            await this.invalidateCache(tankId);
            
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
            console.log('DeleteByTankId - User record:', this.record);
            
            // Get the tank first
            const tank = await this.pb.collection('tanks').getFirstListItem(`tank_id="${tankId}"`);
            if (!tank) {
                throw new Error('Tank not found');
            }

            // Check if user record exists and has admin role
            if (this.record && this.record.role === 'admin') {
                console.log('User is admin, proceeding with deletion');
                await this.pb.collection('tanks').delete(tank.id);
                await this.invalidateCache(tankId);
                return {
                    success: true,
                    message: 'Tank deleted successfully'
                };
            }

            // For non-admin users
            console.log('User is not admin, checking manager permissions');
            const isManager = await this.isManagerOfDepartment(this.record?.id, tank.department);
            if (!isManager) {
                throw new Error('Only department managers or admins can delete tanks');
            }

            // Check assigned operators only for non-admin users
            const assignedOperators = await this.pb.collection('department_user_access').getList(1, 1, {
                filter: `tank_permissions.${tank.id} != null && department="${tank.department}"`
            });

            if (assignedOperators.totalItems > 0) {
                throw new Error('Cannot delete tank with assigned operators');
            }

            await this.pb.collection('tanks').delete(tank.id);
            await this.invalidateCache(tankId);
            
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
            const tankResult = await this.getByTankId(tankId);
            if (!tankResult.success || !tankResult.data) {
                throw new Error('Tank not found');
            }

            const result = await this.pb.collection('tanks').update(tankResult.data.id, {
                percentage: percentage,
                last_signal_time: new Date().toISOString()
            });

            // Invalidate cache
            await this.invalidateCache(tankId);

            return {
                success: true,
                data: result
            };
        } catch (error) {
            console.error('Failed to update tank progress:', error);
            return {
                success: false,
                message: error.message,
                data: error.data || {}
            };
        }
    }

    async assignToDepartment(tankId, departmentName) {
        try {
            console.log('User record:', this.record);
            
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
            if (!this.record) {
                throw new Error('User not authenticated');
            }
            if (this.record.role !== 'admin' && !(await this.isManagerOfDepartment(this.record.id, department.id))) {
                throw new Error('Only department managers or admins can assign tanks');
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
            const validStatuses = ['active', 'inactive'];
            if (!validStatuses.includes(status)) {
                throw {
                    status: 400,
                    message: "Invalid status. Must be one of: active, inactive",
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

    // Get tank by ID
    async get(id) {
        try {
            const record = await this.pb.collection('tanks').getOne(id);
            return {
                success: true,
                data: record
            };
        } catch (error) {
            throw {
                status: error.status || 404,
                message: error.message || 'Tank not found',
                data: error.data || {}
            };
        }
    }

    async updateStatusByTankId(tankId, status) {
        try {
            const tankResult = await this.getByTankId(tankId);
            if (!tankResult.success || !tankResult.data) {
                throw new Error('Tank not found');
            }

            const result = await this.pb.collection('tanks').update(tankResult.data.id, {
                status: status,
                last_signal_time: new Date().toISOString()
            });

            return {
                success: true,
                data: result
            };
        } catch (error) {
            console.error('Failed to update tank status:', error);
            return {
                success: false,
                message: error.message,
                data: error.data || {}
            };
        }
    }

    async unassignFromDepartment(tankId) {
        try {
            console.log('Unassigning tank:', tankId);
            
            // Get tank by tank_id
            const tank = await this.pb.collection('tanks').getFirstListItem(`tank_id = "${tankId}"`);
            if (!tank) {
                throw new Error('Tank not found');
            }

            // Check if user is admin or manager of the department
            if (!this.record) {
                throw new Error('User not authenticated');
            }
            if (this.record.role !== 'admin' && !(await this.isManagerOfDepartment(this.record.id, tank.department))) {
                throw new Error('Only department managers or admins can unassign tanks');
            }

            // Update tank to remove department
            const updatedTank = await this.pb.collection('tanks').update(tank.id, {
                department: ''
            });

            return {
                success: true,
                data: updatedTank
            };
        } catch (error) {
            console.error('Failed to unassign tank:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    async invalidateCache(tankId = null) {
        try {
            if (tankId) {
                await this.safeRedisDel(`tank:${tankId}:details`);
            }
            // Invalidate list cache
            try {
                const listKeys = await this.redis.keys('tanks:list:*');
                if (listKeys.length > 0) {
                    await this.safeRedisDel(listKeys);
                }
            } catch (error) {
                console.error('Failed to get list keys:', error);
            }
        } catch (error) {
            console.error('Failed to invalidate cache:', error);
        }
    }

    async safeRedisGet(key) {
        try {
            if (!this.redis.status === 'ready') {
                return null;
            }
            return await this.redis.get(key);
        } catch (error) {
            console.error('Redis get operation failed:', error);
            return null;
        }
    }

    async safeRedisSet(key, value, ttl) {
        try {
            if (!this.redis.status === 'ready') {
                return false;
            }
            await this.redis.setex(key, ttl, value);
            return true;
        } catch (error) {
            console.error('Redis set operation failed:', error);
            return false;
        }
    }

    async safeRedisDel(key) {
        try {
            if (!this.redis.status === 'ready') {
                return false;
            }
            await this.redis.del(key);
            return true;
        } catch (error) {
            console.error('Redis del operation failed:', error);
            return false;
        }
    }

    async getTank(id) {
        try {
            const tank = await this.pb.collection('tanks').getOne(id, {
                expand: 'department'
            });
            
            return {
                ...tank,
                department_name: tank.expand?.department?.name || null
            };
        } catch (error) {
            console.error('Failed to get tank:', error);
            throw error;
        }
    }

    async updateTank(id, data) {
        try {
            // Check if user has update permission
            if (!this.record?.role === 'admin') {
                const hasPermission = await this.checkTankPermission(this.record.id, id, 'update');
                if (!hasPermission) {
                    return {
                        success: false,
                        message: 'You do not have permission to update this tank'
                    };
                }
            }

            // Validate data
            const allowedFields = [
                'name',
                'tank_id',
                'department',
                'description',
                'capacity',
                'percentage',
                'status'
            ];

            // Filter out any fields that are not allowed
            const updateData = Object.keys(data)
                .filter(key => allowedFields.includes(key))
                .reduce((obj, key) => {
                    obj[key] = data[key];
                    return obj;
                }, {});

            // If department name is provided, get department ID
            if (updateData.department) {
                try {
                    const department = await this.pb.collection('departments').getFirstListItem(`name = "${updateData.department}"`);
                    updateData.department = department.id;
                } catch (error) {
                    return {
                        success: false,
                        message: `Department "${data.department}" not found`
                    };
                }
            }

            // Add updated timestamp
            updateData.updated = new Date().toISOString();

            // Update tank
            const tank = await this.pb.collection('tanks').update(id, updateData, {
                expand: 'department'
            });

            // Invalidate cache
            await this.invalidateCache(id);

            return {
                success: true,
                data: {
                    ...tank,
                    department_name: tank.expand?.department?.name || null
                }
            };
        } catch (error) {
            console.error('Failed to update tank:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    async assignTankToDepartment(tankId, departmentId) {
        try {
            // Get tank
            const tank = await this.pb.collection('tanks').getOne(tankId);
            if (!tank) {
                return {
                    success: false,
                    message: 'Tank not found'
                };
            }

            // Update tank with new department
            const updatedTank = await this.pb.collection('tanks').update(tankId, {
                department: departmentId,
                updated: new Date().toISOString()
            }, {
                expand: 'department'
            });

            // Invalidate cache
            await this.invalidateCache(tankId);

            return {
                success: true,
                data: {
                    ...updatedTank,
                    department_name: updatedTank.expand?.department?.name || null
                }
            };
        } catch (error) {
            console.error('Failed to assign tank to department:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    async unassignTankFromDepartment(tankId) {
        try {
            // Get tank
            const tank = await this.pb.collection('tanks').getOne(tankId);
            if (!tank) {
                return {
                    success: false,
                    message: 'Tank not found'
                };
            }

            // Remove department from tank
            const updatedTank = await this.pb.collection('tanks').update(tankId, {
                department: null,
                updated: new Date().toISOString()
            }, {
                expand: 'department'
            });

            // Invalidate cache
            await this.invalidateCache(tankId);

            return {
                success: true,
                data: {
                    ...updatedTank,
                    department_name: null
                }
            };
        } catch (error) {
            console.error('Failed to unassign tank from department:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    async assignTankByDepartmentName(tank_id, departmentName) {
        try {
            // Get tank by tank_id
            const tank = await this.pb.collection('tanks').getFirstListItem(`tank_id = "${tank_id}"`);
            if (!tank) {
                return {
                    success: false,
                    message: 'Tank not found'
                };
            }

            // Get department by name
            const department = await this.pb.collection('departments').getFirstListItem(`name = "${departmentName}"`);
            if (!department) {
                return {
                    success: false,
                    message: 'Department not found'
                };
            }

            // Check if tank is already in another department
            if (tank.department && tank.department !== department.id) {
                // Get current department name
                const currentDepartment = await this.pb.collection('departments').getOne(tank.department).catch(() => null);
                return {
                    success: false,
                    message: `Tank is already assigned to department: ${currentDepartment?.name || 'Unknown'}`
                };
            }

            // Update tank with new department
            const updatedTank = await this.pb.collection('tanks').update(tank.id, {
                department: department.id,
                updated: new Date().toISOString()
            }, {
                expand: 'department'
            });

            // Invalidate cache
            await this.invalidateCache(tank.id);

            return {
                success: true,
                data: {
                    ...updatedTank,
                    department_name: updatedTank.expand?.department?.name || null
                }
            };
        } catch (error) {
            console.error('Failed to assign tank to department:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    async checkTankPermission(userId, tankId, permission) {
        try {
            // Get tank details
            const tank = await this.pb.collection('tanks').getOne(tankId);
            if (!tank) {
                return false;
            }

            // If user is admin, they have all permissions
            if (this.record?.role === 'admin') {
                return true;
            }

            // Get user's department access
            const access = await this.pb.collection('department_user_access').getFirstListItem(
                `user = "${userId}" && department = "${tank.department}"`
            );

            // Check if user has the specific permission for this tank
            return access?.tank_permissions?.[tankId]?.[permission] || false;
        } catch (error) {
            console.error('Failed to check tank permission:', error);
            return false;
        }
    }

    async updateTankPermissions(userId, tankId, permissions) {
        try {
            // Get tank details
            const tank = await this.pb.collection('tanks').getOne(tankId);
            if (!tank) {
                return {
                    success: false,
                    message: 'Tank not found'
                };
            }

            // Get user's department access
            const access = await this.pb.collection('department_user_access').getFirstListItem(
                `user = "${userId}" && department = "${tank.department}"`
            );

            if (!access) {
                return {
                    success: false,
                    message: 'User does not have access to this department'
                };
            }

            // Update permissions
            const updatedPermissions = {
                ...access.tank_permissions,
                [tankId]: {
                    read: !!permissions.read,
                    write: !!permissions.write,
                    create: !!permissions.create,
                    update: !!permissions.update,
                    delete: !!permissions.delete
                }
            };

            // Save updated permissions
            await this.pb.collection('department_user_access').update(access.id, {
                tank_permissions: updatedPermissions
            });

            return {
                success: true,
                data: updatedPermissions[tankId]
            };
        } catch (error) {
            console.error('Failed to update tank permissions:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }
}

module.exports = TankService; 