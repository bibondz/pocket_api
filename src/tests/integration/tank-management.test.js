require('dotenv').config({ path: '.env.node' });
const PocketBase = require('pocketbase/cjs');
const { PB_URL } = require('../../../config');
const TankManagementService = require('../../services/tank-management.service');

describe('Tank Management Integration Tests', () => {
    let adminPb;
    let managerService;
    let operatorService;

    // Test data references
    let department;
    let manager;
    let operator;
    let tank1;
    let tank2;
    let tank3;

    beforeAll(async () => {
        // Setup admin PocketBase connection
        adminPb = new PocketBase(PB_URL);
        console.log('Attempting admin auth with:', {
            email: process.env.POCKETBASE_SUPER_ADMIN_EMAIL,
            password: process.env.POCKETBASE_SUPER_ADMIN_PASSWORD ? '***' : undefined
        });
        const adminAuth = await adminPb.admins.authWithPassword(
            process.env.POCKETBASE_SUPER_ADMIN_EMAIL,
            process.env.POCKETBASE_SUPER_ADMIN_PASSWORD
        );
        console.log('Admin auth result:', {
            hasToken: !!adminPb.authStore.token,
            hasModel: !!adminPb.authStore.model
        });

        // Create test data using admin PocketBase instance
        await setupTestData();

        // Create manager service with proper auth
        const managerPb = new PocketBase(PB_URL);
        const managerAuth = await managerPb.collection('users').authWithPassword(manager.email, 'TestPass123!');

        managerService = new TankManagementService({
            token: managerPb.authStore.token,
            record: managerPb.authStore.model
        });

        // Create operator service with proper auth
        const operatorPb = new PocketBase(PB_URL);
        const operatorAuth = await operatorPb.collection('users').authWithPassword(operator.email, 'TestPass123!');

        operatorService = new TankManagementService({
            token: operatorPb.authStore.token,
            record: operatorPb.authStore.model
        });
    });

    afterAll(async () => {
        // Cleanup test data
        await cleanupTestData();
    });

    async function setupTestData() {
        try {
            // Create department
            department = await adminPb.collection('departments').create({
                name: 'Test Department ' + Date.now(),
                description: 'Test Department for Integration Tests',
                location: 'Test Location'
            });

            // Create users with verified status
            manager = await adminPb.collection('users').create({
                email: 'test.manager.' + Date.now() + '@example.com',
                password: 'TestPass123!',
                passwordConfirm: 'TestPass123!',
                name: 'Test Manager',
                role: 'manager',
                emailVisibility: true,
                verified: true
            });

            operator = await adminPb.collection('users').create({
                email: 'test.operator.' + Date.now() + '@example.com',
                password: 'TestPass123!',
                passwordConfirm: 'TestPass123!',
                name: 'Test Operator',
                role: 'operator',
                emailVisibility: true,
                verified: true
            });

            // Create department_user_access records
            await adminPb.collection('department_user_access').create({
                department: department.id,
                user: manager.id,
                role: 'manager',
                tank_permissions: null
            });

            await adminPb.collection('department_user_access').create({
                department: department.id,
                user: operator.id,
                role: 'operator',
                tank_permissions: null
            });

            // Create test tanks
            tank1 = await adminPb.collection('tanks').create({
                name: 'Test Tank 1',
                tank_id: `TANK${Date.now().toString().slice(-6)}001`,
                status: 'active',
                department: department.id,
                description: 'Test Tank 1',
                percentage: 0,
                device_key: Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
            });

            tank2 = await adminPb.collection('tanks').create({
                name: 'Test Tank 2',
                tank_id: `TANK${Date.now().toString().slice(-6)}002`,
                status: 'active',
                department: department.id,
                description: 'Test Tank 2',
                percentage: 0,
                device_key: Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
            });

            tank3 = await adminPb.collection('tanks').create({
                name: 'Test Tank 3',
                tank_id: `TANK${Date.now().toString().slice(-6)}003`,
                status: 'active',
                department: department.id,
                description: 'Test Tank 3',
                percentage: 0,
                device_key: Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
            });

            // Update department_user_access with tank permissions
            const managerAccess = await adminPb.collection('department_user_access').getFirstListItem(
                `user="${manager.id}" && department="${department.id}"`
            );
            await adminPb.collection('department_user_access').update(managerAccess.id, {
                tank_permissions: {
                    [tank1.id]: {
                        read: true,
                        write: true,
                        manage: true,
                        create_token: true
                    },
                    [tank2.id]: {
                        read: true,
                        write: true,
                        manage: true,
                        create_token: true
                    }
                }
            });

            const operatorAccess = await adminPb.collection('department_user_access').getFirstListItem(
                `user="${operator.id}" && department="${department.id}"`
            );
            await adminPb.collection('department_user_access').update(operatorAccess.id, {
                tank_permissions: {
                    [tank1.id]: {
                        read: true,
                        write: true
                    },
                    [tank2.id]: {
                        read: true
                    }
                }
            });
        } catch (error) {
            console.error('Error setting up test data:', error);
            throw error;
        }
    }

    async function cleanupTestData() {
        try {
            // Delete test data in reverse order of creation
            if (tank1) await adminPb.collection('tanks').delete(tank1.id);
            if (tank2) await adminPb.collection('tanks').delete(tank2.id);

            // Delete department_user_access records
            const filter = `department="${department.id}"`;
            const accessRecords = await adminPb.collection('department_user_access').getFullList({ filter });
            for (const record of accessRecords) {
                await adminPb.collection('department_user_access').delete(record.id);
            }

            // Delete users
            if (operator) await adminPb.collection('users').delete(operator.id);
            if (manager) await adminPb.collection('users').delete(manager.id);

            // Delete department
            if (department) await adminPb.collection('departments').delete(department.id);
        } catch (error) {
            console.error('Error cleaning up test data:', error);
        }
    }

    describe('Tank Management Scenarios', () => {
        it('should allow manager to create tank', async () => {
            const timestamp = Date.now().toString(16).toUpperCase();
            const tankData = {
                name: 'New Test Tank',
                tank_id: 'T-' + timestamp + '-002',
                status: 'active',
                department: department.id,
                description: 'New Test Tank Description',
                capacity: 1000
            };

            tank2 = await managerService.createTank(tankData);
            expect(tank2.name).toBe(tankData.name);
            expect(tank2.tank_id).toBe(tankData.tank_id);
            expect(tank2.department).toBe(department.id);
        });

        it('should prevent operator from creating tank', async () => {
            const timestamp = Date.now().toString(16).toUpperCase();
            const tankData = {
                name: 'Invalid Tank',
                tank_id: 'T-' + timestamp + '-003',
                department: department.id
            };

            await expect(
                operatorService.createTank(tankData)
            ).rejects.toThrow('Only department managers can create tanks');
        });

        it('should allow manager to update tank', async () => {
            const updateData = {
                name: 'Updated Tank Name',
                status: 'maintenance',
                description: 'Updated Description',
                capacity: 2000
            };

            const updatedTank = await managerService.updateTank(tank2.id, updateData);
            expect(updatedTank.name).toBe(updateData.name);
            expect(updatedTank.status).toBe(updateData.status);
        });

        it('should list department tanks with pagination and sorting', async () => {
            const tanks = await managerService.listDepartmentTanks(department.id, {
                perPage: 2,
                page: 1,
                sort: '+name'
            });

            expect(tanks.items.length).toBeGreaterThan(0);
            expect(tanks.page).toBe(1);
            expect(tanks.totalItems).toBeGreaterThan(0);
        });

        it('should get single tank details', async () => {
            const tank = await managerService.getTank(tank1.id);
            expect(tank.id).toBe(tank1.id);
            expect(tank.department).toBe(department.id);
        });

        it('should prevent deleting tank with assigned operators', async () => {
            // First assign an operator
            const tank = await adminPb.collection('tanks').update(tank1.id, {
                managed_by: [operator.id]
            });

            await expect(
                managerService.deleteTank(tank1.id)
            ).rejects.toThrow('Cannot delete tank with assigned operators');
        });

        it('should validate percentage range on create', async () => {
            const timestamp = Date.now().toString(16).toUpperCase();
            const tankData = {
                name: 'Invalid Tank',
                tank_id: 'T-' + timestamp + '-003',
                department: department.id,
                percentage: 150 // Invalid percentage
            };

            await expect(
                managerService.createTank(tankData)
            ).rejects.toThrow('Percentage must be between 0 and 100');
        });

        it('should update tank percentage', async () => {
            const newPercentage = 75;
            const updatedTank = await managerService.updateTankPercentage(tank2.id, newPercentage);
            
            expect(updatedTank.percentage).toBe(newPercentage);
            expect(updatedTank.last_signal_time).toBeTruthy();
        });

        it('should list tanks with percentage filter', async () => {
            const tanks = await managerService.listDepartmentTanks(department.id, {
                filter: 'percentage >= 50',
                sort: '-percentage'
            });

            tanks.items.forEach(tank => {
                expect(tank.percentage).toBeGreaterThanOrEqual(50);
            });
        });

        it('should create tank with device key', async () => {
            const timestamp = Date.now().toString(16).toUpperCase();
            const tankData = {
                name: 'Device Tank',
                tank_id: 'T-' + timestamp + '-004',
                department: department.id,
                percentage: 50
            };

            const newTank = await managerService.createTank(tankData);
            expect(newTank.device_key).toBeTruthy();
            expect(newTank.device_key.length).toBe(32);

            // Device key should not be visible in normal tank fetch
            const fetchedTank = await managerService.getTank(newTank.id);
            expect(fetchedTank.device_key).toBeUndefined();
        });

        it('should update percentage from device', async () => {
            const timestamp = Date.now().toString(16).toUpperCase();
            const tankData = {
                name: 'Device Tank 2',
                tank_id: 'T-' + timestamp + '-005',
                department: department.id,
                percentage: 0
            };

            // Create tank and get device key
            const newTank = await managerService.createTank(tankData);
            const deviceKey = newTank.device_key;

            // Update percentage using device key
            const updatedTank = await managerService.updateTankPercentageFromDevice(
                newTank.id,
                75,
                deviceKey
            );

            expect(updatedTank.percentage).toBe(75);
            expect(updatedTank.last_signal_time).toBeTruthy();
        });

        it('should reject update with invalid device key', async () => {
            await expect(
                managerService.updateTankPercentageFromDevice(
                    tank1.id,
                    50,
                    'invalid-key'
                )
            ).rejects.toThrow('Invalid device key');
        });
    });
}); 