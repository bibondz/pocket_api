const BaseService = require('./base.service');

class TankAccessService extends BaseService {
    constructor(auth = {}) {
        super(auth);
    }

    // ดึงสิทธิ์การเข้าถึงถังของ user
    async getUserTankAccess(userId) {
        try {
            // ถ้าเป็น admin เข้าถึงได้ทั้งหมด
            if (this.isAdmin) {
                const tanks = await this.pb.collection('tanks').getFullList({
                    expand: 'department'
                });
                return {
                    success: true,
                    data: tanks.map(tank => ({
                        id: tank.id,
                        tankId: tank.tank_id,
                        name: tank.name,
                        department: tank.expand?.department?.name || 'Unknown',
                        accessType: 'manage'  // admin มีสิทธิ์สูงสุด
                    }))
                };
            }

            // ดึงถังในแผนกของ user
            const user = await this.pb.collection('users').getOne(userId, {
                expand: 'department'
            });

            let accessibleTanks = [];

            // ถังในแผนกตัวเอง
            if (user.department) {
                const departmentTanks = await this.pb.collection('tanks').getFullList({
                    filter: `department = "${user.department}"`,
                    expand: 'department'
                });
                accessibleTanks.push(...departmentTanks.map(tank => ({
                    id: tank.id,
                    tankId: tank.tank_id,
                    name: tank.name,
                    department: tank.expand?.department?.name || 'Unknown',
                    accessType: this.isManager ? 'manage' : 'view'  // manager ของแผนกจัดการได้
                })));
            }

            // ถังที่ได้รับสิทธิ์พิเศษ
            const specialAccess = await this.pb.collection('tank_user_access').getFullList({
                filter: `user = "${userId}"`,
                expand: 'tank,tank.department'
            });

            accessibleTanks.push(...specialAccess.map(access => ({
                id: access.tank,
                tankId: access.expand?.tank?.tank_id,
                name: access.expand?.tank?.name,
                department: access.expand?.tank?.expand?.department?.name || 'Unknown',
                accessType: access.access_type
            })));

            return {
                success: true,
                data: accessibleTanks
            };
        } catch (error) {
            console.error('Error getting tank access:', error);
            return { success: false, error: error.message };
        }
    }

    // เช็คสิทธิ์การเข้าถึงถัง
    async canAccessTank(userId, tankId, requiredAccess = 'view') {
        try {
            if (this.isAdmin) return true;

            const tank = await this.pb.collection('tanks').getOne(tankId, {
                expand: 'department'
            });

            const user = await this.pb.collection('users').getOne(userId, {
                expand: 'department'
            });

            // ถ้าอยู่ในแผนกเดียวกัน
            if (user.department === tank.department) {
                // manager มีสิทธิ์เต็ม
                if (this.isManager) return true;
                // operator ดูได้อย่างเดียว
                return requiredAccess === 'view';
            }

            // เช็คสิทธิ์พิเศษ
            const access = await this.pb.collection('tank_user_access').getFirstListItem(
                `user = "${userId}" && tank = "${tankId}"`
            ).catch(() => null);

            if (!access) return false;

            const accessLevels = ['view', 'edit', 'manage'];
            const requiredLevel = accessLevels.indexOf(requiredAccess);
            const userLevel = accessLevels.indexOf(access.access_type);

            return userLevel >= requiredLevel;
        } catch (error) {
            console.error('Error checking tank access:', error);
            return false;
        }
    }

    // เพิ่มสิทธิ์การเข้าถึงถัง
    async addTankAccess(userId, tankId, accessType = 'view') {
        try {
            // เช็คสิทธิ์ผู้ให้สิทธิ์
            if (!this.isAdmin) {
                const tank = await this.pb.collection('tanks').getOne(tankId);
                if (!this.isManager || this.department !== tank.department) {
                    throw new Error('Only admin or department manager can grant tank access');
                }
            }

            const data = {
                user: userId,
                tank: tankId,
                access_type: accessType,
                granted_by: this.record.id
            };

            const result = await this.pb.collection('tank_user_access').create(data);
            return { success: true, data: result };
        } catch (error) {
            console.error('Error adding tank access:', error);
            return { success: false, error: error.message };
        }
    }

    // ลบสิทธิ์การเข้าถึงถัง
    async removeTankAccess(accessId) {
        try {
            // เช็คสิทธิ์ผู้ลบ
            if (!this.isAdmin) {
                const access = await this.pb.collection('tank_user_access').getOne(accessId, {
                    expand: 'tank'
                });
                if (!this.isManager || this.department !== access.expand.tank.department) {
                    throw new Error('Only admin or department manager can revoke tank access');
                }
            }

            await this.pb.collection('tank_user_access').delete(accessId);
            return { success: true };
        } catch (error) {
            console.error('Error removing tank access:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = TankAccessService; 