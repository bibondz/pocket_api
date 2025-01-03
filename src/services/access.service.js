const PocketBase = require('pocketbase/cjs');
const { PB_URL } = require('../config');

class AccessService {
    constructor({ token, record }) {
        this.pb = new PocketBase(PB_URL);
        if (token) this.pb.authStore.save(token);
        this.record = record;
    }

    async createTankGroup(departmentId, groupData) {
        try {
            const { name, permissions, tanks } = groupData;
            
            // Create new tank group
            const group = {
                name,
                permissions,
                tanks: tanks || []
            };

            // Update all user accesses in department
            const userAccesses = await this.pb.collection('tank_access_control')
                .getFullList({
                    filter: `department = "${departmentId}"`
                });

            for (const access of userAccesses) {
                const tankGroups = {
                    ...access.tank_groups,
                    special: {
                        ...access.tank_groups.special,
                        [name]: group
                    }
                };

                await this.pb.collection('tank_access_control')
                    .update(access.id, {
                        tank_groups: tankGroups
                    });
            }

            return { success: true, data: group };
        } catch (error) {
            console.error('Failed to create tank group:', error);
            return { success: false, message: error.message };
        }
    }

    async checkUserTankAccess(userId, tankId) {
        try {
            // Get tank info
            const tank = await this.pb.collection('tanks')
                .getFirstListItem(`tank_id = "${tankId}"`);
            
            // Get user access in department
            const access = await this.pb.collection('tank_access_control')
                .getFirstListItem(`user = "${userId}" && department = "${tank.department}"`);

            if (!access) return { success: false, message: 'No access' };

            // 1. Check exceptions
            if (access.tank_groups.exceptions[tankId]) {
                return {
                    success: true,
                    data: access.tank_groups.exceptions[tankId]
                };
            }

            // 2. Check special groups
            for (const group of Object.values(access.tank_groups.special)) {
                if (group.tanks.includes(tankId)) {
                    return {
                        success: true,
                        data: group.permissions
                    };
                }
            }

            // 3. Use default permissions
            return {
                success: true,
                data: access.tank_groups.all
            };
        } catch (error) {
            console.error('Failed to check tank access:', error);
            return { success: false, message: error.message };
        }
    }

    async bulkAssignTanksToGroup(departmentId, groupName, tankIds) {
        try {
            // Update all user accesses in department
            const userAccesses = await this.pb.collection('tank_access_control')
                .getFullList({
                    filter: `department = "${departmentId}"`
                });

            for (const access of userAccesses) {
                const group = access.tank_groups.special[groupName];
                if (group) {
                    group.tanks = [...new Set([...group.tanks, ...tankIds])];
                    
                    await this.pb.collection('tank_access_control')
                        .update(access.id, {
                            tank_groups: access.tank_groups
                        });
                }
            }

            return { success: true };
        } catch (error) {
            console.error('Failed to bulk assign tanks:', error);
            return { success: false, message: error.message };
        }
    }

    async setDefaultPermissions(departmentId, permissions) {
        try {
            const userAccesses = await this.pb.collection('tank_access_control')
                .getFullList({
                    filter: `department = "${departmentId}"`
                });

            for (const access of userAccesses) {
                const tankGroups = {
                    ...access.tank_groups,
                    all: permissions
                };

                await this.pb.collection('tank_access_control')
                    .update(access.id, {
                        tank_groups: tankGroups
                    });
            }

            return { success: true };
        } catch (error) {
            console.error('Failed to set default permissions:', error);
            return { success: false, message: error.message };
        }
    }

    async addTankException(departmentId, tankId, permissions) {
        try {
            const userAccesses = await this.pb.collection('tank_access_control')
                .getFullList({
                    filter: `department = "${departmentId}"`
                });

            for (const access of userAccesses) {
                const tankGroups = {
                    ...access.tank_groups,
                    exceptions: {
                        ...access.tank_groups.exceptions,
                        [tankId]: permissions
                    }
                };

                await this.pb.collection('tank_access_control')
                    .update(access.id, {
                        tank_groups: tankGroups
                    });
            }

            return { success: true };
        } catch (error) {
            console.error('Failed to add tank exception:', error);
            return { success: false, message: error.message };
        }
    }
}

module.exports = AccessService; 