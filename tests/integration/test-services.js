const { UserService } = require('../../src/services/user.service');
const { DepartmentService } = require('../../src/services/department.service');
const { TankService } = require('../../src/services/tank.service');
const { AuditService } = require('../../src/services/audit.service');
const { TankPermissionService } = require('../../src/services/tank-permission.service');

// Test data
const TEST_USER = {
    email: 'test@example.com',
    password: 'Test123!@#',
    name: 'Test User',
    role: 'operator'
};

const TEST_DEPARTMENT = {
    name: 'Test Department',
    description: 'Test department for service test',
    location: 'Test Location'
};

const TEST_TANK = {
    name: 'Test Tank',
    tank_id: 'TST-001',
    capacity: 1000,
    status: 'active',
    description: 'Test tank for service test'
};

// Store created records for cleanup
let state = {
    token: null,
    userId: null,
    departmentId: null,
    tankId: null
};

async function testServices() {
    try {
        console.log('\n=== Starting Service Tests ===\n');

        // 1. Test User Service
        console.log('Testing User Service...');
        const userService = new UserService();
        
        // Login
        const authData = await userService.login('admin@example.com', 'TestUser@2024');
        state.token = authData.token;
        console.log('✓ Login successful');

        // Create test user
        const user = await userService.create({
            ...TEST_USER,
            emailVisibility: true
        });
        state.userId = user.id;
        console.log('✓ User created');

        // 2. Test Department Service
        console.log('\nTesting Department Service...');
        const departmentService = new DepartmentService(state.token);
        
        // Create department
        const department = await departmentService.create(TEST_DEPARTMENT);
        state.departmentId = department.id;
        console.log('✓ Department created');

        // Add user to department
        await departmentService.addMember(department.id, user.id, 'operator');
        console.log('✓ User added to department');

        // 3. Test Tank Service
        console.log('\nTesting Tank Service...');
        const tankService = new TankService(state.token);
        
        // Create tank
        const tank = await tankService.create({
            ...TEST_TANK,
            department: department.id
        });
        state.tankId = tank.id;
        console.log('✓ Tank created');

        // Assign tank to operator
        await tankService.assignToOperator(tank.id, user.id, department.id);
        console.log('✓ Tank assigned to operator');

        // Update tank status
        await tankService.updateStatus(tank.id, 'maintenance');
        console.log('✓ Tank status updated');

        // 4. Test Tank Permission Service
        console.log('\nTesting Tank Permission Service...');
        const permissionService = new TankPermissionService(state.token);
        
        // Update permissions
        await permissionService.updatePermission(department.id, tank.id, user.id, {
            can_view: true,
            can_edit: true
        });
        console.log('✓ Tank permissions updated');

        // List permissions
        const permissions = await permissionService.listPermissions(department.id, tank.id);
        console.log('✓ Tank permissions listed');

        // 5. Test Audit Service
        console.log('\nTesting Audit Service...');
        const auditService = new AuditService(state.token);
        
        // List audit logs
        const logs = await auditService.list({
            filter: `collection="tanks" && record_id="${tank.id}"`,
            sort: '-timestamp'
        });
        console.log('✓ Audit logs retrieved');

        console.log('\n=== All Tests Passed ===\n');

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    } finally {
        // Cleanup
        if (state.token) {
            try {
                const services = {
                    tank: new TankService(state.token),
                    department: new DepartmentService(state.token),
                    user: new UserService(state.token)
                };

                if (state.tankId) {
                    await services.tank.delete(state.tankId);
                }
                if (state.departmentId) {
                    await services.department.delete(state.departmentId);
                }
                if (state.userId) {
                    await services.user.delete(state.userId);
                }
                console.log('✓ Cleanup completed');
            } catch (error) {
                console.error('Cleanup failed:', error.message);
            }
        }
    }
}

// Run tests
testServices(); 