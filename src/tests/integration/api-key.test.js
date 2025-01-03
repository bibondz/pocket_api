require('dotenv').config({ path: '.env.node' });

const PocketBase = require('pocketbase/cjs');
const { PB_URL } = require('../../../config');
const ApiKeyService = require('../../services/api-key.service');
const TankManagementService = require('../../services/tank-management.service');

describe('API Key Integration Tests', () => {
    let adminPb;
    let department;
    let manager;
    let operator;
    let tank1;
    let tank2;
    let managerService;
    let operatorService;
    let tankManagerService;

    beforeAll(async () => {
        try {
            // Setup admin PocketBase connection
            adminPb = new PocketBase(PB_URL);
            
            // Authenticate with test admin credentials
            await adminPb.collection('users').authWithPassword(
                process.env.TEST_EMAIL,
                process.env.TEST_PASSWORD
            );

            console.log('Admin auth successful:', {
                hasToken: !!adminPb.authStore.token,
                hasModel: !!adminPb.authStore.model
            });

        } catch (error) {
            console.error('Admin auth failed:', error);
            throw error;
        }

        // Create test data using admin PocketBase instance
        await setupTestData();

        // Create manager service with proper auth
        const managerPb = new PocketBase(PB_URL);
        const managerAuth = await managerPb.collection('users').authWithPassword(manager.email, 'TestPass123!');

        managerService = new ApiKeyService({
            token: managerPb.authStore.token,
            record: {
                ...managerPb.authStore.model,
                id: manager.id
            }
        });

        // Create operator service with proper auth
        const operatorPb = new PocketBase(PB_URL);
        const operatorAuth = await operatorPb.collection('users').authWithPassword(operator.email, 'TestPass123!');

        operatorService = new ApiKeyService({
            token: operatorPb.authStore.token,
            record: {
                ...operatorPb.authStore.model,
                id: operator.id
            }
        });
    });

    afterAll(async () => {
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

            // Create users
            manager = await adminPb.collection('users').create({
                email: 'test.manager.' + Date.now() + '@example.com',
                password: 'TestPass123!',
                passwordConfirm: 'TestPass123!',
                name: 'Test Manager',
                role: 'manager',
                emailVisibility: true
            });

            operator = await adminPb.collection('users').create({
                email: 'test.operator.' + Date.now() + '@example.com',
                password: 'TestPass123!',
                passwordConfirm: 'TestPass123!',
                name: 'Test Operator',
                role: 'operator',
                emailVisibility: true
            });

            // Create unassigned tanks directly via admin
            const timestamp = Date.now().toString(16).toUpperCase();
            tank1 = await adminPb.collection('tanks').create({
                name: 'Test Tank 1',
                tank_id: 'T-' + timestamp + '-001',
                status: 'active',
                capacity: 1000,
                percentage: 0,
                device_key: Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
            });

            tank2 = await adminPb.collection('tanks').create({
                name: 'Test Tank 2',
                tank_id: 'T-' + timestamp + '-002',
                status: 'active',
                capacity: 1000,
                percentage: 0,
                device_key: Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
            });

            // Assign tanks to department
            await adminPb.collection('tanks').update(tank1.id, {
                department: department.id
            });
            await adminPb.collection('tanks').update(tank2.id, {
                department: department.id
            });

            // Now create department_user_access records after tanks are assigned
            await adminPb.collection('department_user_access').create({
                department: department.id,
                user: manager.id,
                role: 'manager',
                tank_permissions: {
                    [tank1.id]: { read: true, write: true, manage: true },
                    [tank2.id]: { read: true, write: true, manage: true }
                }
            });

            await adminPb.collection('department_user_access').create({
                department: department.id,
                user: operator.id,
                role: 'operator',
                tank_permissions: {
                    [tank1.id]: { read: true },
                    [tank2.id]: { read: true, write: true }
                }
            });

            // Authenticate users
            const authManager = await adminPb.collection('users').authWithPassword(
                manager.email,
                'TestPass123!'
            );
            manager.token = authManager.token;

            const authOperator = await adminPb.collection('users').authWithPassword(
                operator.email,
                'TestPass123!'
            );
            operator.token = authOperator.token;

            // Create services
            tankManagerService = new TankManagementService({
                token: manager.token,
                record: {
                    ...manager,
                    id: manager.id
                }
            });

            managerService = new ApiKeyService({
                token: manager.token,
                record: {
                    ...manager,
                    id: manager.id
                }
            });

            operatorService = new ApiKeyService({
                token: operator.token,
                record: {
                    ...operator,
                    id: operator.id
                }
            });

        } catch (error) {
            console.error('Error setting up test data:', error);
            throw error;
        }
    }

    async function cleanupTestData() {
        try {
            // Delete API keys first
            if (manager?.id || operator?.id) {
                const apiKeys = await adminPb.collection('api_keys').getFullList({
                    filter: `created_by = "${manager?.id || ''}" || created_by = "${operator?.id || ''}"`,
                });
                for (const key of apiKeys) {
                    try {
                        await adminPb.collection('api_keys').delete(key.id);
                    } catch (error) {
                        // Ignore delete errors
                    }
                }
            }

            // Delete department_user_access records
            if (manager?.id) {
                try {
                    const managerAccess = await adminPb.collection('department_user_access').getFirstListItem(
                        `user = "${manager.id}"`
                    );
                    await adminPb.collection('department_user_access').delete(managerAccess.id);
                } catch (error) {
                    // Ignore if not found
                }
            }
            
            if (operator?.id) {
                try {
                    const operatorAccess = await adminPb.collection('department_user_access').getFirstListItem(
                        `user = "${operator.id}"`
                    );
                    await adminPb.collection('department_user_access').delete(operatorAccess.id);
                } catch (error) {
                    // Ignore if not found
                }
            }

            // Delete tanks
            if (tank1?.id) {
                try {
                    await adminPb.collection('tanks').delete(tank1.id);
                } catch (error) {
                    // Ignore if not found
                }
            }
            if (tank2?.id) {
                try {
                    await adminPb.collection('tanks').delete(tank2.id);
                } catch (error) {
                    // Ignore if not found
                }
            }

            // Delete users
            if (manager?.id) {
                try {
                    await adminPb.collection('users').delete(manager.id);
                } catch (error) {
                    // Ignore if not found
                }
            }
            if (operator?.id) {
                try {
                    await adminPb.collection('users').delete(operator.id);
                } catch (error) {
                    // Ignore if not found
                }
            }

            // Delete department last
            if (department?.id) {
                try {
                    await adminPb.collection('departments').delete(department.id);
                } catch (error) {
                    // Ignore if not found
                }
            }
        } catch (error) {
            console.error('Error cleaning up test data:', error);
        }
    }

    describe('API Key Management Scenarios', () => {
        // Set timeout for all tests in this block
        jest.setTimeout(15000);

        it('should allow manager to create API key', async () => {
            const keyData = {
                name: 'Test API Key',
                expires_at: new Date(Date.now() + 86400000).toISOString(), // 24 hours from now
                permissions: {
                    [tank1.id]: ['read', 'write'],
                    [tank2.id]: ['read']
                }
            };

            const apiKey = await managerService.createApiKey(keyData);
            expect(apiKey.key).toBeTruthy();
            expect(apiKey.key.length).toBe(64); // 32 bytes = 64 hex chars
            expect(apiKey.permissions).toEqual(keyData.permissions);
        });

        it('should prevent operator from creating API key with unauthorized tank', async () => {
            // Create a new tank that operator doesn't have access to
            const timestamp = Date.now().toString(16).toUpperCase();
            const unauthorizedTankData = {
                name: 'Unauthorized Tank',
                tank_id: 'T-' + timestamp + '-003',
                status: 'active',
                department: department.id,
                capacity: 1000,
                percentage: 0
            };
            const unauthorizedTank = await tankManagerService.createTank(unauthorizedTankData);

            // Create API key for unauthorized tank
            const keyData = {
                name: 'Test API Key',
                expires_at: new Date(Date.now() + 86400000).toISOString(),
                permissions: {
                    [unauthorizedTank.id]: ['read']
                }
            };

            await expect(
                operatorService.createApiKey(keyData)
            ).rejects.toThrow('Not authorized to manage tank');

            // Cleanup
            try {
                await tankManagerService.deleteTank(unauthorizedTank.id);
            } catch (error) {
                // Ignore cleanup errors
            }
        });

        it('should list API keys for user', async () => {
            // Create a key first
            const keyData = {
                name: 'Test API Key for List',
                expires_at: new Date(Date.now() + 86400000).toISOString(),
                permissions: {
                    [tank1.id]: ['read']
                }
            };
            await managerService.createApiKey(keyData);

            // List keys
            const keys = await managerService.listApiKeys();
            expect(keys.items.length).toBeGreaterThan(0);
            keys.items.forEach(key => {
                expect(key.created_by).toBe(manager.id);
                expect(key.key).toBeUndefined(); // Key should not be visible in list
            });
        });

        it('should allow revoking API key', async () => {
            // Create a key first
            const keyData = {
                name: 'Key to Revoke',
                expires_at: new Date(Date.now() + 86400000).toISOString(),
                permissions: {
                    [tank1.id]: ['read']
                }
            };
            const apiKey = await managerService.createApiKey(keyData);

            // Revoke it
            const revokedKey = await managerService.revokeApiKey(apiKey.id);
            expect(revokedKey.status).toBe('revoked');
        });

        it('should verify API key permissions correctly', async () => {
            // Create tank first
            const timestamp = Date.now().toString(16).toUpperCase();
            const tankData = {
                name: 'Test Tank 1',
                tank_id: 'T-' + timestamp + '-001',
                status: 'active',
                department: department.id,
                capacity: 1000,
                percentage: 0
            };
            const newTank = await tankManagerService.createTank(tankData);

            // Create API key with read permission
            const keyData = {
                name: 'Test API Key',
                expires_at: new Date(Date.now() + 86400000).toISOString(),
                permissions: {
                    [newTank.id]: ['read']
                }
            };

            const apiKey = await managerService.createApiKey(keyData);
            console.log('API Key created:', {
                id: apiKey.id,
                key: apiKey.key,
                status: apiKey.status
            });

            // Wait a bit for the key to be available
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Verify permissions directly using the service
            await expect(
                managerService.verifyApiKeyPermission(apiKey.key, newTank.id, 'read')
            ).resolves.toBe(true);

            await expect(
                managerService.verifyApiKeyPermission(apiKey.key, newTank.id, 'write')
            ).rejects.toThrow('Not authorized to write tank');

            // Cleanup
            try {
                await tankManagerService.deleteTank(newTank.id);
            } catch (error) {
                // Ignore cleanup errors
            }
        });

        it('should reject expired API key', async () => {
            // Create a key that's already expired
            const keyData = {
                name: 'Expired Key',
                expires_at: new Date(Date.now() - 1000).toISOString(), // 1 second ago
                permissions: {
                    [tank1.id]: ['read']
                }
            };
            const apiKey = await managerService.createApiKey(keyData);

            await expect(
                managerService.verifyApiKeyPermission(apiKey.key, tank1.id, 'read')
            ).rejects.toThrow('API key is expired');
        });

        it('should reject revoked API key', async () => {
            // Create and then revoke a key
            const keyData = {
                name: 'Key to Revoke',
                expires_at: new Date(Date.now() + 86400000).toISOString(),
                permissions: {
                    [tank1.id]: ['read']
                }
            };
            const apiKey = await managerService.createApiKey(keyData);
            await managerService.revokeApiKey(apiKey.id);

            await expect(
                managerService.verifyApiKeyPermission(apiKey.key, tank1.id, 'read')
            ).rejects.toThrow('API key is revoked');
        });

        it('should prevent operator from creating API key with write permission', async () => {
            const keyData = {
                name: 'Test API Key',
                expires_at: new Date(Date.now() + 86400000).toISOString(),
                permissions: {
                    [tank1.id]: ['write']
                }
            };

            await expect(
                operatorService.createApiKey(keyData)
            ).rejects.toThrow('Not authorized to write to tank');
        });

        it('should allow operator to create read-only API key', async () => {
            const keyData = {
                name: 'Test API Key',
                expires_at: new Date(Date.now() + 86400000).toISOString(),
                permissions: {
                    [tank1.id]: ['read']
                }
            };

            const apiKey = await operatorService.createApiKey(keyData);
            expect(apiKey.key).toBeTruthy();
            expect(apiKey.permissions).toEqual(keyData.permissions);
        });

        it('should prevent operator from creating API key with unauthorized permissions', async () => {
            const keyData = {
                name: 'Test API Key',
                expires_at: new Date(Date.now() + 86400000).toISOString(),
                permissions: {
                    [tank1.id]: ['read', 'write']
                }
            };

            await expect(
                operatorService.createApiKey(keyData)
            ).rejects.toThrow('Not authorized to write to tank');
        });

        it('should allow operator to create API key within their permissions', async () => {
            const keyData = {
                name: 'Test API Key',
                expires_at: new Date(Date.now() + 86400000).toISOString(),
                permissions: {
                    [tank2.id]: ['read', 'write']
                }
            };

            const apiKey = await operatorService.createApiKey(keyData);
            expect(apiKey.key).toBeTruthy();
            expect(apiKey.permissions).toEqual(keyData.permissions);
        });
    });
}); 