const AdminService = require('../src/services/admin.service');
const DepartmentService = require('../src/services/department.service');
const DepartmentManagerService = require('../src/services/department-manager.service');
const TankService = require('../src/services/tank.service');
const TankAssignmentService = require('../src/services/tank-assignment.service');

// Add delay helper function
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function testServices() {
    let state = {
        departments: [],
        users: [],
        tanks: [],
        accessRecords: []
    };
    let authToken = null;

    try {
        // 1. Login using AdminService
        console.log('\n🔑 Authenticating through AdminService...');
        const adminService = new AdminService();
        const authData = await adminService.login('admin@example.com', 'TestUser@2024');
        authToken = authData.token;
        console.log('✅ Authentication successful');
        await delay(1000);

        // 2. Create department using DepartmentService
        console.log('\n🏢 Creating test department...');
        const timestamp = new Date().getTime();
        const departmentService = new DepartmentService(authToken);
        const department = await departmentService.createDepartment({ 
            name: `Test Department ${timestamp}`,
            description: 'Test department for service test',
            location: 'Test Location'
        });
        state.departments.push(department.id);
        console.log('✅ Created test department');
        await delay(1000);

        // 3. Create test users using AdminService
        console.log('\n👥 Creating test users...');
        const users = [];
        const roles = ['manager', 'operator', 'operator'];
        for (let i = 0; i < roles.length; i++) {
            const userData = {
                email: `test${i+1}_${timestamp}@example.com`,
                username: `test${i+1}_${timestamp}`,
                password: 'Test123!@#',
                name: `Test User ${i+1}`,
                role: roles[i]
            };
            const user = await adminService.createUser(userData);
            users.push({...user, role: roles[i]});
            state.users.push(user.id);

            // Add user to department using DepartmentManagerService
            const departmentManager = new DepartmentManagerService(authToken, department.id);
            const accessResponse = await departmentManager.addMembers({
                userIds: [user.id],
                role: roles[i]
            });
            state.accessRecords.push(accessResponse.id);
        }
        console.log('✅ Created test users and assigned to department');
        await delay(1000);

        // 4. Create test tanks using TankService
        console.log('\n🛢️ Creating test tanks...');
        const tankService = new TankService(authToken);
        const tanks = [];
        for (let i = 1; i <= 3; i++) {
            const tank = await tankService.createTank({
                name: `Test Tank ${i}`,
                tank_id: `TST-${timestamp}-${i}`,
                capacity: 1000 * i,
                status: 'active',
                last_signal: new Date().toISOString(),
                description: `Test tank ${i} for service test`
            });
            tanks.push(tank);
            state.tanks.push(tank.id);
        }
        console.log('✅ Created test tanks');
        await delay(1000);

        // 5. Assign tanks to department using DepartmentService
        console.log('\n🏢 Assigning tanks to department...');
        for (const tank of tanks) {
            await departmentService.addTankToDepartment(department.id, tank.id);
            await delay(1000);
        }
        console.log('✅ Assigned tanks to department');
        await delay(1000);

        // 6. Test manager operations
        console.log('\n🔄 Testing manager operations...');
        const manager = users.find(u => u.role === 'manager');
        const operators = users.filter(u => u.role === 'operator');

        // Login as manager using AdminService
        const managerAuth = await adminService.login(manager.email, 'Test123!@#');
        const managerToken = managerAuth.token;
        console.log('✅ Logged in as manager');

        // Get department tanks using DepartmentService
        const managerDeptService = new DepartmentService(managerToken);
        const departmentTanks = await managerDeptService.listDepartmentTanks(department.id);
        console.log(`Found ${departmentTanks.length} tanks in department`);

        // Assign tanks to operators using TankAssignmentService
        const tankAssignmentService = new TankAssignmentService(managerToken);
        for (let i = 0; i < operators.length; i++) {
            const operator = operators[i];
            const tank = tanks[i];
            
            await tankAssignmentService.assignTankToOperator(tank.id, operator.id, department.id);
            console.log(`✅ Assigned tank ${tank.tank_id} to operator ${operator.email}`);
        }

        // 7. Test operator operations
        console.log('\n🔍 Testing operator operations...');
        for (const operator of operators) {
            // Login as operator using AdminService
            const operatorAuth = await adminService.login(operator.email, 'Test123!@#');
            const operatorToken = operatorAuth.token;
            console.log(`✅ Logged in as operator ${operator.email}`);

            // Get assigned tanks using TankService
            const operatorTankService = new TankService(operatorToken);
            const assignedTanks = await operatorTankService.getAssignedTanks(operator.id);
            console.log(`Found ${assignedTanks.length} assigned tanks`);

            // Test tank status update permissions
            const assignedTank = tanks.find(t => assignedTanks.some(at => at.id === t.id));
            const unassignedTank = tanks.find(t => !assignedTanks.some(at => at.id === t.id));

            try {
                // Should succeed for assigned tank
                await operatorTankService.updateTankStatus(assignedTank.id, 'maintenance');
                console.log(`✅ Operator can update assigned tank ${assignedTank.tank_id}`);
            } catch (error) {
                console.error(`❌ Operator cannot update assigned tank ${assignedTank.tank_id}`);
            }

            try {
                // Should fail for unassigned tank
                await operatorTankService.updateTankStatus(unassignedTank.id, 'maintenance');
                console.error(`❌ Operator can update unassigned tank ${unassignedTank.tank_id}`);
            } catch (error) {
                console.log(`✅ Operator cannot update unassigned tank ${unassignedTank.tank_id}`);
            }
        }

        console.log('\n✨ All service tests completed successfully');

    } catch (error) {
        console.error('\n❌ Test failed:', error.response?.data || error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    } finally {
        // Cleanup using services
        if (authToken) {
            await cleanupTestData(authToken, state);
        }
    }
}

async function cleanupTestData(authToken, state) {
    console.log('\n🧹 Cleaning up test data...');
    try {
        const tankAssignmentService = new TankAssignmentService(authToken);
        const tankService = new TankService(authToken);
        const departmentService = new DepartmentService(authToken);
        const departmentManager = new DepartmentManagerService(authToken, state.departments[0]);

        // Delete tank assignments
        console.log('Deleting tank assignments...');
        for (const id of state.tanks) {
            try {
                const assignments = await tankAssignmentService.listTankAssignments(state.departments[0]);
                for (const assignment of assignments) {
                    if (assignment.tank === id) {
                        await tankAssignmentService.deleteTankAssignment(assignment.id);
                    }
                }
            } catch (error) {
                console.log(`Could not delete tank assignments for tank ${id}:`, error.response?.data?.message || error.message);
            }
        }

        // Delete tanks
        console.log('Deleting tanks...');
        for (const id of state.tanks) {
            try {
                await tankService.deleteTank(id);
            } catch (error) {
                console.log(`Could not delete tank ${id}:`, error.response?.data?.message || error.message);
            }
        }

        // Delete department members
        console.log('Deleting department members...');
        const members = await departmentManager.listMembers();
        for (const member of members.items || []) {
            if (state.users.includes(member.user)) {
                try {
                    await departmentManager.removeMember(member.user);
                } catch (error) {
                    console.log(`Could not delete member ${member.user}:`, error.response?.data?.message || error.message);
                }
            }
        }

        // Delete users
        console.log('Deleting users...');
        const adminService = new AdminService(authToken);
        for (const id of state.users) {
            try {
                await adminService.deleteUser(id);
            } catch (error) {
                console.log(`Could not delete user ${id}:`, error.response?.data?.message || error.message);
            }
        }

        // Delete departments
        console.log('Deleting departments...');
        for (const id of state.departments) {
            try {
                await departmentService.deleteDepartment(id);
            } catch (error) {
                console.log(`Could not delete department ${id}:`, error.response?.data?.message || error.message);
            }
        }

        console.log('✅ Cleanup completed');
    } catch (error) {
        console.error('❌ Cleanup failed:', error.response?.data || error.message);
    }
}

// Run the tests
testServices().catch(console.error); 