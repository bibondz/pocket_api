const PocketBase = require('pocketbase/cjs');
const { PB_URL } = require('../../config');

class TankManageService {
    constructor() {
        this.pb = new PocketBase(PB_URL);
    }

    async init() {
        try {
            await this.pb.admins.authWithPassword(
                process.env.POCKETBASE_SUPER_ADMIN_EMAIL,
                process.env.POCKETBASE_SUPER_ADMIN_PASSWORD
            );
            console.log('Authenticated with PocketBase admin');
        } catch (error) {
            console.error('Failed to authenticate with PocketBase:', error);
            throw error;
        }
    }

    async listTanks(queryParams = {}) {
        try {
            const { filter, sort, expand } = queryParams;
            const page = parseInt(queryParams.page) || 1;
            const perPage = parseInt(queryParams.perPage) || 50;

            const options = {
                page,
                perPage
            };

            if (filter) options.filter = filter;
            if (sort) options.sort = sort;
            if (expand) options.expand = expand;

            const resultList = await this.pb.collection('tanks').getList(page, perPage, options);

            return {
                success: true,
                data: {
                    items: resultList.items,
                    page: resultList.page,
                    perPage: resultList.perPage,
                    totalItems: resultList.totalItems,
                    totalPages: resultList.totalPages
                }
            };
        } catch (error) {
            console.error('Error listing tanks:', error);
            throw {
                success: false,
                message: error.message || 'Failed to list tanks',
                error: error
            };
        }
    }

    async getTank(tankId) {
        try {
            const tank = await this.pb.collection('tanks').getOne(tankId);
            return {
                success: true,
                data: tank
            };
        } catch (error) {
            console.error('Error getting tank:', error);
            throw {
                success: false,
                message: error.message || 'Failed to get tank',
                error: error
            };
        }
    }

    async createTank(tankData) {
        try {
            console.log('Creating tank with data:', JSON.stringify(tankData, null, 2));
            const tank = await this.pb.collection('tanks').create(tankData);
            return {
                success: true,
                data: tank
            };
        } catch (error) {
            console.error('Error creating tank:', error);
            if (error.response && error.response.data) {
                console.error('Response data:', JSON.stringify(error.response.data, null, 2));
            }
            throw {
                success: false,
                message: error.message || 'Failed to create tank',
                error: error
            };
        }
    }

    async updateTank(tankId, tankData) {
        try {
            const tank = await this.pb.collection('tanks').update(tankId, tankData);
            return {
                success: true,
                data: tank
            };
        } catch (error) {
            console.error('Error updating tank:', error);
            throw {
                success: false,
                message: error.message || 'Failed to update tank',
                error: error
            };
        }
    }

    async deleteTank(tankId) {
        try {
            await this.pb.collection('tanks').delete(tankId);
            return {
                success: true,
                message: 'Tank deleted successfully'
            };
        } catch (error) {
            console.error('Error deleting tank:', error);
            throw {
                success: false,
                message: error.message || 'Failed to delete tank',
                error: error
            };
        }
    }
}

module.exports = TankManageService; 