const BaseService = require('./base.service');

class TankManagementService extends BaseService {
    constructor({ token, record }) {
        super({ token, record });
    }

    async listTanks(options = {}) {
        try {
            const { page = 1, perPage = 50, sort = '-created', filter, fields } = options;

            const tanks = await this.pb.collection('tanks').getList(page, perPage, {
                sort,
                filter,
                fields
            });

            return {
                items: tanks.items,
                page: tanks.page,
                perPage: tanks.perPage,
                totalItems: tanks.totalItems,
                totalPages: tanks.totalPages
            };
        } catch (error) {
            console.error('Failed to list tanks:', error);
            throw error;
        }
    }

    async getTank(id) {
        try {
            return await this.pb.collection('tanks').getOne(id);
        } catch (error) {
            console.error('Failed to get tank:', error);
            throw error;
        }
    }

    async updateTank(id, data) {
        try {
            return await this.pb.collection('tanks').update(id, data);
        } catch (error) {
            console.error('Failed to update tank:', error);
            throw error;
        }
    }

    async deleteTank(id) {
        try {
            await this.pb.collection('tanks').delete(id);
            return { success: true };
        } catch (error) {
            console.error('Failed to delete tank:', error);
            throw error;
        }
    }

    async getStatistics() {
        try {
            const tanks = await this.pb.collection('tanks').getFullList();
            
            const stats = {
                total: tanks.length,
                byStatus: {
                    active: 0,
                    inactive: 0,
                    maintenance: 0
                },
                byDepartment: {}
            };

            for (const tank of tanks) {
                // Count by status
                stats.byStatus[tank.status] = (stats.byStatus[tank.status] || 0) + 1;

                // Count by department
                if (tank.department) {
                    stats.byDepartment[tank.department] = (stats.byDepartment[tank.department] || 0) + 1;
                }
            }

            return stats;
        } catch (error) {
            console.error('Failed to get statistics:', error);
            throw error;
        }
    }

    async importTanks(data) {
        try {
            const results = [];
            for (const tank of data) {
                const result = await this.pb.collection('tanks').create(tank);
                results.push(result);
            }
            return { success: true, data: results };
        } catch (error) {
            console.error('Failed to import tanks:', error);
            throw error;
        }
    }
}

module.exports = TankManagementService; 