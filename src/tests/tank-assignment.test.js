const TankAssignmentService = require('../services/tank-assignment.service');
const PocketBase = require('pocketbase/cjs');

// Mock PocketBase
jest.mock('pocketbase/cjs');

describe('TankAssignmentService', () => {
    let service;
    let mockPb;
    
    // Mock auth data
    const mockAuthData = {
        token: 'test_auth_token',
        record: {
            id: 'MANAGER001',
            role: 'manager'
        }
    };
    
    // Mock data
    const departmentId = 'DEPT001';
    const managerId = 'MANAGER001';
    const operatorId = 'OPERATOR001';
    const tankId = 'TANK001';

    beforeEach(() => {
        // Setup PocketBase mock
        mockPb = {
            authStore: {
                save: jest.fn(),
                isValid: true,
                model: mockAuthData.record
            },
            collection: jest.fn().mockReturnValue({
                getOne: jest.fn().mockResolvedValue({
                    id: tankId,
                    department: departmentId
                }),
                getList: jest.fn().mockResolvedValue({
                    items: [
                        { id: 'TANK001', name: 'Tank 1', department: departmentId, status: 'active' },
                        { id: 'TANK002', name: 'Tank 2', department: departmentId, status: 'active' }
                    ],
                    page: 1,
                    perPage: 50,
                    totalItems: 2,
                    totalPages: 1
                }),
                update: jest.fn().mockResolvedValue({}),
                getFirstListItem: jest.fn().mockImplementation(async (filter) => {
                    // Parse the filter to determine which role to return
                    if (filter.includes(`user="${managerId}"`)) {
                        return {
                            id: 'ACCESS001',
                            department: departmentId,
                            user: managerId,
                            role: 'manager',
                            tank_permissions: {}
                        };
                    } else if (filter.includes(`user="${operatorId}"`)) {
                        return {
                            id: 'ACCESS002',
                            department: departmentId,
                            user: operatorId,
                            role: 'operator',
                            tank_permissions: {
                                'TANK001': { read: true, write: true },
                                'TANK002': { read: true }
                            }
                        };
                    } else if (filter.includes('NONEXISTENT_OP')) {
                        throw { status: 404, message: 'Not found' };
                    }
                    return null;
                }),
                authRefresh: jest.fn().mockResolvedValue({})
            })
        };
        
        PocketBase.mockImplementation(() => mockPb);
        
        service = new TankAssignmentService(mockAuthData);
    });

    describe('Permission Management', () => {
        it('should assign tank with read-only permissions', async () => {
            mockPb.collection().getFirstListItem
                .mockResolvedValueOnce({  // First call for manager check
                    id: 'ACCESS001',
                    department: departmentId,
                    user: managerId,
                    role: 'manager'
                })
                .mockResolvedValueOnce({  // Second call for operator access
                    id: 'ACCESS002',
                    department: departmentId,
                    user: operatorId,
                    role: 'operator',
                    tank_permissions: {}
                });

            const permissions = {
                read: true,
                write: false,
                manage: false,
                create_token: false
            };

            const result = await service.assignTank(tankId, operatorId, departmentId, permissions);
            
            expect(result.success).toBe(true);
            expect(result.permissions).toEqual(permissions);
            
            // Verify PocketBase calls
            expect(mockPb.collection).toHaveBeenCalledWith('users');
            expect(mockPb.collection).toHaveBeenCalledWith('department_user_access');
        });

        it('should assign tank with full permissions', async () => {
            mockPb.collection().getFirstListItem
                .mockResolvedValueOnce({  // First call for manager check
                    id: 'ACCESS001',
                    department: departmentId,
                    user: managerId,
                    role: 'manager'
                })
                .mockResolvedValueOnce({  // Second call for operator access
                    id: 'ACCESS002',
                    department: departmentId,
                    user: operatorId,
                    role: 'operator',
                    tank_permissions: {}
                });

            const permissions = {
                read: true,
                write: true,
                manage: true,
                create_token: true
            };

            const result = await service.assignTank(tankId, operatorId, departmentId, permissions);
            
            expect(result.success).toBe(true);
            expect(result.permissions).toEqual(permissions);
            
            // Verify PocketBase calls
            expect(mockPb.collection).toHaveBeenCalledWith('users');
            expect(mockPb.collection).toHaveBeenCalledWith('department_user_access');
        });

        it('should reject invalid permissions', async () => {
            const permissions = {
                read: true,
                invalid_perm: true
            };

            await expect(
                service.assignTank(tankId, operatorId, departmentId, permissions)
            ).rejects.toThrow('Invalid permissions');
        });
    });

    describe('Access Control', () => {
        it('should allow manager to assign tanks', async () => {
            mockPb.collection().getFirstListItem
                .mockResolvedValueOnce({  // First call for manager check
                    id: 'ACCESS001',
                    department: departmentId,
                    user: managerId,
                    role: 'manager'
                })
                .mockResolvedValueOnce({  // Second call for operator access
                    id: 'ACCESS002',
                    department: departmentId,
                    user: operatorId,
                    role: 'operator',
                    tank_permissions: {
                        'TANK001': { read: true, write: true },
                        'TANK002': { read: true }
                    }
                });

            const result = await service.assignTank(tankId, operatorId, departmentId);
            expect(result.success).toBe(true);
        });

        it('should prevent non-manager from assigning tanks', async () => {
            mockPb.collection().getFirstListItem
                .mockResolvedValueOnce({  // First call for manager check
                    id: 'ACCESS003',
                    department: departmentId,
                    user: operatorId,
                    role: 'operator'
                })
                .mockResolvedValueOnce({  // Second call for operator access
                    id: 'ACCESS002',
                    department: departmentId,
                    user: operatorId,
                    role: 'operator',
                    tank_permissions: {
                        'TANK001': { read: true, write: true },
                        'TANK002': { read: true }
                    }
                });

            await expect(
                service.assignTank(tankId, operatorId, departmentId)
            ).rejects.toThrow('Only department managers can assign tanks');
        });

        it('should require operator to be in department', async () => {
            mockPb.collection().getFirstListItem
                .mockRejectedValueOnce(new Error('Operator does not have access to this department'));

            await expect(
                service.assignTank(tankId, 'NONEXISTENT_OP', departmentId)
            ).rejects.toThrow('Operator does not have access to this department');
        });
    });

    describe('Tank Operations', () => {
        it('should list operator tanks with permissions', async () => {
            mockPb.collection().getFirstListItem
                .mockResolvedValueOnce({
                    id: 'ACCESS002',
                    department: departmentId,
                    user: operatorId,
                    role: 'operator',
                    tank_permissions: {
                        'TANK001': { read: true, write: true },
                        'TANK002': { read: true }
                    }
                });

            mockPb.collection().getList
                .mockResolvedValueOnce({
                    items: [
                        { id: 'TANK001', name: 'Tank 1', department: departmentId, status: 'active' },
                        { id: 'TANK002', name: 'Tank 2', department: departmentId, status: 'active' }
                    ],
                    page: 1,
                    perPage: 50,
                    totalItems: 2,
                    totalPages: 1
                });

            const tanks = await service.listOperatorTanks(operatorId, departmentId);
            
            expect(tanks.items).toHaveLength(2);
            expect(tanks.items[0].permissions).toEqual({ read: true, write: true });
            expect(tanks.items[1].permissions).toEqual({ read: true });
        });

        it('should unassign tank and remove permissions', async () => {
            mockPb.collection().getFirstListItem
                .mockResolvedValueOnce({  // First call for manager check
                    id: 'ACCESS001',
                    department: departmentId,
                    user: managerId,
                    role: 'manager'
                })
                .mockResolvedValueOnce({  // Second call for operator access
                    id: 'ACCESS002',
                    department: departmentId,
                    user: operatorId,
                    role: 'operator',
                    tank_permissions: {
                        'TANK001': { read: true, write: true }
                    }
                });

            const result = await service.unassignTank(tankId, operatorId, departmentId);
            
            expect(result.success).toBe(true);
            
            // Verify PocketBase calls
            expect(mockPb.collection).toHaveBeenCalledWith('tanks');
            expect(mockPb.collection).toHaveBeenCalledWith('department_user_access');
        });
    });

    describe('Tank Listing', () => {
        it('should list operator tanks with pagination', async () => {
            mockPb.collection().getFirstListItem
                .mockResolvedValueOnce({
                    id: 'ACCESS002',
                    department: departmentId,
                    user: operatorId,
                    role: 'operator',
                    tank_permissions: {
                        'TANK001': { read: true, write: true },
                        'TANK002': { read: true }
                    }
                });

            mockPb.collection().getList
                .mockResolvedValueOnce({
                    items: [
                        { id: 'TANK001', name: 'Tank 1', department: departmentId, status: 'active' },
                        { id: 'TANK002', name: 'Tank 2', department: departmentId, status: 'active' }
                    ],
                    page: 1,
                    perPage: 2,
                    totalItems: 2,
                    totalPages: 1
                });

            const result = await service.listOperatorTanks(operatorId, departmentId, {
                page: 1,
                perPage: 2
            });

            expect(result.items).toHaveLength(2);
            expect(result.page).toBe(1);
            expect(result.perPage).toBe(2);
            expect(result.totalItems).toBe(2);
            expect(result.items[0].permissions).toEqual({ read: true, write: true });
            expect(result.items[1].permissions).toEqual({ read: true });
        });

        it('should handle empty tank permissions', async () => {
            mockPb.collection().getFirstListItem
                .mockResolvedValueOnce({
                    id: 'ACCESS002',
                    department: departmentId,
                    user: operatorId,
                    role: 'operator',
                    tank_permissions: {}
                });

            const result = await service.listOperatorTanks(operatorId, departmentId);

            expect(result.items).toHaveLength(0);
            expect(result.totalItems).toBe(0);
        });

        it('should handle additional filter options', async () => {
            mockPb.collection().getFirstListItem
                .mockResolvedValueOnce({
                    id: 'ACCESS002',
                    department: departmentId,
                    user: operatorId,
                    role: 'operator',
                    tank_permissions: {
                        'TANK001': { read: true }
                    }
                });

            mockPb.collection().getList
                .mockResolvedValueOnce({
                    items: [
                        { id: 'TANK001', name: 'Tank 1', department: departmentId, status: 'active' }
                    ],
                    page: 1,
                    perPage: 50,
                    totalItems: 1,
                    totalPages: 1
                });

            const result = await service.listOperatorTanks(operatorId, departmentId, {
                filter: 'status = "active"'
            });

            expect(result.items).toHaveLength(1);
            expect(result.items[0].tank.status).toBe('active');
        });

        it('should handle sorting options', async () => {
            mockPb.collection().getFirstListItem
                .mockResolvedValueOnce({
                    id: 'ACCESS002',
                    department: departmentId,
                    user: operatorId,
                    role: 'operator',
                    tank_permissions: {
                        'TANK001': { read: true },
                        'TANK002': { read: true }
                    }
                });

            mockPb.collection().getList
                .mockResolvedValueOnce({
                    items: [
                        { id: 'TANK001', name: 'Tank 1', department: departmentId, status: 'active' },
                        { id: 'TANK002', name: 'Tank 2', department: departmentId, status: 'active' }
                    ],
                    page: 1,
                    perPage: 50,
                    totalItems: 2,
                    totalPages: 1
                });

            const result = await service.listOperatorTanks(operatorId, departmentId, {
                sort: '+name'
            });

            expect(result.items).toHaveLength(2);
        });
    });
}); 