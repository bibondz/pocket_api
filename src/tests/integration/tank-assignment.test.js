require('dotenv').config({ path: '.env.node' });
const PocketBase = require('pocketbase/cjs');
const { PB_URL } = require('../../../config');
const TankAssignmentService = require('../../services/tank-assignment.service');

describe('Tank Assignment Integration Tests', () => {
    let adminPb;
    let managerService;
    let operatorService;

    // Test data references
    let department;
    let manager;
    let operator1;
    let operator2;
    let tank1;
    let tank2;
    let tank3;

    beforeAll(async () => {
        // Setup admin PocketBase connection
        adminPb = new PocketBase(PB_URL);
        const adminAuth = await adminPb.admins.authWithPassword(
            process.env.POCKETBASE_SUPER_ADMIN_EMAIL,
            process.env.POCKETBASE_SUPER_ADMIN_PASSWORD
        );
        console.log('Admin auth successful:', {
            hasToken: !!adminPb.authStore.token,
            hasModel: !!adminPb.authStore.model
        });

        // Create test data using admin PocketBase instance
        await setupTestData();

        // Create manager service with proper auth
        const managerPb = new PocketBase(PB_URL);
        const managerAuth = await managerPb.collection('users').authWithPassword(manager.email, 'TestPass123!');
        console.log('Manager auth successful:', {
            hasToken: !!managerPb.authStore.token,
            hasModel: !!managerPb.authStore.model,
            modelId: managerPb.authStore.model?.id,
            role: managerPb.authStore.model?.role
        });

        managerService = new TankAssignmentService({
            token: managerPb.authStore.token,
            record: managerPb.authStore.model
        });

        // Create operator service with proper auth
        const operatorPb = new PocketBase(PB_URL);
        const operatorAuth = await operatorPb.collection('users').authWithPassword(operator2.email, 'TestPass123!');
        console.log('Operator auth successful:', {
            hasToken: !!operatorPb.authStore.token,
            hasModel: !!operatorPb.authStore.model,
            modelId: operatorPb.authStore.model?.id,
            role: operatorPb.authStore.model?.role
        });

        operatorService = new TankAssignmentService({
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
                location: 'Test Location',
                status: 'active'
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

            operator1 = await adminPb.collection('users').create({
                email: 'test.operator1.' + Date.now() + '@example.com',
                password: 'TestPass123!',
                passwordConfirm: 'TestPass123!',
                name: 'Test Operator 1',
                role: 'operator',
                emailVisibility: true,
                verified: true
            });

            operator2 = await adminPb.collection('users').create({
                email: 'test.operator2.' + Date.now() + '@example.com',
                password: 'TestPass123!',
                passwordConfirm: 'TestPass123!',
                name: 'Test Operator 2',
                role: 'operator',
                emailVisibility: true,
                verified: true
            });

            console.log('Created test users:', {
                managerId: manager.id,
                operator1Id: operator1.id,
                operator2Id: operator2.id
            });

            // Create department access records
            await adminPb.collection('department_user_access').create({
                department: department.id,
                user: manager.id,
                role: 'manager',
                tank_permissions: {}
            });

            await adminPb.collection('department_user_access').create({
                department: department.id,
                user: operator1.id,
                role: 'operator',
                tank_permissions: {}
            });

            await adminPb.collection('department_user_access').create({
                department: department.id,
                user: operator2.id,
                role: 'operator',
                tank_permissions: {}
            });

            // Create test tanks
            const timestamp = Date.now().toString(16).toUpperCase();
            tank1 = await adminPb.collection('tanks').create({
                name: 'Test Tank 1',
                tank_id: 'T-' + timestamp + '-001',
                status: 'active',
                department: department.id,
                description: 'Test Tank 1',
                device_key: Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
            });

            tank2 = await adminPb.collection('tanks').create({
                name: 'Test Tank 2',
                tank_id: 'T-' + timestamp + '-002',
                status: 'active',
                department: department.id,
                description: 'Test Tank 2',
                device_key: Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
            });

            tank3 = await adminPb.collection('tanks').create({
                name: 'Test Tank 3',
                tank_id: 'T-' + timestamp + '-003',
                status: 'active',
                department: department.id,
                description: 'Test Tank 3',
                device_key: Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
            });

            console.log('Created test tanks:', {
                tank1Id: tank1.id,
                tank2Id: tank2.id,
                tank3Id: tank3.id
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
            if (tank3) await adminPb.collection('tanks').delete(tank3.id);

            // Delete department_user_access records first
            const filter = `department="${department.id}"`;
            const accessRecords = await adminPb.collection('department_user_access').getFullList({ filter });
            for (const record of accessRecords) {
                await adminPb.collection('department_user_access').delete(record.id);
            }

            // Delete users
            if (operator1) await adminPb.collection('users').delete(operator1.id);
            if (operator2) await adminPb.collection('users').delete(operator2.id);
            if (manager) await adminPb.collection('users').delete(manager.id);

            // Delete department
            if (department) await adminPb.collection('departments').delete(department.id);
        } catch (error) {
            console.error('Error cleaning up test data:', error);
        }
    }

    describe('Tank Assignment Scenarios', () => {
        it('should assign tanks with different permissions to operators', async () => {
            // Assign tank1 to operator1 with read-only permissions
            await managerService.assignTank(tank1.id, operator1.id, department.id, { read: true });

            // Wait for changes to propagate
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Verify assignment
            const operatorTanks = await operatorService.listOperatorTanks(operator1.id, department.id);
            expect(operatorTanks.items).toHaveLength(1);
            expect(operatorTanks.items[0].permissions.read).toBe(true);
            expect(operatorTanks.items[0].permissions.write).toBeFalsy();
        });

        it('should unassign tank from operator', async () => {
            // First assign the tank
            await managerService.assignTank(tank2.id, operator1.id, department.id, { read: true });

            // Wait for changes to propagate
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Then unassign it
            await managerService.unassignTank(tank2.id, operator1.id, department.id);

            // Wait for changes to propagate
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Verify unassignment
            const operatorTanks = await operatorService.listOperatorTanks(operator1.id, department.id);
            expect(operatorTanks.items.find(t => t.tank.id === tank2.id)).toBeUndefined();
        });

        it('should prevent non-manager from assigning tanks', async () => {
            await expect(
                operatorService.assignTank(tank3.id, operator2.id, department.id)
            ).rejects.toThrow('Only department managers can assign tanks');
        });

        it('should support pagination and sorting', async () => {
            // Assign multiple tanks first
            await managerService.assignTank(tank1.id, operator1.id, department.id, { read: true });
            await managerService.assignTank(tank2.id, operator1.id, department.id, { read: true });
            await managerService.assignTank(tank3.id, operator1.id, department.id, { read: true });

            // Wait for changes to propagate
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Get first page
            const page1 = await operatorService.listOperatorTanks(operator1.id, department.id, {
                page: 1,
                perPage: 2,
                sort: '+name'
            });

            expect(page1.items).toHaveLength(2);
            expect(page1.totalItems).toBe(3);
            expect(page1.totalPages).toBe(2);
            expect(page1.page).toBe(1);

            // Get second page
            const page2 = await operatorService.listOperatorTanks(operator1.id, department.id, {
                page: 2,
                perPage: 2,
                sort: '+name'
            });

            expect(page2.items).toHaveLength(1);
            expect(page2.totalItems).toBe(3);
            expect(page2.totalPages).toBe(2);
            expect(page2.page).toBe(2);
        });

        it('should support filtering and field selection', async () => {
            // Assign tanks with different statuses
            await managerService.assignTank(tank1.id, operator1.id, department.id, { read: true });
            await managerService.assignTank(tank2.id, operator1.id, department.id, { read: true });

            // Wait for changes to propagate
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Filter by status
            const filtered = await operatorService.listOperatorTanks(operator1.id, department.id, {
                filter: 'status = "active"',
                fields: 'id,name,status'
            });

            expect(filtered.items.length).toBeGreaterThan(0);
            filtered.items.forEach(item => {
                expect(item.tank.status).toBe('active');
                // Check field selection
                expect(item.tank.id).toBeDefined();
                expect(item.tank.name).toBeDefined();
                expect(item.tank.status).toBeDefined();
                expect(item.tank.description).toBeUndefined();
            });
        });
    });
}); 